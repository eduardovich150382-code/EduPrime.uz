import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { KeyIssue, ResolvedAnswer } from '@/lib/import/answer-key';
import { STRUCTURE_BATCH, STRUCTURE_DEADLINE_MS, toLastError, type LastError } from '@/lib/import/structure-error';
import { structureBatch, type StructureInput, type StructuredQuestion } from '@/lib/import/structure';
import { createGeminiCaller } from '@/lib/import/structure-model';
import type { BBox } from '@/lib/import/types';
import { requireOwnedJob } from '@/lib/import-jobs';
import { logger } from '@/lib/logger';

/**
 * Funksiyaning vaqt chegarasi (soniya) — tarifdagi eng yuqori qiymat.
 *
 * Bu QATTIQ chegara: unga yetilsa Vercel funksiyani o'zi to'xtatadi, 504
 * qaytadi va kod hech narsa yoza olmaydi — na natija, na `lastError`. Shuning
 * uchun ish hajmi emas, VAQT boshqaradi: `STRUCTURE_DEADLINE_MS` (standart
 * 40 s) shu chegaradan xavfsiz masofada turadi va har to'lqindan keyin
 * tekshiriladi, har chaqiruvning esa o'z `AbortSignal` chegarasi bor.
 * Blok soni (`STRUCTURE_BATCH`) — faqat qo'shimcha himoya.
 */
export const maxDuration = 60;

/**
 * Bitta blok uchun qayta urinishlar chegarasi.
 *
 * Yiqilgan blok `BLOCK` bosqichida qoladi va keyingi chaqiruvda qayta
 * uriniladi. Chegara bo'lmasa doimiy yiqiladigan blok klient siklini cheksiz
 * aylantirardi: har so'rov o'sha blokni qaytadan tanlab, `hasMore` hech qachon
 * `false` bo'lmasdi.
 */
const MAX_ATTEMPTS = 3;

/** Javobda qaytariladigan yiqilish namunalari soni — klient konsoli uchun. */
const FAILED_SAMPLE = 3;

/** Strukturalanmagan draftlar — `raw.stage` hali `BLOCK`. */
const PENDING: Prisma.ImportDraftWhereInput = { raw: { path: ['stage'], equals: 'BLOCK' } };

/** Tayyor bo'lgan draftlar — progressdagi `done` shular bo'yicha sanaladi. */
const STRUCTURED: Prisma.ImportDraftWhereInput = { raw: { path: ['stage'], equals: 'STRUCTURED' } };

/** Uch urinishdan keyin terminal bo'lgan draftlar — faqat qo'lda qayta uriniladi. */
const TERMINAL: Prisma.ImportDraftWhereInput = { raw: { path: ['stage'], equals: 'STRUCTURE_FAILED' } };

interface RawBlock {
  images?: { assetId: string; url: string }[];
  pageImages?: { page: number; url: string }[];
  regions?: { page: number; bbox: BBox }[];
  number?: number | null;
  answerKey?: ResolvedAnswer | null;
  notQuestion?: boolean;
  attempts?: number;
  lastError?: LastError;
  /** Savolni qaysi model strukturalagani — modellar sifatini taqqoslash uchun. */
  model?: string;
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
function draftData(
  question: StructuredQuestion,
  raw: RawBlock,
  model: string | undefined,
): Prisma.ImportDraftUpdateInput {
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
      // Zanjirdagi qaysi model javob bergani — savol sifatini modellar
      // kesimida taqqoslash uchun yagona manba.
      model: model ?? raw.model,
      notQuestion: question.notQuestion,
      answerMismatch: question.answerMismatch,
    } as unknown as Prisma.InputJsonValue,
  };
}

/**
 * Kvota tugagani uchun bajarilmagan blok — YIQILISH EMAS.
 *
 * `attempts` oshmaydi va bosqich `BLOCK` bo'lib qoladi: sabab blokda emas,
 * tashqi kunlik chegarada, u ertaga o'tadi. Terminal qilib qo'yilsa, blok
 * kvota tiklangandan keyin ham abadiy yo'qolardi.
 *
 * Sabab baribir yoziladi (`raw.lastError`, `issues` da `RATE_LIMITED`) —
 * ustozga nima uchun to'xtaganini ko'rsatish uchun. Muvaffaqiyatli urinishda
 * `issues` butunlay qayta yoziladi, ya'ni belgi o'z-o'zidan yo'qoladi.
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
 * Yiqilgan blok: urinish soni oshadi, chegaradan keyin bosqich terminal bo'ladi.
 *
 * Sabab `raw.lastError` ga YOZILADI. Aks holda nosozlikni keyin tekshirib
 * bo'lmaydi: Vercel logi bepul tarifda yarim soatdan keyin o'chadi, `issues`
 * da esa faqat `STRUCTURE_FAILED` kodi qoladi va u nima uchun yiqilganini
 * aytmaydi.
 */
