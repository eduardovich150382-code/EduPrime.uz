import { db } from './db';
import { gradeSubmission } from './grading';
import { loadSessionItems, sessionPreserveOrder } from './sessions';
import { hasActiveSubscription } from './access';
import { isSolutionUnlocked } from './quota';
import { resolveSolutionVisibility } from './solution-visibility';
import { getDistractorWhy, toLang } from './paramgen/regenerate';

/**
 * PRACTICE bloki (S22b, `/api/lesson-blocks/[id]/practice/check`) va video
 * nazorat nuqtalari (S23, `/api/video-checkpoints/[kind]/[id]/check`) BIR
 * XIL baholash yo'lidan foydalanadi — bitta savolni darhol tekshiradi,
 * TestResult HECH QACHON yozmaydi, kvota sarflamaydi. Ikkalasi ham shu
 * funksiyani chaqiradi, faqat "shu foydalanuvchi shu havzani ko'ra
 * oladimi" tekshiruvi (loadPracticeBlockAccess / loadLessonVideoCheckpointAccess
 * / loadVideoSolutionCheckpointAccess) chaqiruvchida farqlanadi — natijada
 * kelib chiqadigan `poolItemIds` shu yerga beriladi. `lib/grading.ts`ning
 * o'zi TEGILMAYDI (CLAUDE.md) — bu yerda faqat uni chaqiruvchi qatlam.
 */
export interface PracticeCheckParams {
  userId: string;
  role: string;
  sessionId: string;
  questionId: string;
  answer: string;
  timeSpent: number;
  /** `TestSession.itemIds` shu havzaning ICHIDA bo'lishi shart — sessiya haqiqatan shu blok/videoning o'zi uchun yaratilganini tasdiqlaydi. */
  poolItemIds: string[];
}

export interface PracticeCheckAnswer {
  isCorrect: boolean;
  correctAnswer: string;
  /** S17 pullik yechim — `SolutionUnlock` ortida, ochilmagan bo'lsa `null`. */
  explanation: string | null;
  explanationImages: string[];
  /** S20a bepul daraja — noto'g'ri javobda tanlangan chalg'ituvchining "nega xato" izohi (parametrik savolda). */
  distractorWhy: string | null;
}

export type PracticeCheckResult =
  | { ok: true; result: PracticeCheckAnswer }
  | { ok: false; status: number; error: string };

export async function checkPracticeAnswer(params: PracticeCheckParams): Promise<PracticeCheckResult> {
  const { userId, role, sessionId, questionId, answer, timeSpent, poolItemIds } = params;

  const testSession = await db.testSession.findUnique({ where: { id: sessionId } });
  if (!testSession || testSession.userId !== userId) {
    return { ok: false, status: 404, error: 'Sessiya topilmadi' };
  }
  // Sessiya haqiqatan shu havza uchun (start marshruti orqali) yaratilganini
  // tekshiradi — onlyItemIds bilan tanlangan itemIds har doim shu to'plamning
  // ICHIDA (item-picker.ts — buildItemWhere), shuning uchun to'liq qamrov
  // tekshiruvi yetarli.
  const belongsToPool = testSession.itemIds.every((itemId) => poolItemIds.includes(itemId));
  if (!belongsToPool) {
    return { ok: false, status: 403, error: 'Sessiya bu materialga tegishli emas' };
  }

  const items = await loadSessionItems(testSession.itemIds);
  if (items.length === 0) {
    return { ok: false, status: 404, error: 'Savollar topilmadi' };
  }

  const { answerResults } = await gradeSubmission({
    questions: items,
    answers: [{ questionId, answer, timeSpent }],
    baseSeed: testSession.seed,
    preserveOrder: sessionPreserveOrder(testSession.spec),
  });

  const result = answerResults.find((r) => r.questionId === questionId);
  const item = items.find((it) => it.id === questionId);
  if (!result || !item) {
    return { ok: false, status: 400, error: 'Savol bu sessiyada topilmadi' };
  }

  // `SolutionUnlock.itemId` — bu oqim har doim Item.id bilan ishlaydi
  // (loadSessionItems), Test tarmog'idagi eski Question.id'dan farqli hech
  // qanday `resolveUnlockKey` normallashtirish shart emas.
  const { premium, teacher } = await hasActiveSubscription(userId);
  const writtenUnlocked =
    role === 'ADMIN' || premium || teacher || (await isSolutionUnlocked(userId, item.id));
  const visibility = resolveSolutionVisibility({
    explanation: item.explanation,
    explanationImages: item.explanationImages,
    videoUrl: item.videoUrl,
    writtenUnlocked,
    // Bu oqim video yechim ko'rsatmaydi (frontend uni umuman render
    // qilmaydi) — `false` shunchaki videoUrl javobda hech qachon
    // chiqmasligini kafolatlaydi.
    videoUnlocked: false,
  });

  const distractorWhy =
    !result.isCorrect && result.answer && item.templateId && item.variantSig
      ? getDistractorWhy(item.templateId, item.variantSig, toLang(item.lang), result.answer)
      : null;

  return {
    ok: true,
    result: {
      isCorrect: result.isCorrect,
      correctAnswer: result.correctAnswer,
      explanation: visibility.explanation,
      explanationImages: visibility.explanationImages,
      distractorWhy,
    },
  };
}
