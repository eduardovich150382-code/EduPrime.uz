import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { applyChatItem, parseChatJson } from '@/lib/import/chat-apply';
import { sourceTextOf, tokenMapOf } from '@/lib/import/chat-export';
import { requireOwnedJob } from '@/lib/import-jobs';
import { logger } from '@/lib/logger';

/** Bitta so'rovdagi savollar chegarasi — bema'ni katta JSON bazani band qilmasin. */
const MAX_ITEMS = 500;

/**
 * Qo'llash mumkin bo'lgan bosqichlar.
 *
 * `READY` ATAYLAB ro'yxatda: ayni JSON ikkinchi marta yuklansa ham savol
 * `UNKNOWN_ORDER` bermasin va o'sha natijani qaytadan yozsin. Chatdan qaytgan
 * javobni ustoz ikki marta tashlashi — kutilgan holat, zarar emas.
 */
const APPLICABLE = ['BLOCK', 'STRUCTURE_FAILED', 'TRANSLATE_FAILED', 'READY'];

/** Avtomatik yo'l qoldirgan yiqilish kodlari — muvaffaqiyatli qo'llashdan keyin o'rinsiz. */
const STALE_ISSUES = ['STRUCTURE_FAILED', 'TRANSLATE_FAILED', 'RATE_LIMITED'];

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

/** `raw.answerKey.letter` — kitobdan naqsh bilan topilgan javob. */
function parseAnswerKey(raw: Record<string, unknown>): string | null {
  const letter = asRecord(raw.answerKey).letter;
  return typeof letter === 'string' && /^[A-H]$/.test(letter) ? letter : null;
}

// POST /api/teacher/import/[jobId]/apply — chatdan qaytgan JSON ni draftlarga
// yozadi va ularni yakuniy `READY` bosqichiga o'tkazadi.
//
// TEKSHIRUV HAR SAVOL UCHUN ALOHIDA: bittasi yiqilsa qolgani baribir yoziladi.
// Ustoz 50 ta savolni chatga tashlab, bittasi tufayli hammasini qaytadan
// qilishi — mantiqsiz.
//
// IDEMPOTENT: ayni JSON ikki marta yuklansa bir xil natija yoziladi.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const { job, error } = await requireOwnedJob(jobId);
    if (error) return error;

    const { items, problems } = parseChatJson(await request.json().catch(() => null));
    if (items.length > MAX_ITEMS) {
      return NextResponse.json({ error: 'Juda ko\'p savol', code: 'TOO_MANY_ITEMS' }, { status: 400 });
    }

    const drafts = await db.importDraft.findMany({
      where: { jobId: job.id, order: { in: items.map((i) => i.order) } },
      select: {
        id: true,
        order: true,
        textOriginal: true,
        // `text` — `tokenMapOf` uchun: eksport ham aynan `textOriginal || text` dan
        // boshlaydi va ikkalasi bir xil raqamlashni berishi SHART.
        text: true,
        optionsOriginal: true,
        raw: true,
        issues: true,
      },
    });
    const byOrder = new Map(drafts.map((d) => [d.order, d]));

    const writes: Prisma.PrismaPromise<unknown>[] = [];
    const seen = new Set<number>();
    let applied = 0;
    let skipped = 0;

    const skip = (order: number, code: string) => {
      skipped++;
      problems.push({ order, code });
    };

    for (const item of items) {
      const draft = byOrder.get(item.order);
      const raw = draft ? asRecord(draft.raw) : {};
      if (!draft) {
        skip(item.order, 'UNKNOWN_ORDER');
        continue;
      }
      // Bosqichi mos kelmagan draft — XATO EMAS: avtomatik yo'l uni allaqachon
      // tayyorlagan va chat javobi uning ustidan yozib yuborishi mumkin emas.
      // Bu `UNKNOWN_ORDER` dan alohida kod: ustoz "noma'lum savol" ni qidirib
      // vaqt yo'qotmasin, bu esa shunchaki ikki yo'lning kesishuvi.
      if (!APPLICABLE.includes(String(raw.stage))) {
        skip(item.order, 'ALREADY_PROCESSED');
        continue;
      }
      // Bitta `order` ikki marta kelsa ikkinchi yozuv birinchisini jimgina
      // yo'qotardi — tranzaksiyada ikkala `update` ham bir qatorga tegadi.
      if (seen.has(item.order)) {
        skip(item.order, 'ORDER_DUPLICATE');
        continue;
      }
      seen.add(item.order);

      const result = applyChatItem(
        {
          sourceText: sourceTextOf(draft.textOriginal, draft.optionsOriginal),
          tokenMap: tokenMapOf(draft),
          answerKey: parseAnswerKey(raw),
          sourceNumber: typeof raw.number === 'number' ? raw.number : null,
          sourceMode: typeof raw.mode === 'string' ? raw.mode : null,
        },
        item,
      );

      if (!result.ok) {
        skip(item.order, result.code);
        continue;
      }

      applied++;
      for (const code of result.flags) problems.push({ order: item.order, code });

      const previous = Array.isArray(draft.issues) ? draft.issues.filter((i) => typeof i === 'string') : [];
      const issues = [...new Set([...previous, ...result.flags])].filter(
        (code) => !STALE_ISSUES.includes(code),
      );

      writes.push(
        db.importDraft.update({
          where: { id: draft.id },
          data: {
            // `textOriginal`/`optionsOriginal` ga TEGILMAYDI — ular manba
            // tilidagi yagona nusxa va token xaritasi HAR SAFAR aynan shulardan
            // qayta hisoblanadi, ya'ni qayta qo'llash ham bir xil ishlaydi.
            text: result.text,
            options: result.options as unknown as Prisma.InputJsonValue,
            correctAnswer: result.correctAnswer,
            issues: issues as unknown as Prisma.InputJsonValue,
            raw: { ...raw, stage: 'READY' } as unknown as Prisma.InputJsonValue,
          },
        }),
      );
    }

    if (writes.length > 0) await db.$transaction(writes);

    // Navbatda hech narsa qolmasa job ko'rib chiqishga tayyor. Avtomatik
    // yo'ldagi (`translate/route.ts`) bilan bir xil qoida.
    //
    // Ikkita sanoq, bitta `NOT` emas: Json yo'li bo'yicha inkor SQL'da uch
    // qiymatli mantiqqa tushadi (`raw->>'stage'` NULL bo'lsa `NOT (... = ...)`
    // ham NULL) va qator jimgina hisobdan chiqib ketardi.
    const total = await db.importDraft.count({ where: { jobId: job.id } });
    const ready = await db.importDraft.count({
      where: { jobId: job.id, raw: { path: ['stage'], equals: 'READY' } },
    });
    const pending = total - ready;
    if (pending === 0 && total > 0) {
      await db.importJob.update({ where: { id: job.id }, data: { status: 'REVIEW' } });
    }

    logger.info('Chat javobi qo\'llandi', { jobId: job.id, applied, skipped, pending });

    return NextResponse.json({ applied, skipped, problems });
  } catch (error) {
    logger.error('POST /api/teacher/import/[jobId]/apply error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
