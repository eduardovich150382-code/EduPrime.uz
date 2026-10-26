import { getDistractorWhy, toLang } from './paramgen/regenerate';

/**
 * S20a — foydalanuvchi tanlagan (noto'g'ri) variantning "nega xato" izohini
 * qo'shadi. Faqat parametrik savolda (`templateId`+`variantSig` bor) VA
 * foydalanuvchi shu savolga NOTO'G'RI javob bergan bo'lsa hisoblanadi —
 * to'g'ri javob/javobsiz holatda va oddiy (mualliflik) savollarda `null`.
 * Bepul — `applySolutionVisibility`dagi qulfga bog'liq emas.
 */
export function attachDistractorWhy<
  T extends { id: string; templateId?: string | null; variantSig?: string | null; lang?: string | null }
>(
  question: T,
  answers: { questionId: string; answer: string; isCorrect: boolean }[]
): T & { distractorWhy: string | null } {
  if (!question.templateId || !question.variantSig) {
    return { ...question, distractorWhy: null };
  }
  const record = answers.find((a) => a.questionId === question.id);
  if (!record || !record.answer || record.isCorrect) {
    return { ...question, distractorWhy: null };
  }
  return {
    ...question,
    distractorWhy: getDistractorWhy(question.templateId, question.variantSig, toLang(question.lang), record.answer),
  };
}
