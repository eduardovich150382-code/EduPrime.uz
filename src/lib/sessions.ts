import { Prisma, QuestionType } from '@prisma/client';
import { db } from './db';
import { shuffleQuestionsWithSeed } from './shuffle';
import type { GradableQuestion } from './grading';
import {
  getRecentlyCorrectItemIds,
  pickItemsForSpec,
  type ItemSpec,
  type RelaxationStep,
} from './item-picker';
import { consumeBuiltTest } from './quota';

/**
 * `TestSession.itemIds`dagi Item'larni SHU tartibda (findMany o'zi tartibni
 * kafolatlamaydi) to'liq (correctAnswer bilan) qaytaradi — bu massiv tartibi
 * `Question.order`ning o'rnini bosadi: GET (taqdimot) va submit (baholash)
 * ikkalasi ham shu tartibdan boshlanadi, keyin shuffleQuestionsWithSeed bilan
 * bir xil seed'da qayta aralashtiradi (grading.ts'dagi kabi).
 *
 * Item'da `points` ustuni yo'q — har bir savol uchun 1 ball beriladi
 * (Question.points'ning default qiymati bilan bir xil, konstruktor hozircha
 * og'irlik tanlashni qo'llab-quvvatlamaydi).
 *
 * Item o'chirilgan yoki keyinchalik nashrdan olib tashlangan bo'lsa —
 * natijada shunchaki tushib qoladi (itemIds ataylab Item'ga FK emas).
 */
export interface SessionQuestion extends GradableQuestion {
  images: string[];
  explanation: string | null;
  explanationImages: string[];
  videoUrl: string | null;
  subject: { nameUz: string; nameRu: string; nameEn: string };
}

export async function loadSessionItems(itemIds: string[]): Promise<SessionQuestion[]> {
  const items = await db.item.findMany({
    where: { id: { in: itemIds } },
    select: {
      id: true, text: true, images: true, options: true, correctAnswer: true, type: true,
      explanation: true, explanationImages: true, videoUrl: true,
      subject: { select: { nameUz: true, nameRu: true, nameEn: true } },
    },
  });
  const byId = new Map(items.map((it) => [it.id, it]));

  return itemIds.reduce<SessionQuestion[]>((acc, itemId) => {
    const it = byId.get(itemId);
    if (it) acc.push({ ...it, points: 1 });
    return acc;
  }, []);
}

export interface PresentedQuestion {
  id: string;
  text: string;
  images: string[];
  options: unknown;
  type: QuestionType;
  points: number;
}

/**
 * GET/POST /api/sessions javobiga ketadigan (talabaga ko'rsatiladigan)
 * shakl — `correctAnswer`, `explanation`, `explanationImages`, `videoUrl`
 * chiqarib tashlanadi (submit'gacha ochilmasligi kerak). Savol/variant
 * tartibi `seed` bo'yicha aralashtiriladi — xuddi shu `seed` submit
 * paytida `gradeSubmission`ga `baseSeed` sifatida beriladi, shu sababli
 * ikkala tomon bir xil tartibni ko'radi.
 */
export function toPresentedQuestions(items: SessionQuestion[], seed: number): PresentedQuestion[] {
  const shuffled = shuffleQuestionsWithSeed(items, seed, { preserveOrder: false });
  return shuffled.map(({ id, text, images, options, type, points }) => ({
    id, text, images, options, type, points,
  }));
}

export interface CreateSessionParams {
  userId: string;
  spec: ItemSpec;
  limit: number;
  durationMin: number;
  mode: 'FIXED' | 'ADAPTIVE';
  title: string;
  /**
   * `true` — S17 kunlik konstruktor test kvotasini sarflaydi (`lib/quota.ts`
   * — `consumeBuiltTest`). `POST /api/sessions` HAR DOIM `true` bilan
   * chaqiradi va so'rov tanasidan bu qiymatni HECH QACHON qabul qilmaydi —
   * mijoz shu bayroqni boshqarolmasin edi (kritik tuzatish: avval
   * `body.source === 'mastery'` kvota sarflashni butunlay chetlab o'tishga
   * imkon berardi, chunki `source` mijoz tomonidan erkin yuborilardi).
   * Bilim xaritasi mashq testlari kabi faqat SERVER tomonidan chaqiriladigan
   * yo'llar bu funksiyani to'g'ridan-to'g'ri `false` bilan chaqirishi
   * mumkin — HTTP marshrut orqali emas.
   */
  countsAgainstQuota: boolean;
}

