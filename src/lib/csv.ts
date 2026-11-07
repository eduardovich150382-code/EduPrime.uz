// Excel uchun CSV: UTF-8 BOM (aks holda o'zbek/kirill harflari buziladi),
// ajratuvchi `;` (o'zbek/rus Excel'ida vergul o'nlik belgisi), qator `\r\n`.

export const CSV_BOM = '\uFEFF';
export const CSV_SEPARATOR = ';';

/**
 * Bitta katak. Ajratuvchi, qo'shtirnoq yoki yangi qator bo'lsa qo'shtirnoqqa
 * olinadi, ichki `"` ikkilanadi. `= + - @` (va tab/CR) bilan boshlangan matn
 * Excel'da formula sifatida bajarilmasligi uchun `'` bilan boshlanadi —
 * foydalanuvchi ismi CSV injection vositasi bo'lmasin. Raqamlar o'zgarmaydi.
 */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  let text = value;
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsv(rows: (string | number | null | undefined)[][]): string {
  return CSV_BOM + rows.map((row) => row.map(csvCell).join(CSV_SEPARATOR)).join('\r\n') + '\r\n';
}

/**
 * Fayl nomi uchun lotin slug. O'zbek apostroflari (o', g', ʻ, ʼ) olib
 * tashlanadi — "O'zbekiston" → "ozbekiston". Lotin bo'lmagan nom bo'sh
 * qolsa `fallback` qaytadi.
 */
export function fileSlug(text: string, fallback = 'test', maxLength = 60): string {
  const slug = text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['‘’ʻʼ`]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
  return slug || fallback;
}

/** `Content-Disposition` — ASCII `filename` + to'liq `filename*` (RFC 5987). */
export function attachmentHeader(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
