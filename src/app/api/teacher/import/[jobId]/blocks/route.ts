import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { blockText, draftOrder } from '@/lib/import/pipeline';
import type { Block } from '@/lib/import/types';
import { parsePagesDone, requireOwnedJob } from '@/lib/import-jobs';
import { logger } from '@/lib/logger';

/** Kelgan JSON haqiqatan Block shaklidami. */
function isBlock(value: unknown): value is Block {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Record<string, unknown>;
  if (!Number.isInteger(b.index)) return false;
  if (b.number !== null && !Number.isInteger(b.number)) return false;
  if (!Array.isArray(b.rows)) return false;
  if (typeof b.bbox !== 'object' || b.bbox === null) return false;
  return true;
}

// POST /api/teacher/import/[jobId]/blocks — bitta sahifaning bloklarini yozadi.
//
// Blok `ImportDraft` qatoriga tushadi: alohida `ImportBlock` modeli yo'q va
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
    const page = Number(body?.page);
    if (!Number.isInteger(page) || page < 1 || page > job.pageCount) {
      return NextResponse.json({ error: 'page notogri' }, { status: 400 });
    }

    const rawBlocks = body?.blocks;
    if (!Array.isArray(rawBlocks) || !rawBlocks.every(isBlock)) {
      return NextResponse.json({ error: 'blocks notogri' }, { status: 400 });
    }
    const blocks = rawBlocks as Block[];

    // `upsert` — `@@unique([jobId, order])` bo'yicha. `order` sahifa
    // raqamidan hisoblanadi (pipeline.ts#draftOrder), shuning uchun bu
    // marshrut necha marta chaqirilsa ham bir xil qatorlarni yangilaydi.
    for (const block of blocks) {
      const order = draftOrder(page, block.index);
      const text = blockText(block);
      // Prisma'ning Json kirish turi indeks imzosini talab qiladi, bizning
      // interfeyslarimizda esa u yo'q — shakl to'g'ri, faqat tur tor.
      const raw = { stage: 'BLOCK', block } as unknown as Prisma.InputJsonValue;
      const common = {
        raw,
        textOriginal: text,
        text,
        options: [],
        optionsOriginal: [],
        correctAnswer: '',
        sourcePage: page,
        sourceBbox: block.bbox as unknown as Prisma.InputJsonValue,
      };
      await db.importDraft.upsert({
        where: { jobId_order: { jobId: job.id, order } },
        create: { jobId: job.id, order, ...common },
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
    // faqat blok matni, hali strukturalanmagan. Tugaganlik
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
