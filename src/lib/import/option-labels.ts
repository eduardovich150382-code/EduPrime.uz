/**
 * Variant yorliqlari (A, B, C…) va ularning chegaralari.
 *
 * `image-token.ts` kabi LEAF modul: importi yo'q, shuning uchun server
 * oqimi (`chat-apply.ts`) ham, klient (JSON qo'yish rejimi) ham bir xil
 * qoidani ishlatadi. Ikki nusxa vaqt o'tib bir-biridan uzoqlashardi.
 */

/** Variantlarning eng kam va eng ko'p soni — A dan H gacha. */
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 8;

/** Bo'sh savol ochilganda qo'yiladigan yorliqlar. */
export const DEFAULT_OPTION_LABELS: readonly string[] = ['A', 'B', 'C', 'D'];

/**
 * Indeksdan yorliq. Yorliq modeldan SO'RALMAYDI — u variantlar tartibidan
 * deterministik kelib chiqadi, modeldan kam narsa so'ralsa u kam xato qiladi.
 */
export function optionLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

/**
 * Yorliqdan 0-asosli indeks. Bitta harf bo'lmasa `-1` — chaqiruvchi buni
 * "javob yaroqsiz" deb talqin qiladi.
 */
export function labelToIndex(answer: string): number {
  const letter = answer.trim().toUpperCase();
  if (letter.length !== 1) return -1;
  const index = letter.charCodeAt(0) - 65;
  return index >= 0 && index < 26 ? index : -1;
}
