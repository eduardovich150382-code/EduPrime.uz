import { gradeSubmission, type AnswerResult, type GradableQuestion, type SanitizedAnswer } from './grading';

export interface PracticeGradingResult {
  answerResults: AnswerResult[];
  correct: number;
  total: number;
}

/**
 * Xatolar ustida mashqni baholash. `questions` — testning TO'LIQ savollari
 * (bazadagi tartibda), xuddi submit'dagidek: variant urug'i `baseSeed + slot + 1`
 * va slot to'liq ro'yxatni aralashtirishdan olinadi. Qism to'plamni
 * `gradeSubmission` ga berish slotlarni siljitib, to'g'ri javobni xato deb
 * baholardi — shuning uchun to'liq ro'yxat baholanadi, natija esa keyin
 * `questionIds` ga qisqartiriladi. `grading.ts` ning o'ziga tegilmaydi.
 *
 * To'plamdan tashqaridagi javoblar oldindan tashlanadi: ular baholanmaydi va
 * ochiq savollarda AI tekshiruviga ham tushmaydi.
 */
export async function gradePracticeSubset(params: {
  questions: GradableQuestion[];
  answers: SanitizedAnswer[];
  baseSeed: number;
  preserveOrder: boolean;
  questionIds: string[];
}): Promise<PracticeGradingResult> {
  const wanted = new Set(params.questionIds);
  const { answerResults } = await gradeSubmission({
    questions: params.questions,
    answers: params.answers.filter((answer) => wanted.has(answer.questionId)),
    baseSeed: params.baseSeed,
    preserveOrder: params.preserveOrder,
  });
  const subset = answerResults.filter((result) => wanted.has(result.questionId));
  return { answerResults: subset, correct: subset.filter((result) => result.isCorrect).length, total: subset.length };
}
