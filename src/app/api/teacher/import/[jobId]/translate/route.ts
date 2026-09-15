import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { StructuredOption } from '@/lib/import/structure';
import { toLastError, type LastError } from '@/lib/import/structure-error';
import {
  shouldTranslate,
  translateBatch,
  TRANSLATE_BATCH,
  TRANSLATE_DEADLINE_MS,
  type TranslateInput,
  type TranslatedQuestion,
} from '@/lib/import/translate';
import { createTranslateCaller } from '@/lib/import/translate-model';
import { requireOwnedJob } from '@/lib/import-jobs';
import { logger } from '@/lib/logger';

/**
 * Funksiyaning vaqt chegarasi (soniya) — tarifdagi eng yuqori qiymat.
 *
 * `structure/route.ts` dagi bilan bir xil sabab: bu QATTIQ chegara, unga
 * yetilsa Vercel funksiyani o'zi to'xtatadi va kod hech narsa yoza olmaydi.
 * Shuning uchun ish hajmi emas, VAQT boshqaradi — `TRANSLATE_DEADLINE_MS`
 * (standart 45 s) shu chegaradan xavfsiz masofada turadi, har to'lqindan keyin
 * tekshiriladi va har chaqiruvning o'z `AbortSignal` chegarasi bor.
 */
export const maxDuration = 60;

/** Bitta savol uchun qayta urinishlar chegarasi — cheksiz siklning oldini oladi. */
const MAX_ATTEMPTS = 3;

/** Javobda qaytariladigan yiqilish namunalari soni — klient konsoli uchun. */
const FAILED_SAMPLE = 3;

/** Tarjima navbati — strukturalangan, lekin hali tarjima qilinmagan draftlar. */
const PENDING: Prisma.ImportDraftWhereInput = { raw: { path: ['stage'], equals: 'STRUCTURED' } };

/** Tarjima qilingan draftlar — progressdagi `done` shular bo'yicha sanaladi. */
const TRANSLATED: Prisma.ImportDraftWhereInput = { raw: { path: ['stage'], equals: 'TRANSLATED' } };

/** Uch urinishdan keyin terminal bo'lgan draftlar — faqat qo'lda qayta uriniladi. */
const TERMINAL: Prisma.ImportDraftWhereInput = { raw: { path: ['stage'], equals: 'TRANSLATE_FAILED' } };

interface RawDraft {
  stage?: string;
  /** Tarjima urinishlari — strukturalashning `attempts` idan ALOHIDA sanaladi. */
  translateAttempts?: number;
  /** Tarjimani qaysi model bergani — modellar sifatini taqqoslash uchun. */
  translateModel?: string;
  lastError?: LastError;
}

function parseRaw(value: unknown): RawDraft & Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as RawDraft & Record<string, unknown>)
    : {};
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

/** `options`/`optionsOriginal` Json ustunini variantlar massiviga aylantiradi. */
function parseOptions(value: unknown): StructuredOption[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    const o = asRecord(entry);
    return {
      label: typeof o.label === 'string' ? o.label : String.fromCharCode(65 + index),
      text: typeof o.text === 'string' ? o.text : '',
      imageToken: typeof o.imageToken === 'string' && o.imageToken ? o.imageToken : null,
    };
  });
}

type PendingDraft = {
  id: string;
  order: number;
  text: string;
  textOriginal: string;
  options: Prisma.JsonValue;
  optionsOriginal: Prisma.JsonValue;
  raw: Prisma.JsonValue;
  issues: Prisma.JsonValue;
};

/**
 * Manba nusxasi — `*Original`, u bo'sh bo'lsa joriy qiymat.
 *
 * S4 ikkala ustunni ham to'ldiradi, lekin eski yoki qo'lda kiritilgan draftda
 * ular bo'sh bo'lishi mumkin. Bo'sh bo'lsa joriy `text`/`options` manba
 * hisoblanadi va ular `*Original` ga KO'CHIRILADI (`originalBackfill`) —
 * shundan keyin tarjima ustidan yozsa ham asl nusxa yo'qolmaydi.
 */
function sourceOf(draft: PendingDraft): { text: string; options: StructuredOption[] } {
  const original = parseOptions(draft.optionsOriginal);
  return {
    text: draft.textOriginal || draft.text,
    options: original.length > 0 ? original : parseOptions(draft.options),
  };
}

/**
 * `*Original` bo'sh bo'lsa uni to'ldiradigan maydonlar.
 *
 * To'lgan ustun HECH QACHON ustidan yozilmaydi — u manba tilidagi yagona
 * nusxa va tarjima uni buzsa, qaytarib bo'lmasdi.
 */
