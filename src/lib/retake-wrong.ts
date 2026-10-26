import { restoreQuestionOrder } from './exam-presentation';
import { withReturnTo } from './safe-return-path';

/**
 * "Faqat xatolarni qayta yechish" — qaysi savollar mashqqa kiradi.
 *
 * Mezon natija xaritasi (`ResultQuestionMap`) bilan AYNAN bir: xarita joriy
 * test savollari bo'yicha yuradi va faqat `isCorrect === true` yozuvni
 * "to'g'ri" deydi, qolgani "xato" yoki "javob berilmagan". Shu sababli
 * tugmadagi N har doim xaritadagi "Xato + Javob berilmagan" yig'indisiga teng.
 * Natijadan keyin o'chirilgan savol `testQuestionIds` da yo'q — tushib qoladi;
 * keyin qo'shilgan savol `answers` da yo'q — xaritadagidek "javob berilmagan".
 *
 * `answers` — `TestResult.answers` (Json) xom holda: eski yoki qo'lda
 * buzilgan qator natija sahifasini yiqitmasin, shunchaki "javob yo'q" bo'ladi.
 */
export function getRetakeQuestionIds(answers: unknown, testQuestionIds: string[]): string[] {
  const correct = new Set<string>();
  if (Array.isArray(answers)) {
    for (const entry of answers) {
      if (entry && typeof entry === 'object' && 'questionId' in entry && 'isCorrect' in entry
        && typeof entry.questionId === 'string' && entry.isCorrect === true) correct.add(entry.questionId);
    }
  }
  return testQuestionIds.filter((id) => !correct.has(id));
}

/**
 * Mashq to'plamini to'liq taqdimotdan ajratadi — tartib o'zgarmaydi.
 * Qism to'plam hech qachon alohida aralashtirilmaydi: variant urug'i to'liq
 * ro'yxatdagi slotdan olinadi (lib/shuffle.ts — planQuestionOrder), alohida
 * aralashtirilsa baholash boshqa variant tartibini qayta hisoblab qo'yardi.
 */
export function filterPracticeQuestions<T extends { id: string }>(presented: T[], ids: Iterable<string>): T[] {
  const wanted = new Set(ids);
  return presented.filter((question) => wanted.has(question.id));
}

/**
 * Natija sahifasidagi savol raqami (1 dan): sahifa savollarni urinishdagi
 * tartibga (`answers` ketma-ketligi) tiklaydi, tiklab bo'lmasa bazadagi
 * tartibda qoldiradi. Mashq xaritasi shu raqamlarni ko'rsatadi — foydalanuvchi
 * "7-savol" ni natija sahifasidagi o'sha 7-savol bilan solishtira olsin.
 */
export function getOriginalNumbers(answers: unknown, testQuestionIds: string[]): Map<string, number> {
  const ids = Array.isArray(answers)
    ? answers.map((entry) => (entry && typeof entry === 'object' && 'questionId' in entry ? entry.questionId : null))
    : null;
  const questions = testQuestionIds.map((id) => ({ id }));
  const ordered = restoreQuestionOrder(questions, ids) ?? questions;
  return new Map(ordered.map((question, index) => [question.id, index + 1]));
}

/**
 * Natija sahifasidagi "Faqat xatolarni qayta yechish (N)" tugmasi. Faqat:
 * oddiy test natijasi (sessiya natijasida `testId` yo'q), joriy foydalanuvchining
 * o'zi (admin begona natijani ko'rsa ham tugma yo'q — server baribir 404
 * beradi) va N > 0. URL'da savol id'lari emas, faqat natija id'si.
 */
export function getPracticeLink(input: {
  resultId: string;
  testId: string | null;
  resultUserId: string;
  viewerId: string | null | undefined;
  answers: unknown;
  testQuestionIds: string[];
  returnTo: string | null;
}): { href: string; count: number } | null {
  if (!input.testId || !input.viewerId || input.viewerId !== input.resultUserId) return null;
  const count = getRetakeQuestionIds(input.answers, input.testQuestionIds).length;
  if (count === 0) return null;
  const href = withReturnTo(`/tests/${input.testId}/solve?practice=${encodeURIComponent(input.resultId)}`, input.returnTo);
  return { href, count };
}
