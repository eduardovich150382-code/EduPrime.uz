import { randomBytes } from 'crypto';

// Promokod: 8 belgi, adashtiriladigan 0/O va 1/I yo'q — kurs admini kodni
// telefondan o'qib, qo'lda yozganda xato qilmasin. Alifbo 32 belgi: bayt & 31
// har belgini teng ehtimol bilan beradi (256 ga bo'linadi — siljish yo'q).

export const PROMO_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const PROMO_LENGTH = 8;

export function generatePromoCode(): string {
  const bytes = randomBytes(PROMO_LENGTH);
  let code = '';
  for (const byte of bytes) code += PROMO_ALPHABET[byte & 31];
  return code;
}

/** Bir partiyada takrorlanmaydi (bazadagi to'qnashuv — P2002, chaqiruvchi butun partiyani qayta yaratadi). */
export function generatePromoCodes(count: number): string[] {
  const codes = new Set<string>();
  while (codes.size < count) codes.add(generatePromoCode());
  return [...codes];
}

/** Admin yoki kurs admini yozgan kod: bo'shliq va chiziqcha olib tashlanadi, katta harf. */
export function normalizePromoInput(input: string): string {
  return input.replace(/[\s-]+/g, '').toUpperCase();
}
