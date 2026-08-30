import { QuestionType } from '@prisma/client';
import { db } from './db';
import { shuffleQuestionsWithSeed } from './shuffle';
import type { GradableQuestion } from './grading';

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
