import { countFillBlanks, encodeFillBlankCorrectAnswer } from './fill-blank';
import type { QuestionCoreFields } from '@/types';

/**
 * FILL_BLANK: matndagi "___" soniga mos ravishda blankAnswers ro'yxatini
 * hisoblaydi (mapping/render vaqtida uzunlik mos kelishi uchun).
 */
export function fillBlankCorrectAnswer(q: Pick<QuestionCoreFields, 'text' | 'blankAnswers'>): string {
  const blankCount = countFillBlanks(q.text);
  const perBlank = Array.from({ length: blankCount }, (_, i) =>
    (q.blankAnswers[i] || '').split(',').map((s) => s.trim()).filter(Boolean)
  );
  return encodeFillBlankCorrectAnswer(perBlank);
}

/**
 * MATCHING: juftliklarni Question.options (Json) kutayotgan {left, right}
 * shakliga o'giradi — bo'sh (matnsiz) juftliklar chetlab o'tiladi.
 */
export function matchingOptions(q: Pick<QuestionCoreFields, 'matchingPairs'>): { left: string[]; right: string[] } {
  const filled = q.matchingPairs.filter((p) => p.left.trim() && p.right.trim());
  return {
    left: filled.map((p) => p.left.trim()),
    right: filled.map((p) => p.right.trim()),
  };
}

/**
 * Savol yaroqli hisoblanishi uchun: matn bo'lishi, va turiga qarab yoki
 * to'g'ri javob (correctAnswer), yoki FILL_BLANK uchun har bir bo'shliqqa
 * kamida bitta qabul qilinadigan javob, yoki MATCHING uchun kamida 2 ta
 * to'liq (chap+o'ng) juftlik to'ldirilgan bo'lishi kerak.
 */
export function isQuestionValid(q: QuestionCoreFields): boolean {
  if (!q.text) return false;
  if (q.type === 'FILL_BLANK') {
    const blankCount = countFillBlanks(q.text);
    if (blankCount === 0) return false;
    for (let i = 0; i < blankCount; i++) {
      if (!(q.blankAnswers[i] || '').trim()) return false;
    }
    return true;
  }
  if (q.type === 'MATCHING') {
    const filled = q.matchingPairs.filter((p) => p.left.trim() && p.right.trim());
    return filled.length >= 2;
  }
  return !!q.correctAnswer;
}

/**
 * Bitta savolni Savollar bazasi (BankQuestion) API kutayotgan formatga
 * o'giradi — test yaratish sahifasidagi yakka/ko'p saqlash tugmalari va
 * savollar bazasi sahifasi bir xil mapping'dan foydalanadi.
 */
export function mapQuestionForBank(q: QuestionCoreFields, subjectId: string) {
  const isFillBlank = q.type === 'FILL_BLANK';
  const isMatching = q.type === 'MATCHING';
  return {
    subjectId,
    text: q.text,
    images: q.images,
    options: isMatching ? matchingOptions(q) : (q.type === 'OPEN_ENDED' || isFillBlank) ? [] : q.options.filter((o) => o.text),
    correctAnswer: isFillBlank ? fillBlankCorrectAnswer(q) : isMatching ? '' : q.correctAnswer,
    type: q.type,
    explanation: q.explanation || null,
    explanationImages: q.explanationImages,
    topic: q.topic || null,
    bloomLevel: q.bloomLevel || null,
    difficulty: q.difficulty || null,
  };
}

/**
 * Server qaytargan savol ID larini holat ro'yxatiga qaytaradi.
 *
 * Nega kerak: create sahifasi ilgari ID larni umuman saqlamasdi, shuning uchun
 * har saqlashda savollar o'chirilib qaytadan yaratilardi va yangi ID lar
 * `TestResult.answers` dagi `questionId` bog'lanishini uzardi — nashr qilingan
 * testda o'quvchilar natijalari buzilardi.
 *
 * Moslashtirish `order` bo'yicha, javob tartibi bo'yicha EMAS: saqlashga faqat
 * yaroqli (`isQuestionValid`) savollar ketadi va dublikatlar tashlab
 * yuborilishi mumkin, shuning uchun yuborilgan ro'yxat indeksi holat indeksiga
 * teng emas. `sentOriginalIndexes[i]` — yuborilgan ro'yxatning `i`-savoli
 * holatda qaysi indeksda turganini aytadi.
 */
export function applyServerQuestionIds<T extends { id?: string }>(
  questions: T[],
  sentOriginalIndexes: number[],
  serverQuestions: { id: string; order: number }[],
): T[] {
  const idByOrder = new Map<number, string>();
  for (const q of serverQuestions) {
    if (typeof q?.id === 'string' && Number.isInteger(q?.order)) idByOrder.set(q.order, q.id);
  }
  if (idByOrder.size === 0) return questions;

  const idByStateIndex = new Map<number, string>();
  sentOriginalIndexes.forEach((stateIndex, sentIndex) => {
    const id = idByOrder.get(sentIndex);
    if (id !== undefined) idByStateIndex.set(stateIndex, id);
  });
  if (idByStateIndex.size === 0) return questions;

  return questions.map((q, i) => {
    const id = idByStateIndex.get(i);
    return id === undefined || q.id === id ? q : { ...q, id };
  });
}
