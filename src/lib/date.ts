// Foydalanuvchilar Asia/Tashkent (UTC+5) da, server esa UTC'da ishlaydi.
// `new Date().toISOString().slice(0, 10)` kabi UTC'ga asoslangan kunlik
// hisob-kitoblar soat 00:00–04:59 (UTC+5) oralig'ida — ya'ni mahalliy
// kunning boshida — hali "kechagi kun"ga yozadi. Kunlik kvota/limit kabi
// har qanday hisob shu faylning `tashkentDateKey` funksiyasi orqali
// o'tishi kerak.

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC+5, DTM mintaqasida yozgi vaqt yo'q

// Brauzerlarning ICU ma'lumotida uz-UZ oy nomlari yo'q — Intl "M11 24"
// beradi (Node to'liq ICU bilan "24-noyabr" beradi, shuning uchun testlar
// buni ko'rmaydi). O'zbekcha sanani shu ro'yxatdan o'zimiz yig'amiz.
const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

/** uz: "24-noyabr" / "24-noyabr, 2026"; ru/en — Intl. Kun Toshkent bo'yicha. */
export function formatTashkentDate(value: Date | string, locale: string, includeYear = false): string {
  if (locale !== 'ru' && locale !== 'en') {
    const [year, month, day] = tashkentDateKey(new Date(value)).split('-').map(Number);
    const date = `${day}-${UZ_MONTHS[month - 1]}`;
    return includeYear ? `${date}, ${year}` : date;
  }
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric', month: 'long', ...(includeYear ? { year: 'numeric' as const } : {}), timeZone: 'Asia/Tashkent',
  }).format(new Date(value));
}

/**
 * Berilgan (yoki joriy) vaqtni Asia/Tashkent mahalliy sanasiga aylantirib,
 * `YYYY-MM-DD` shaklida qaytaradi. Kunlik kvota kalitlari shu qiymatdan
 * tuziladi (masalan `ai_explain_quota_${userId}_${tashkentDateKey()}`).
 */
export function tashkentDateKey(d: Date = new Date()): string {
  const shifted = new Date(d.getTime() + TASHKENT_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * `date`dan `now`gacha (sukut bo'yicha joriy vaqt) o'tgan kunlar soni,
 * kasr qismi bilan. Oylik (30 kunlik) cheklovlarni tekshirish uchun:
 * `daysSince(user.someFreeUsedAt) < 30`.
 */
export function daysSince(date: Date, now: Date = new Date()): number {
  return (now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000);
}

/**
 * `now`dan `daysAgo` kun oldingi Tashkent kalendar kunining [boshlanish,
 * tugash) UTC oralig'ini qaytaradi — masalan "kechagi xatolarim" kabi
 * filtrlar `TestResult.completedAt`ni UTC kun chegarasi bilan emas, shu
 * oraliq bilan solishtirishi kerak (fayl boshidagi izohga qarang).
 * `daysAgo=0` — bugungi Tashkent kuni, `daysAgo=1` — kecha.
 */
export function tashkentDayRangeUtc(daysAgo: number, now: Date = new Date()): { start: Date; end: Date } {
  const shifted = new Date(now.getTime() + TASHKENT_OFFSET_MS);
  const localMidnightUtcMs = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() - daysAgo);
  const start = new Date(localMidnightUtcMs - TASHKENT_OFFSET_MS);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// `YYYY-MM-DD` kalitini UTC yarim tunga aylantiradi. 2026-02-30 kabi
// mavjud bo'lmagan sanani Date jimgina 2-martga suradi — shuning uchun
// qismlar qayta solishtiriladi.
function dateKeyToUtcMs(key: string): number | null {
  const match = DATE_KEY_RE.exec(key.trim());
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const ms = Date.UTC(y, m - 1, d);
  const check = new Date(ms);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return ms;
}

/**
 * Bugungi Tashkent kunidan `dateStr` (`YYYY-MM-DD`) gacha qolgan kalendar
 * kunlar soni: 0 — bugun, 1 — ertaga. Sana o'tgan yoki noto'g'ri bo'lsa
 * `null` — chaqiruvchi hisoblagichni yashiradi. Soatlar farqi emas, kun
 * kalitlari solishtiriladi: aks holda soat 00:30 da "1 kun" o'rniga "0"
 * chiqardi.
 */
export function daysUntil(dateStr: string | null | undefined, now: Date = new Date()): number | null {
  if (!dateStr) return null;
  const target = dateKeyToUtcMs(dateStr);
  const today = dateKeyToUtcMs(tashkentDateKey(now));
  if (target === null || today === null) return null;
  const days = Math.round((target - today) / DAY_MS);
  return days < 0 ? null : days;
}

/**
 * `date` Tashkent kalendari bo'yicha necha kun oldin bo'lgani: 0 — bugun,
 * 1 — kecha. Matn ("Bugun", "Kecha") i18n'da — bu yerda faqat son.
 * Noto'g'ri sana yoki kelajak uchun `null`.
 */
export function tashkentRelativeDay(date: Date | string | number, now: Date = new Date()): number | null {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const then = dateKeyToUtcMs(tashkentDateKey(d));
  const today = dateKeyToUtcMs(tashkentDateKey(now));
  if (then === null || today === null) return null;
  const days = Math.round((today - then) / DAY_MS);
  return days < 0 ? null : days;
}

/**
 * `endDate` gacha qolgan Toshkent kalendar kunlari: 0 — bugun tugaydi,
 * 1 — ertaga, manfiy — allaqachon tugagan. `daysUntil` dan farqi: o'tgan
 * sana uchun `null` emas, son — kartochka "Tugagan" holatini shundan oladi.
 */
export function daysLeft(endDate: Date | string, now: Date = new Date()): number {
  const end = dateKeyToUtcMs(tashkentDateKey(new Date(endDate)));
  const today = dateKeyToUtcMs(tashkentDateKey(now));
  return end === null || today === null ? 0 : Math.round((end - today) / DAY_MS);
}
