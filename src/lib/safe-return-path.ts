// `returnTo` kabi so'rov parametridan kelgan qaytish manzilini tekshiradi va
// xavfsiz shaklda ulaydi. Kurs darsidagi test (`/tests/[id]/solve`) natija
// sahifasidan qaysi darsga qaytish kerakligini shu orqali uzatadi
// (`courses/[id]/learn` -> `tests/[id]/solve` -> `results/[id]`) —
// foydalanuvchidan kelgan qiymatni yo'naltirishda ishlatishdan oldin HAR
// DOIM shu fayldan o'tkazilsin (ochiq yo'naltirish — open redirect — bo'lmasligi uchun).

/**
 * Faqat ICHKI, saytning o'z manzili qabul qilinadi: bitta "/" bilan
 * boshlanishi kerak. Quyidagilar rad etiladi (`null` qaytariladi):
 * - "/" bilan boshlanmagan har qanday qiymat (tashqi URL — `https://...`,
 *   `javascript:`, `mailto:` va h.k. — bularning hech biri "/" bilan
 *   boshlanmaydi)
 * - "//evil.com" — protokol-nisbiy URL, klassik ochiq yo'naltirish vektori
 * - "/\evil.com" yoki "\evil.com" — ba'zi brauzerlar teskari qiya
 *   chiziqni to'g'ri qiya chiziqqa aylantirib, yuqoridagi bilan bir xil
 *   natijaga olib keladi
 */
export function sanitizeReturnPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (!trimmed.startsWith('/')) return null;
  if (trimmed.startsWith('//')) return null;
  if (trimmed.startsWith('/\\') || trimmed.startsWith('\\')) return null;
  return trimmed;
}

/**
 * `path`ga tekshirilgan `returnTo`ni so'rov parametri sifatida qo'shadi.
 * `returnTo` xavfsiz bo'lmasa yoki berilmagan bo'lsa, `path` o'zgarishsiz
 * qaytadi (kurs tashqarisidagi oddiy testlarda xatti-harakat shu tarzda
 * o'zgarmay qoladi).
 */
export function withReturnTo(path: string, returnTo: string | null | undefined): string {
  const safe = sanitizeReturnPath(returnTo);
  if (!safe) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}returnTo=${encodeURIComponent(safe)}`;
}
