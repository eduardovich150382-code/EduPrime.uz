import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { KeyIssue, ResolvedAnswer } from '@/lib/import/answer-key';
import { structureBatch, type StructureInput, type StructuredQuestion } from '@/lib/import/structure';
import { createGeminiCaller, STRUCTURE_MODEL } from '@/lib/import/structure-model';
import type { BBox } from '@/lib/import/types';
import { requireOwnedJob } from '@/lib/import-jobs';
import { logger } from '@/lib/logger';

/**
 * Bitta so'rovda strukturalanadigan blok soni.
 *
 * Vercel funksiyasining vaqt chegarasi bor, bitta Gemini chaqiruvi esa
 * sekundlar oladi. 20 blok — 6 talik uchta paket; qolgani `hasMore: true`
 * bilan klientga qaytariladi va u marshrutni qayta chaqiradi.
 */
const BATCH = 20;

/**
 * Bitta blok uchun qayta urinishlar chegarasi.
 *
 * Yiqilgan blok `BLOCK` bosqichida qoladi va keyingi chaqiruvda qayta
 * uriniladi. Chegara bo'lmasa doimiy yiqiladigan blok klient siklini cheksiz
 * aylantirardi: har so'rov o'sha blokni qaytadan tanlab, `hasMore` hech qachon
 * `false` bo'lmasdi.
 */
const MAX_ATTEMPTS = 3;

/** Strukturalanmagan draftlar — `raw.stage` hali `BLOCK`. */
const PENDING: Prisma.ImportDraftWhereInput = { raw: { path: ['stage'], equals: 'BLOCK' } };

interface RawBlock {
  images?: { assetId: string; url: string }[];
  pageImages?: { page: number; url: string }[];
  regions?: { page: number; bbox: BBox }[];
  number?: number | null;
  answerKey?: ResolvedAnswer | null;
  notQuestion?: boolean;
  attempts?: number;
}

function parseRaw(value: unknown): RawBlock {
  return typeof value === 'object' && value !== null ? (value as RawBlock) : {};
}

/** Blok bosqichida qo'yilgan kalit kodlari — natijada ham saqlanadi. */
function keyIssueOf(issues: unknown): KeyIssue | null {
  if (!Array.isArray(issues)) return null;
  if (issues.includes('KEY_AMBIGUOUS')) return 'KEY_AMBIGUOUS';
  if (issues.includes('NO_KEY_FOUND')) return 'NO_KEY_FOUND';
  return null;
}

type PendingDraft = {
  id: string;
  order: number;
  textOriginal: string;
  raw: Prisma.JsonValue;
  issues: Prisma.JsonValue;
};

function toInput(draft: PendingDraft, sourceLang: string, subject: string): StructureInput {
  const raw = parseRaw(draft.raw);
  return {
    order: draft.order,
    number: raw.number ?? null,
    text: draft.textOriginal,
    images: (raw.images ?? []).filter((img) => typeof img.url === 'string'),
    pageImages: (raw.pageImages ?? []).filter((img) => typeof img.url === 'string'),
    regions: raw.regions ?? [],
    sourceLang,
    subject,
    givenKey: raw.answerKey ?? null,
    keyIssue: keyIssueOf(draft.issues),
  };
}

/** Strukturalangan savolni `ImportDraft` ustunlariga yoyadi. */
function draftData(question: StructuredQuestion, raw: RawBlock): Prisma.ImportDraftUpdateInput {
  const options = question.options as unknown as Prisma.InputJsonValue;
  return {
    // `text` ham, `textOriginal` ham strukturalangan matn: tarjima (S5)
    // keyinchalik faqat `text` va `options` ni maqsad tiliga almashtiradi,
    // `*Original` esa manba tilida qoladi.
    textOriginal: question.text,
    text: question.text,
    optionsOriginal: options,
    options,
    correctAnswer: question.correctAnswer,
    type: question.type,
    explanation: question.explanation || null,
    topicGuess: question.topicGuess || null,
    bloomLevel: question.bloomLevel || null,
    difficulty: question.difficulty,
    confidence: question.confidence,
    issues: question.issues as unknown as Prisma.InputJsonValue,
    raw: {
      ...raw,
      stage: 'STRUCTURED',
      notQuestion: question.notQuestion,
      answerMismatch: question.answerMismatch,
    } as unknown as Prisma.InputJsonValue,
  };
}

