import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { MAX_IMPORT_PAGES, MAX_SOURCE_PAGE } from '@/lib/import/constants';
import type { UploadGroup } from '@/lib/import/grouping';
import type { BBox } from '@/lib/import/types';
import { parsePagesDone, requireOwnedJob } from '@/lib/import-jobs';
import { logger } from '@/lib/logger';

/**
 * Bitta so'rovdagi savollar chegarasi. Innova to'plamida sahifada ~10 savol;
 * 50 — zich test varag'i uchun ham yetarli zaxira, lekin bema'ni katta
 * so'rov bazani yuzlab ming upsert bilan band qilolmaydi.
 */
const MAX_GROUPS = MAX_IMPORT_PAGES * 50;

function isBBox(value: unknown): value is BBox {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Record<string, unknown>;
  return [b.x, b.y, b.w, b.h].every((v) => typeof v === 'number' && Number.isFinite(v));
}

function isPage(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= MAX_SOURCE_PAGE;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Kelgan JSON haqiqatan UploadGroup shaklidami (lib/import/grouping.ts). */
function isUploadGroup(value: unknown): value is UploadGroup {
  if (!isRecord(value)) return false;
  const g = value;
  if (!Number.isInteger(g.order) || (g.order as number) < 0) return false;
  if (g.number !== null && !Number.isInteger(g.number)) return false;
  if (typeof g.text !== 'string') return false;
  if (!isPage(g.startPage) || !isPage(g.endPage)) return false;
  if ((g.startPage as number) > (g.endPage as number)) return false;
  if (!Array.isArray(g.regions) || g.regions.length === 0) return false;
  if (!g.regions.every((r: unknown) => isRecord(r) && isPage(r.page) && isBBox(r.bbox))) return false;
  if (!Array.isArray(g.images)) return false;
  return g.images.every(
    (img: unknown) => isRecord(img) && typeof img.assetId === 'string' && isPage(img.page) && isBBox(img.bbox),
  );
}

interface PageImageRef {
  page: number;
  assetId: string;
}

function isPageImageRef(value: unknown): value is PageImageRef {
  return isRecord(value) && isPage(value.page) && typeof value.assetId === 'string';
}

// POST /api/teacher/import/[jobId]/blocks — BUTUN hujjatning savollarini
// yozadi (lib/import/grouping.ts). Barcha sahifalar `/pages/[page]/done`
// bilan belgilangach bir marta chaqiriladi: savol sahifa chegarasidan o'tadi,
// shuning uchun uni sahifama-sahifa yozib bo'lmaydi.
//
// Savol `ImportDraft` qatoriga tushadi: alohida `ImportBlock` modeli yo'q va
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

    const rawGroups = body?.groups;
    if (!Array.isArray(rawGroups) || rawGroups.length > MAX_GROUPS || !rawGroups.every(isUploadGroup)) {
      return NextResponse.json({ error: 'groups notogri' }, { status: 400 });
    }
    const groups = rawGroups as UploadGroup[];
    // Takroriy `order` bitta qatorni ikki marta yangilab, bir savolni jimgina
    // yo'qotardi.
    if (new Set(groups.map((g) => g.order)).size !== groups.length) {
      return NextResponse.json({ error: 'order takrorlangan' }, { status: 400 });
    }

    const rawPageImages: unknown = body?.pageImages ?? [];
    if (!Array.isArray(rawPageImages) || !rawPageImages.every(isPageImageRef)) {
      return NextResponse.json({ error: 'pageImages notogri' }, { status: 400 });
    }
    const pageImages = rawPageImages as PageImageRef[];

    // Rasmlar `/pages/[page]/done` dan OLDIN yuklanadi — sahifalar tugamagan
    // bo'lsa savol hali serverda yo'q rasmga havola qilishi mumkin.
    if (parsePagesDone(job.pagesDone).length < job.pageCount) {
      return NextResponse.json({ error: 'Sahifalar hali tugamagan', code: 'PAGES_PENDING' }, { status: 409 });
    }

    // Asset havolalari BAZADAN tekshiriladi va `url` shu yerdan olinadi,
    // klient yuborganidan emas: aks holda draftga begona job'ning rasmi yoki
    // ixtiyoriy tashqi URL yozib qo'yish mumkin bo'lardi.
    const assetIds = [
      ...new Set([
        ...groups.flatMap((g) => g.images.map((img) => img.assetId)),
        ...pageImages.map((p) => p.assetId),
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

    // `upsert` — `@@unique([jobId, order])` bo'yicha. `order` manifestdan
    // deterministik hisoblanadi (grouping.ts#groupIntoQuestions), shuning
    // uchun bu marshrut necha marta chaqirilsa ham bir xil qatorlarni
    // yangilaydi. Tranzaksiya — yarim yozilgan hujjat qolmasin.
    const upserts = groups.map((group) => {
      const pages = new Set(group.regions.map((r) => r.page));
      const images = group.images.map((img) => ({
        assetId: img.assetId,
        url: urlById.get(img.assetId),
        page: img.page,
        bbox: img.bbox,
      }));
      const groupPageImages = pageImages
        .filter((p) => pages.has(p.page))
        .map((p) => ({ page: p.page, assetId: p.assetId, url: urlById.get(p.assetId) }));
      const startRegion = group.regions.find((r) => r.page === group.startPage) ?? group.regions[0];
      // Prisma'ning Json kirish turi indeks imzosini talab qiladi, bizning
      // interfeyslarimizda esa u yo'q — shakl to'g'ri, faqat tur tor.
      const raw = {
        stage: 'BLOCK',
        number: group.number,
        startPage: group.startPage,
        endPage: group.endPage,
        spansPages: group.startPage !== group.endPage,
        regions: group.regions,
        images,
        pageImages: groupPageImages,
      } as unknown as Prisma.InputJsonValue;
      const common = {
        raw,
        textOriginal: group.text,
        text: group.text,
        options: [],
        optionsOriginal: [],
        correctAnswer: '',
        sourcePage: group.startPage,
        sourceBbox: startRegion.bbox as unknown as Prisma.InputJsonValue,
      };
      return db.importDraft.upsert({
        where: { jobId_order: { jobId: job.id, order: group.order } },
        create: { jobId: job.id, order: group.order, ...common },
        update: common,
      });
    });
    await db.$transaction(upserts);

    // `blockCount` OSHIRILMAYDI, qayta hisoblanadi: `increment` bo'lsa
    // qayta urinish (upsert dublikat yaratmagan bo'lsa ham) hisoblagichni
    // shishirar edi va idempotentlik yarim qolardi.
    const blockCount = await db.importDraft.count({ where: { jobId: job.id } });

    // Status PARSING da QOLADI, REVIEW ga o'tmaydi: REVIEW — ustoz
    // draftlarni ko'rib chiqayotgan holat, hozir esa draftlar faqat savol
    // matni, hali strukturalanmagan. STRUCTURING ga o'tkazish keyingi
    // bosqichning ishi.
    const updated = await db.importJob.update({
      where: { id: job.id },
      data: { blockCount, status: 'PARSING' },
      select: { blockCount: true, status: true },
    });

    return NextResponse.json({ blockCount: updated.blockCount, status: updated.status });
  } catch (error) {
    logger.error('POST /api/teacher/import/[jobId]/blocks error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