function originalBackfill(draft: PendingDraft): Prisma.ImportDraftUpdateInput {
  const data: Prisma.ImportDraftUpdateInput = {};
  if (!draft.textOriginal) data.textOriginal = draft.text;
  if (parseOptions(draft.optionsOriginal).length === 0) {
    data.optionsOriginal = draft.options as Prisma.InputJsonValue;
  }
  return data;
}

function toInput(draft: PendingDraft): TranslateInput {
  const source = sourceOf(draft);
  return { order: draft.order, text: source.text, options: source.options };
}

/** Tarjimani `ImportDraft` ustunlariga yoyadi. */
function translatedData(
  draft: PendingDraft,
  question: TranslatedQuestion,
  model: string | undefined,
): Prisma.ImportDraftUpdateInput {
  const raw = parseRaw(draft.raw);
  // Struktura bosqichi qo'ygan kodlar saqlanadi: ular savolning o'ziga tegishli
  // (kalit topilmagani, rasm joyi noaniqligi) va tarjima ularni bekor qilmaydi.
  const previous = Array.isArray(draft.issues) ? draft.issues.filter((i) => typeof i === 'string') : [];
  const issues = [...new Set([...previous, ...question.issues])].filter(
    (code) => code !== 'TRANSLATE_FAILED' && code !== 'RATE_LIMITED',
  );

  return {
    ...originalBackfill(draft),
    // `textOriginal`/`optionsOriginal` ga TEGILMAYDI — ular manba nusxasi.
    text: question.text,
    options: question.options as unknown as Prisma.InputJsonValue,
    issues: issues as unknown as Prisma.InputJsonValue,
    raw: {
      ...raw,
      stage: 'TRANSLATED',
      translateModel: model ?? raw.translateModel,
    } as unknown as Prisma.InputJsonValue,
  };
}

/**
 * Kvota tugagani uchun bajarilmagan savol — YIQILISH EMAS.
 *
 * `structure/route.ts` dagi bilan bir xil mantiq: `translateAttempts` oshmaydi
 * va bosqich `STRUCTURED` bo'lib qoladi, chunki sabab savolda emas, tashqi
 * kunlik chegarada — u ertaga o'tadi.
 */
function rateLimitData(draft: PendingDraft, error: unknown): Prisma.ImportDraftUpdateInput {
  const raw = parseRaw(draft.raw);
  const issues = Array.isArray(draft.issues) ? draft.issues.filter((i) => i !== 'RATE_LIMITED') : [];
  return {
    issues: [...issues, 'RATE_LIMITED'] as unknown as Prisma.InputJsonValue,
    raw: { ...raw, lastError: toLastError(error) } as unknown as Prisma.InputJsonValue,
  };
}

/**
 * Yiqilgan savol: urinish soni oshadi, chegaradan keyin bosqich terminal bo'ladi.
 *
 * `text`/`options` ga TEGILMAYDI: tekshiruvdan o'tmagan tarjima yarim buzuq
 * bo'lishi mumkin, uni saqlash esa bazaga jimgina yaroqsiz savol kiritish
 * degani. Savol manba tilida qoladi — ustoz uni hech bo'lmasa o'qiy oladi.
 */
function failureData(
  draft: PendingDraft,
  error: unknown,
): { data: Prisma.ImportDraftUpdateInput; attempts: number; lastError: LastError } {
  const raw = parseRaw(draft.raw);
  const attempts = (typeof raw.translateAttempts === 'number' ? raw.translateAttempts : 0) + 1;
  const issues = Array.isArray(draft.issues) ? draft.issues.filter((i) => i !== 'TRANSLATE_FAILED') : [];
  const lastError = toLastError(error);
  return {
    attempts,
    lastError,
    data: {
      ...originalBackfill(draft),
      issues: [...issues, 'TRANSLATE_FAILED'] as unknown as Prisma.InputJsonValue,
      raw: {
        ...raw,
        translateAttempts: attempts,
        lastError,
        stage: attempts >= MAX_ATTEMPTS ? 'TRANSLATE_FAILED' : 'STRUCTURED',
      } as unknown as Prisma.InputJsonValue,
    },
  };
}