/** Yiqilgan blok: urinish soni oshadi, chegaradan keyin bosqich terminal bo'ladi. */
function failureData(draft: PendingDraft): Prisma.ImportDraftUpdateInput {
  const raw = parseRaw(draft.raw);
  const attempts = (typeof raw.attempts === 'number' ? raw.attempts : 0) + 1;
  const issues = Array.isArray(draft.issues) ? draft.issues.filter((i) => i !== 'STRUCTURE_FAILED') : [];
  return {
    issues: [...issues, 'STRUCTURE_FAILED'] as unknown as Prisma.InputJsonValue,
    raw: {
      ...raw,
      attempts,
      stage: attempts >= MAX_ATTEMPTS ? 'STRUCTURE_FAILED' : 'BLOCK',
    } as unknown as Prisma.InputJsonValue,
  };
}

// POST /api/teacher/import/[jobId]/structure — xom bloklarni Gemini bilan
// strukturalangan savolga aylantiradi.
//
// IDEMPOTENT: faqat `raw.stage === 'BLOCK'` qatorlar tanlanadi, shuning uchun
// qayta chaqiruv allaqachon strukturalangan savolni QAYTA to'lamaydi va
// dublikat yaratmaydi. Klient `hasMore: true` bo'lguncha chaqiraveradi.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const { job, error } = await requireOwnedJob(jobId);
    if (error) return error;

    // `jobSelect` da `sourceLang` va fan yo'q — ular faqat shu bosqichga kerak.
    const meta = await db.importJob.findUnique({
      where: { id: job.id },
      select: { sourceLang: true, subject: { select: { nameUz: true } } },
    });

    const total = await db.importDraft.count({ where: { jobId: job.id } });
    if (total === 0) {
      return NextResponse.json({ error: 'Bloklar hali yozilmagan', code: 'NO_BLOCKS' }, { status: 409 });
    }

    const pending = (await db.importDraft.findMany({
      where: { jobId: job.id, ...PENDING },
      orderBy: { order: 'asc' },
      take: BATCH,
      select: { id: true, order: true, textOriginal: true, raw: true, issues: true },
    })) as PendingDraft[];

    if (pending.length > 0 && job.status !== 'STRUCTURING') {
      await db.importJob.update({ where: { id: job.id }, data: { status: 'STRUCTURING' } });
    }

    // Kalit qatori sifatida allaqachon aniqlangan blok modelga YUBORILMAYDI:
    // javobi oldindan ma'lum, chaqiruv esa bekor pul.
    const skipped = pending.filter((d) => parseRaw(d.raw).notQuestion === true);
    const work = pending.filter((d) => parseRaw(d.raw).notQuestion !== true);

    const outcomes = await structureBatch(
      work.map((d) => toInput(d, meta?.sourceLang ?? 'uz', meta?.subject?.nameUz ?? '')),
      createGeminiCaller(),
    );

    const byOrder = new Map(work.map((d) => [d.order, d]));
    const writes: Prisma.PrismaPromise<unknown>[] = [];

    for (const draft of skipped) {
      writes.push(
        db.importDraft.update({
          where: { id: draft.id },
          data: { raw: { ...parseRaw(draft.raw), stage: 'STRUCTURED' } as unknown as Prisma.InputJsonValue },
        }),
      );
    }

    let tokens = 0;
    let failed = 0;
    for (const outcome of outcomes) {
      const draft = byOrder.get(outcome.order);
      if (!draft) continue;
      tokens += outcome.tokens;
      if (outcome.failed || !outcome.question) {
        failed++;
        writes.push(db.importDraft.update({ where: { id: draft.id }, data: failureData(draft) }));
        continue;
      }
      writes.push(
        db.importDraft.update({ where: { id: draft.id }, data: draftData(outcome.question, parseRaw(draft.raw)) }),
      );
    }

    await db.$transaction(writes);

    // Tokenlar ATOMAR qo'shiladi: klient siklidan ikkita so'rov ustma-ust
    // kelsa, `increment` ham, o'qib-yozish ham birini yo'qotardi.
    if (tokens > 0) {
      await db.$executeRaw`UPDATE "ImportJob" SET "costTokens" = "costTokens" + ${tokens}, "model" = ${STRUCTURE_MODEL} WHERE "id" = ${job.id}`;
    }

    const remaining = await db.importDraft.count({ where: { jobId: job.id, ...PENDING } });
    if (remaining === 0) {
      await db.importJob.update({ where: { id: job.id }, data: { status: 'REVIEW' } });
    }

    return NextResponse.json({ done: total - remaining, total, hasMore: remaining > 0, failed });
  } catch (error) {
    logger.error('POST /api/teacher/import/[jobId]/structure error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
