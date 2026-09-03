/**
 * EMBED dars bloki uchun ruxsat etilgan tashqi domenlar — S22b.
 *
 * PhET (phet.colorado.edu) ATAYLAB ro'yxatda YO'Q: litsenziya sahifasi
 * (https://phet.colorado.edu/en/licensing/html) faqat 2026-03-29 gacha
 * chiqarilgan ("Historical") simulyatsiyalarni tijorat maqsadida bepul
 * ishlatishga ruxsat beradi; shu sanadan keyin chiqarilgan simulyatsiyalar
 * uchun shartlar alohida (avtomatik o'qib bo'lmaydigan) sahifada va aniq
 * emas. Bizning kurslarimiz pullik sotilgani va domen darajasida qaysi
 * simulyatsiya "eski" qaysi "yangi" ekanini bu yerda ajratib bo'lmagani
 * sababli — butun domen ruxsat ro'yxatidan chetlatildi (xavfsiz tomonga
 * xato qilish). Aniqlik kiritilsa, alohida PR'da qo'shiladi.
 */
export const EMBED_ALLOWED_DOMAINS = ['geogebra.org', 'desmos.com'] as const;

/**
 * `url` https bo'lgan va ruxsat etilgan domenlardan (yoki ularning istalgan
 * subdomenidan) bo'lgandagina `true`. Sof funksiya — na DOM, na tarmoqqa
 * bormaydi, shuning uchun tahrirlagichda (client) VA saqlash marshrutida
 * (server) AYNAN shu funksiya ishlatiladi — ikkalasi hech qachon farq
 * qilmaydi. `javascript:`, `data:`, oddiy `http:` va noto'g'ri URL — hammasi
 * `false`.
 */
export function isAllowedEmbedUrl(url: string): boolean {
  if (typeof url !== 'string' || !url.trim()) return false;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') return false;

  const hostname = parsed.hostname.toLowerCase();
  return EMBED_ALLOWED_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}
