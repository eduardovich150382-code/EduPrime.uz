/**
 * FILL_BLANK savol turi uchun umumiy yordamchi funksiyalar. Savol matnida
 * bo'shliqlar "___" (uchta pastki chiziqcha) bilan belgilanadi — raqamlash
 * shart emas, matndagi tartib bo'yicha 1-, 2-, 3-bo'shliq deb hisoblanadi.
 *
 * Format:
 * - Question.correctAnswer: JSON string[][] — har bir bo'shliq uchun qabul
 *   qilinadigan javoblar ro'yxati (sinonim/imlo variantlari).
 * - Talaba javobi (TestResult.answers[].answer): JSON string[] — bo'shliq
 *   tartibida kiritilgan qiymatlar.
 *
 * Bu fayl server (submit route) va mijoz (savol qurish/yechish/natija
 * sahifalari) tomonidan bir xil ishlatiladi — write/read format mos
 * kelmasligi xavfini yo'q qilish uchun yagona joyda saqlanadi.
 */

export const FILL_BLANK_MARKER = '___';

export function splitFillBlankText(text: string): string[] {
  return text.split(FILL_BLANK_MARKER);
}

export function countFillBlanks(text: string): number {
  return splitFillBlankText(text).length - 1;
}

export function encodeFillBlankCorrectAnswer(perBlankAccepted: string[][]): string {
  return JSON.stringify(perBlankAccepted);
}

export function parseFillBlankCorrectAnswer(correctAnswer: string | null | undefined): string[][] {
  if (!correctAnswer) return [];
  try {
    const parsed = JSON.parse(correctAnswer);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((a) => (Array.isArray(a) ? a.filter((x) => typeof x === 'string') : []));
  } catch {
    return [];
  }
}

export function encodeFillBlankAnswer(blanks: string[]): string {
  return JSON.stringify(blanks);
}

export function parseFillBlankAnswer(answer: string | null | undefined): string[] {
  if (!answer) return [];
  try {
    const parsed = JSON.parse(answer);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x) => (typeof x === 'string' ? x : ''));
  } catch {
    return [];
  }
}

export function isFillBlankIndexCorrect(userBlanks: string[], acceptedPerBlank: string[][], index: number): boolean {
  const accepted = acceptedPerBlank[index] || [];
  const val = (userBlanks[index] || '').trim().toLowerCase();
  if (!val || accepted.length === 0) return false;
  return accepted.some((a) => a.trim().toLowerCase() === val);
}

export function isFillBlankCorrect(userBlanks: string[], acceptedPerBlank: string[][]): boolean {
  if (acceptedPerBlank.length === 0) return false;
  return acceptedPerBlank.every((_, i) => isFillBlankIndexCorrect(userBlanks, acceptedPerBlank, i));
}