export interface CreatedSession {
  id: string;
  title: string;
  mode: string;
  durationMin: number;
  startedAt: Date;
  expiresAt: Date;
  questionCount: number;
  questions: PresentedQuestion[];
}

export type CreateSessionError =
  | { status: 404; error: string }
  | { status: 429; error: string; code: 'BUILT_TEST_QUOTA_EXCEEDED'; usedToday: number; limit: number | null };

export type CreateSessionOutcome =
  | { ok: true; session: CreatedSession; relaxed: RelaxationStep[] }
  | { ok: false; error: CreateSessionError };

/**
 * ItemSpec bo'yicha virtual test sessiyasi yaratadi — `POST /api/sessions`
 * mantiqining o'zi shu yerga ko'chirilgan, shunday qilib kvota sarflash
 * qoidasi (`countsAgainstQuota`) FAQAT server kodi tomonidan belgilanadi,
 * hech qanday HTTP parametr orqali emas (qarang yuqoridagi izoh).
 */
export async function createSessionFromSpec(params: CreateSessionParams): Promise<CreateSessionOutcome> {
  const { userId, spec, limit, durationMin, mode, title, countsAgainstQuota } = params;

  const excludeItemIds = spec.excludeAnsweredCorrectlyDays
    ? await getRecentlyCorrectItemIds(userId, spec.excludeAnsweredCorrectlyDays)
    : [];

  // Sessiyaning o'zi bir martalik — har chaqiriqda yangi tasodifiy urug'
  // hosil qilinadi, GET va submit ORASIDA bir xil bo'lishi kifoya (shuning
  // uchun DB'da saqlanadi).
  const seed = Math.floor(Math.random() * 2 ** 31);
  const { ids: itemIds, relaxed } = await pickItemsForSpec({ spec, limit, seed, excludeItemIds });

  if (itemIds.length === 0) {
    return { ok: false, error: { status: 404, error: "Berilgan filtrga mos savol topilmadi" } };
  }

  // Kvota — sessiya YARATILGANDA hisoblanadi, tugatilganda emas. Havza bo'sh
  // chiqib 404 qaytadigan urinish kvotani sarflamasligi uchun shu tekshiruv
  // havza tasdiqlangandan KEYIN, lekin sessiya haqiqatan yaratilishidan
  // OLDIN turibdi.
  if (countsAgainstQuota) {
    const quota = await consumeBuiltTest(userId);
    if (!quota.allowed) {
      return {
        ok: false,
        error: {
          status: 429,
          error: `Bugungi bepul test tuzish limiti (${quota.limit} ta) tugadi. Ertaga yana ${quota.limit} ta bepul bo'ladi, yoki Premium tarifda cheksiz.`,
          code: 'BUILT_TEST_QUOTA_EXCEEDED',
          usedToday: quota.usedToday,
          limit: quota.limit,
        },
      };
    }
  }

  const now = new Date();
  const testSession = await db.testSession.create({
    data: {
      userId,
      title,
      spec: spec as Prisma.InputJsonValue,
      itemIds,
      seed,
      mode,
      durationMin,
      startedAt: now,
      expiresAt: new Date(now.getTime() + durationMin * 60_000),
    },
  });

  const items = await loadSessionItems(testSession.itemIds);
  const questions = toPresentedQuestions(items, testSession.seed);

  return {
    ok: true,
    session: {
      id: testSession.id,
      title: testSession.title,
      mode: testSession.mode,
      durationMin: testSession.durationMin,
      startedAt: testSession.startedAt,
      expiresAt: testSession.expiresAt,
      questionCount: questions.length,
      questions,
    },
    relaxed,
  };
}