function failureData(
  draft: PendingDraft,
  error: unknown,
): { data: Prisma.ImportDraftUpdateInput; attempts: number; lastError: LastError } {
  const raw = parseRaw(draft.raw);
  const attempts = (typeof raw.attempts === 'number' ? raw.attempts : 0) + 1;
  const issues = Array.isArray(draft.issues) ? draft.issues.filter((i) => i !== 'STRUCTURE_FAILED') : [];
  const lastError = toLastError(error);
  return {
    attempts,
    lastError,
    data: {
      issues: [...issues, 'STRUCTURE_FAILED'] as unknown as Prisma.InputJsonValue,
      raw: {
        ...raw,
        attempts,
        lastError,
        stage: attempts >= MAX_ATTEMPTS ? 'STRUCTURE_FAILED' : 'BLOCK',
      } as unknown as Prisma.InputJsonValue,
    },
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
  const startedAt = Date.now();
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

    // `?retryFailed=1` — terminal yiqilgan bloklarni qaytadan navbatga qo'yadi.
    // Ular ko'pincha kvota tufayli yiqilgan, ya'ni sabab blokda emas: shuning
    // uchun `attempts` nolga tushadi, aks holda blok bir urinishdayoq yana
    // terminal bo'lardi.
    if (request.nextUrl.searchParams.get('retryFailed') === '1') {
      const terminal = await db.importDraft.findMany({
        where: { jobId: job.id, ...TERMINAL },
        select: { id: true, raw: true, issues: true },
      });
      const restores = terminal.map((draft) => {
        const raw = { ...parseRaw(draft.raw) };
        delete raw.lastError;
        const issues = Array.isArray(draft.issues)
          ? draft.issues.filter((i) => i !== 'STRUCTURE_FAILED' && i !== 'RATE_LIMITED')
          : [];
        return db.importDraft.update({
          where: { id: draft.id },
          data: {
            issues: issues as unknown as Prisma.InputJsonValue,
            raw: { ...raw, attempts: 0, stage: 'BLOCK' } as unknown as Prisma.InputJsonValue,
          },
        });
      });
      if (restores.length > 0) await db.$transaction(restores);
    }

    const pending = (await db.importDraft.findMany({
      where: { jobId: job.id, ...PENDING },
      orderBy: { order: 'asc' },
      take: STRUCTURE_BATCH,
      select: { id: true, order: true, textOriginal: true, raw: true, issues: true },
    })) as PendingDraft[];

    if (pending.length > 0 && job.status !== 'STRUCTURING') {
      await db.importJob.update({ where: { id: job.id }, data: { status: 'STRUCTURING' } });
    }

    // Kalit qatori sifatida allaqachon aniqlangan blok modelga YUBORILMAYDI:
    // javobi oldindan ma'lum, chaqiruv esa bekor pul.
    const skipped = pending.filter((d) => parseRaw(d.raw).notQuestion === true);
    const work = pending.filter((d) => parseRaw(d.raw).notQuestion !== true);

    // Byudjetdan qolgan vaqt — `structureBatch` uni to'lqinlar orasida, `withRetry`
    // esa har chaqiruv va har kutishdan oldin tekshiradi.
    const remainingMs = () => STRUCTURE_DEADLINE_MS - (Date.now() - startedAt);

    const { outcomes, batches, deadlineHit } = await structureBatch(
      work.map((d) => toInput(d, meta?.sourceLang ?? 'uz', meta?.subject?.nameUz ?? '')),
      createGeminiCaller(),
      undefined,
      { remaining: remainingMs },
    );

    const byOrder = new Map(work.map((d) => [d.order, d]));
    const writes: Prisma.PrismaPromise<unknown>[] = [];
    // ILGARILASHNI bildiradigan yozuvlar soni — kvota belgisi bundan tashqarida:
    // u blokni oldinga surmaydi, shuning uchun `stalled` ni yashirmasligi kerak.
    let written = 0;

    for (const draft of skipped) {
      written++;
      writes.push(
        db.importDraft.update({
          where: { id: draft.id },
          data: { raw: { ...parseRaw(draft.raw), stage: 'STRUCTURED' } as unknown as Prisma.InputJsonValue },
        }),
      );
    }

    let tokens = 0;
    let failed = 0;
    let deferred = 0;
    let rateLimited = 0;
    let lastModel: string | undefined;
    const failedSample: { order: number; message: string }[] = [];
    for (const outcome of outcomes) {
      const draft = byOrder.get(outcome.order);
      if (!draft) continue;
      tokens += outcome.tokens;
      // Vaqt yetmagani XATO EMAS: blokka umuman tegilmaydi — `attempts`
      // oshmaydi, `STRUCTURE_FAILED` yozilmaydi, keyingi so'rovda yangidan
      // uriniladi. To'lqinga yetib bormagan bloklar ham shu holatda qoladi.
      // Kvota tugagani ham vaqt yetmagani kabi kechiriladi, lekin izsiz emas:
      // sabab blokka yozib qo'yiladi va javobda alohida sanaladi — klient
      // ustozga "ertaga davom eting" deyishi uchun.
      if (outcome.rateLimited) {
        rateLimited++;
        writes.push(db.importDraft.update({ where: { id: draft.id }, data: rateLimitData(draft, outcome.error) }));
        continue;
      }
      if (outcome.deferred) {
        deferred++;
        continue;
      }
      if (outcome.failed || !outcome.question) {
        failed++;
        written++;
        const failure = failureData(draft, outcome.error);
        if (failedSample.length < FAILED_SAMPLE) {
          failedSample.push({ order: draft.order, message: failure.lastError.message });
        }
        // Terminal holat — blok butunlay yo'qoldi, bu `error`. Oraliq urinish
        // hali tuzalishi mumkin, lekin u ham Sentry'ga tushsin: naqshni
        // (masalan "bir butun bet birdaniga") faqat shunda ko'rish mumkin.
        const context = {
          error: outcome.error,
          tags: { jobId: job.id, order: draft.order, attempt: failure.attempts },
        };
        if (failure.attempts >= MAX_ATTEMPTS) {
          logger.error('Import blokini strukturalash yiqildi', context);
        } else {
          logger.warn('Import blokini strukturalashda xato, qayta uriniladi', { ...context, report: true });
        }
        writes.push(db.importDraft.update({ where: { id: draft.id }, data: failure.data }));
        continue;
      }
      written++;
      lastModel = outcome.model ?? lastModel;
      writes.push(
        db.importDraft.update({
          where: { id: draft.id },
          data: draftData(outcome.question, parseRaw(draft.raw), outcome.model),
        }),
      );
    }

    await db.$transaction(writes);

    // Tokenlar ATOMAR qo'shiladi: klient siklidan ikkita so'rov ustma-ust
    // kelsa, `increment` ham, o'qib-yozish ham birini yo'qotardi.
    if (tokens > 0) {
      // `model` — zanjirdan OXIRGI javob bergan model. `COALESCE`: model
      // noma'lum bo'lsa (eski chaqiruvchi) oldingi qiymat saqlanadi, `NULL`
      // bilan ustidan yozilmaydi.
      await db.$executeRaw`UPDATE "ImportJob" SET "costTokens" = "costTokens" + ${tokens}, "model" = COALESCE(${lastModel ?? null}, "model") WHERE "id" = ${job.id}`;
    }

    const remaining = await db.importDraft.count({ where: { jobId: job.id, ...PENDING } });
    if (remaining === 0) {
      await db.importJob.update({ where: { id: job.id }, data: { status: 'REVIEW' } });
    }

    // Progress BUTUN job bo'yicha: `done` — haqiqatan strukturalangan bloklar.
    // `total - remaining` hisobi yaramaydi, u `STRUCTURE_FAILED` bloklarni ham
    // "tayyor" deb sanaydi.
    const done = await db.importDraft.count({ where: { jobId: job.id, ...STRUCTURED } });

    // Bitta ham blok yozilmagan so'rov — klient cheksiz aylanmasligi uchun
    // to'xtashi va ustozga xabar berishi kerak.
    // Terminal yiqilgan bloklar — UI "Yiqilganlarni qayta urinish" tugmasini
    // shu songa qarab ko'rsatadi.
    const stuck = await db.importDraft.count({ where: { jobId: job.id, ...TERMINAL } });

    const stalled = remaining > 0 && written === 0;

    const elapsedMs = Date.now() - startedAt;
    // Vaqt o'lchovi ataylab log'ga chiqadi: muddat mexanizmi ishlayaptimi va
    // bitta so'rovda nechta to'lqin ulgurmoqda — taxmin bilan emas, o'lchov
    // bilan hal qilinadi.
    logger.info('Struktura paketi', {
      jobId: job.id,
      elapsedMs,
      blocks: pending.length,
      batches,
      deadlineHit,
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
      failed,
      failedSample,
      elapsedMs,
      batches,
      deadlineHit,
      stalled,
      rateLimited,
      stuck,
    });
  } catch (error) {
    logger.error('POST /api/teacher/import/[jobId]/structure error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
