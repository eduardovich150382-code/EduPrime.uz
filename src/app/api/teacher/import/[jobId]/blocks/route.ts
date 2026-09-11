import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { MAX_SOURCE_PAGE } from '@/lib/import/constants';
import type { UploadGroup } from '@/lib/import/manifest';
import type { BBox } from '@/lib/import/types';
import { parsePagesDone, requireOwnedJob } from '@/lib/import-jobs';
import { logger } from '@/lib/logger';

function isBBox(value: unknown): value is BBox {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Record<string, unknown>;
  return [b.x, b.y, b.w, b.h].every((v) => typeof v === 'number' && Number.isFinite(v));
}

/** Kelgan JSON haqiqatan UploadGroup shaklidami (lib/import/manifest.ts). */
function isUploadGroup(value: unknown): value is UploadGroup {
  if (typeof value !== 'object' || value === null) return false;
  const g = value as Record<string, unknown>;
  if (!Number.isInteger(g.order) || (g.order as number) < 0) return false;
  if (!Number.isInteger(g.number)) return false;
  if (typeof g.text !== 'string') return false;
  if (!isBBox(g.bbox)) return false;
  if (!Array.isArray(g.images)) return false;
  return g.images.every(
    (img: unknown) =>
      typeof img === 'object' &&
      img !== null &&
      typeof (img as Record<string, unknown>).assetId === 'string' &&
      isBBox((img as Record<string, unknown>).bbox),
  );
}

// POST /api/teacher/import/[jobId]/blocks — bitta sahifaning savol
// guruhlarini yozadi (PyMuPDF manifesti, lib/import/manifest.ts).
//
// Guruh `ImportDraft` qatoriga tushadi: alohida `ImportBlock` modeli yo'q va
// kerak ham emas — `raw` maydoni aynan shu bosqichma-bosqich to'ldirish uchun
// qo'yilgan. `raw.stage` "bu draft strukturalanganmi?" degan savolga javob
// beradi; `ImportJob.status` ga tayanib bo'lmaydi, chunki u butun job uchun,
// draft darajasida emas.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const { job, error } = await requireOwnedJob(jobId);
    if (error) return error;

    const body = await request.json();
    // `page` — ASL PDF sahifa raqami (skript 23–24-betni kesib olsa
    // pageCount 2, page esa 23), shuning uchun `pageCount` bilan
    // cheklanmaydi. Tugaganlik `pagesDone.length >= pageCount` dan bilinadi.
    const page = Number(body?.page);
    if (!Number.isInteger(page) || page < 1 || page > MAX_SOURCE_PAGE) {
      return NextResponse.json({ error: 'page notogri' }, { status: 400 });
    }

    const rawGroups = body?.groups;
    if (!Array.isArray(rawGroups) || !rawGroups.every(isUploadGroup)) {
      return NextResponse.json({ error: 'groups notogri' }, { status: 400 });
    }
    const groups = rawGroups as UploadGroup[];

    const pageImageAssetId: unknown = body?.pageImageAssetId ?? null;
    if (pageImageAssetId !== null && typeof pageImageAssetId !== 'string') {
      return NextResponse.json({ error: 'pageImageAssetId notogri' }, { status: 400 });
    }

    // Asset havolalari BAZADAN tekshiriladi va `url` shu yerdan olinadi,
    // klient yuborganidan emas: aks holda draftga begona job'ning rasmi yoki
    // ixtiyoriy tashqi URL yozib qo'yish mumkin bo'lardi.
    const assetIds = [
      ...new Set([
        ...groups.flatMap((g) => g.images.map((img) => img.assetId)),
        ...(pageImageAssetId ? [pageImageAssetId] : []),
      ]),
    ];
    const assets = assetIds.length
      ? await db.importAsset.findMany({
          where: { jobId: job.id, id: { in: assetIds } },
          select: { id: true, url: true },
        })
      : [];
    const urlById = new Map(assets.map((a) => [a.id, a.url]));
    if (urlById.size !== assetIds.length) {
      return NextResponse.json({ error: 'asset topilmadi' }, { status: 400 });
    }
    const pageImage = pageImageAssetId
      ? { assetId: pageImageAssetId, url: urlById.get(pageImageAssetId) }
      : null;

    // `upsert` — `@@unique([jobId, order])` bo'yicha. `order` manifestdan
    // deterministik hisoblanadi (manifest.ts#planManifest), shuning uchun bu
    // marshrut necha marta chaqirilsa ham bir xil qatorlarni yangilaydi.
    for (const group of groups) {
      const images = group.images.map((img) => ({
        assetId: img.assetId,
        url: urlById.get(img.assetId),
        bbox: img.bbox,
      }));
      // Prisma'ning Json kirish turi indeks imzosini talab qiladi, bizning
      // interfeyslarimizda esa u yo'q — shakl to'g'ri, faqat tur tor.
      const raw = {
        stage: 'BLOCK',
        page,
        number: group.number,
        bbox: group.bbox,
        images,
        pageImage,
      } as unknown as Prisma.InputJsonValue;
      const common = {
        raw,
        textOriginal: group.text,
        text: group.text,
        options: [],
        optionsOriginal: [],
        correctAnswer: '',
        sourcePage: page,
        sourceBbox: group.bbox as unknown as Prisma.InputJsonValue,
      };
      await db.importDraft.upsert({
        where: { jobId_order: { jobId: job.id, order: group.order } },
        create: { jobId: job.id, order: group.order, ...common },
        update: common,
      });
    }

    // `pagesDone` BITTA atomik SQL bilan yangilanadi. O'qib-keyin-yozish
    // ataylab ishlatilmaydi: Read Committed izolyatsiyasida ikki so'rov
    // ikkalasi ham eski massivni o'qib, biri ikkinchisini bosib ketishi
    // mumkin (lost update — quota.ts#bumpDailyUsage izohidagi bilan aynan
    // bir xil xavf). CASE takroriy qo'shilishning oldini oladi.
    await db.$executeRaw`
      UPDATE "ImportJob"
      SET "pagesDone" = CASE
            WHEN "pagesDone" @> to_jsonb(${page}::int) THEN "pagesDone"
            ELSE "pagesDone" || to_jsonb(${page}::int)
          END
      WHERE id = ${job.id}
    `;

    // `blockCount` OSHIRILMAYDI, qayta hisoblanadi: `increment` bo'lsa
    // qayta urinish (upsert dublikat yaratmagan bo'lsa ham) hisoblagichni
    // shishirar edi va idempotentlik yarim qolardi.
    const blockCount = await db.importDraft.count({ where: { jobId: job.id } });

    // Status PARSING da QOLADI, oxirgi sahifada ham REVIEW ga o'tmaydi:
    // REVIEW — ustoz draftlarni ko'rib chiqayotgan holat, hozir esa draftlar
    // faqat savol matni, hali strukturalanmagan. Tugaganlik
    // `pagesDone.length === pageCount` dan bilinadi; STRUCTURING ga o'tkazish
    // keyingi bosqichning ishi.
    const updated = await db.importJob.update({
      where: { id: job.id },
      data: { blockCount, status: 'PARSING' },
      select: { pagesDone: true, blockCount: true, status: true },
    });

    const pagesDone = parsePagesDone(updated.pagesDone);
    return NextResponse.json({
      pagesDone,
      blockCount: updated.blockCount,
      status: updated.status,
      complete: pagesDone.length >= job.pageCount,
    });
  } catch (error) {
    logger.error('POST /api/teacher/import/[jobId]/blocks error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