// POST /api/teacher/import/[jobId]/translate — strukturalangan savollarni
// manba tilidan maqsad tiliga o'giradi.
//
// IDEMPOTENT: faqat `raw.stage === 'STRUCTURED'` qatorlar tanlanadi, shuning
// uchun qayta chaqiruv allaqachon tarjima qilingan savolni QAYTA to'lamaydi.
// Klient `hasMore: true` bo'lguncha chaqiraveradi.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const startedAt = Date.now();
  try {
    const { jobId } = await params;
    const { job, error } = await requireOwnedJob(jobId);
    if (error) return error;

    // `jobSelect` da tillar va fan yo'q — ular faqat shu bosqichga kerak.
    const meta = await db.importJob.findUnique({
      where: { id: job.id },
      select: { sourceLang: true, targetLang: true, subject: { select: { nameUz: true } } },
    });
    const sourceLang = meta?.sourceLang ?? 'uz';
    const targetLang = meta?.targetLang ?? 'uz';

    const total = await db.importDraft.count({ where: { jobId: job.id } });
    if (total === 0) {
      return NextResponse.json({ error: 'Bloklar hali yozilmagan', code: 'NO_BLOCKS' }, { status: 409 });
    }

    // QISQA YO'L: tillar teng bo'lsa Gemini umuman chaqirilmaydi. Bu tekshiruv
    // `createTranslateCaller()` dan OLDIN turadi — o'zbekcha kitob uchun bu
    // bosqich bepul va bir zumda o'tishi kerak.
    //
    // Bitta SQL: `updateMany` Json ustunining ichidagi bitta kalitni
    // o'zgartira olmaydi, `jsonb_set` esa qolgan maydonlarni (rasmlar,
    // sohalar, kalit) tegmasdan qoldiradi.
    if (!shouldTranslate(sourceLang, targetLang)) {
      await db.$executeRaw`UPDATE "ImportDraft" SET "raw" = jsonb_set("raw", '{stage}', '"TRANSLATED"') WHERE "jobId" = ${job.id} AND "raw"->>'stage' = 'STRUCTURED'`;
      await db.importJob.update({ where: { id: job.id }, data: { status: 'REVIEW' } });
      const done = await db.importDraft.count({ where: { jobId: job.id, ...TRANSLATED } });
      logger.info('Tarjima o\'tkazib yuborildi (tillar teng)', {
        jobId: job.id,
        sourceLang,
        targetLang,
        done,
        total,
      });
      return NextResponse.json({
        done,
        total,
        hasMore: false,
        skippedSameLang: true,
        translated: 0,
        failed: 0,
        deferred: 0,
        rateLimited: 0,
        stuck: 0,
        elapsedMs: Date.now() - startedAt,
      });
    }

    // `?retryFailed=1` — terminal yiqilgan savollarni qaytadan navbatga qo'yadi.
    // `translateAttempts` nolga tushadi: yiqilish ko'pincha kvota yoki tarmoq
    // tufayli, ya'ni sabab savolda emas.
    if (request.nextUrl.searchParams.get('retryFailed') === '1') {
      const terminal = await db.importDraft.findMany({
        where: { jobId: job.id, ...TERMINAL },
        select: { id: true, raw: true, issues: true },
      });
      const restores = terminal.map((draft) => {
        const raw = { ...parseRaw(draft.raw) };
        delete raw.lastError;
        const issues = Array.isArray(draft.issues)
          ? draft.issues.filter((i) => i !== 'TRANSLATE_FAILED' && i !== 'RATE_LIMITED')
          : [];
        return db.importDraft.update({
          where: { id: draft.id },
          data: {
            issues: issues as unknown as Prisma.InputJsonValue,
            raw: {
              ...raw,
              translateAttempts: 0,
              stage: 'STRUCTURED',
            } as unknown as Prisma.InputJsonValue,
          },
        });
      });
      if (restores.length > 0) await db.$transaction(restores);
    }

    const pending = (await db.importDraft.findMany({
      where: { jobId: job.id, ...PENDING },
      orderBy: { order: 'asc' },
      take: TRANSLATE_BATCH,
      select: {
        id: true,
        order: true,
        text: true,
        textOriginal: true,
        options: true,
        optionsOriginal: true,
        raw: true,
        issues: true,
      },
    })) as PendingDraft[];

    if (pending.length > 0 && job.status !== 'TRANSLATING') {
      await db.importJob.update({ where: { id: job.id }, data: { status: 'TRANSLATING' } });
    }

    // Byudjetdan qolgan vaqt — `translateBatch` uni to'lqinlar orasida,
    // `withRetry` esa har chaqiruv va har kutishdan oldin tekshiradi.
    const remainingMs = () => TRANSLATE_DEADLINE_MS - (Date.now() - startedAt);

    const { outcomes, batches, deadlineHit } = await translateBatch(
      pending.map(toInput),
      { sourceLang, targetLang, subject: meta?.subject?.nameUz ?? '' },
      createTranslateCaller(),
      { remaining: remainingMs },
    );

    const byOrder = new Map(pending.map((d) => [d.order, d]));
    const writes: Prisma.PrismaPromise<unknown>[] = [];
    // ILGARILASHNI bildiradigan yozuvlar soni — kvota belgisi bundan tashqarida:
    // u savolni oldinga surmaydi, shuning uchun `stalled` ni yashirmasligi kerak.
    let written = 0;

    let tokens = 0;
    let translated = 0;
    let failed = 0;
    let deferred = 0;
    let rateLimited = 0;
    let lastModel: string | undefined;
    let lastError: LastError | undefined;
    const failedSample: { order: number; message: string }[] = [];

    for (const outcome of outcomes) {
      const draft = byOrder.get(outcome.order);
      if (!draft) continue;
      tokens += outcome.tokens;

      // Vaqt yetmagani XATO EMAS: savolga umuman tegilmaydi — `attempts`
      // oshmaydi, keyingi so'rovda yangidan uriniladi. Kvota tugagani ham
      // kechiriladi, lekin izsiz emas: sabab yozib qo'yiladi va alohida
      // sanaladi — klient ustozga "ertaga davom eting" deyishi uchun.
      if (outcome.rateLimited) {
        rateLimited++;
        lastError = toLastError(outcome.error);
        writes.push(
          db.importDraft.update({ where: { id: draft.id }, data: rateLimitData(draft, outcome.error) }),
        );
        continue;
      }
      if (outcome.deferred) {
        deferred++;
        continue;
      }
      if (outcome.failed || !outcome.result) {
        failed++;
        written++;
        const failure = failureData(draft, outcome.error);
        lastError = failure.lastError;
        if (failedSample.length < FAILED_SAMPLE) {
          failedSample.push({ order: draft.order, message: failure.lastError.message });
        }
        // Terminal holat — savol manba tilida qolib ketdi, bu `error`. Oraliq
        // urinish hali tuzalishi mumkin, lekin u ham Sentry'ga tushsin: naqshni
        // (masalan "bir butun guruh birdaniga") faqat shunda ko'rish mumkin.
        const context = {
          error: outcome.error,
          tags: {
            'import.stage': 'translate',
            'import.jobId': job.id,
            'import.model': outcome.model ?? lastModel ?? '',
            order: draft.order,
            attempt: failure.attempts,
          },
        };
        if (failure.attempts >= MAX_ATTEMPTS) {
          logger.error('Import savolini tarjima qilish yiqildi', context);
        } else {
          logger.warn('Import savolini tarjima qilishda xato, qayta uriniladi', {
            ...context,
            report: true,
          });
        }
        writes.push(db.importDraft.update({ where: { id: draft.id }, data: failure.data }));
        continue;
      }

      translated++;
      written++;
      lastModel = outcome.model ?? lastModel;
      writes.push(
        db.importDraft.update({
          where: { id: draft.id },
          data: translatedData(draft, outcome.result, outcome.model),
        }),
      );
    }

    await db.$transaction(writes);

    // Tokenlar ATOMAR qo'shiladi: klient siklidan ikkita so'rov ustma-ust
    // kelsa, `increment` ham, o'qib-yozish ham birini yo'qotardi.
    if (tokens > 0) {
      await db.$executeRaw`UPDATE "ImportJob" SET "costTokens" = "costTokens" + ${tokens}, "model" = COALESCE(${lastModel ?? null}, "model") WHERE "id" = ${job.id}`;
    }

    const remaining = await db.importDraft.count({ where: { jobId: job.id, ...PENDING } });
    if (remaining === 0) {
      await db.importJob.update({ where: { id: job.id }, data: { status: 'REVIEW' } });
    }

    const done = await db.importDraft.count({ where: { jobId: job.id, ...TRANSLATED } });
    const stuck = await db.importDraft.count({ where: { jobId: job.id, ...TERMINAL } });
    const stalled = remaining > 0 && written === 0;

    const elapsedMs = Date.now() - startedAt;
    logger.info('Tarjima paketi', {
      jobId: job.id,
      elapsedMs,
      questions: pending.length,
      batches,
      deadlineHit,
      translated,
      deferred,
      rateLimited,
      stalled,
      done,
      total,
      failed,
      stuck,
      model: lastModel,
    });

    return NextResponse.json({
      done,
      total,
      hasMore: remaining > 0,
      translated,
      deferred,
      failed,
      failedSample,
      elapsedMs,
      batches,
      deadlineHit,
      stalled,
      rateLimited,
      stuck,
      // Sabab HECH QACHON yutilmaydi: Vercel logi bepul tarifda yarim soatdan
      // keyin o'chadi, klient konsolida esa qoladi.
      lastError,
    });
  } catch (error) {
    logger.error('POST /api/teacher/import/[jobId]/translate error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
