// Foydalanuvchilar Asia/Tashkent (UTC+5) da, server esa UTC'da ishlaydi.
// `new Date().toISOString().slice(0, 10)` kabi UTC'ga asoslangan kunlik
// hisob-kitoblar soat 00:00–04:59 (UTC+5) oralig'ida — ya'ni mahalliy
// kunning boshida — hali "kechagi kun"ga yozadi. Kunlik kvota/limit kabi
// har qanday hisob shu faylning `tashkentDateKey` funksiyasi orqali
// o'tishi kerak.

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC+5, DTM mintaqasida yozgi vaqt yo'q

export function formatTashkentDate(value: Date | string, locale: string, includeYear = false): string {
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : locale === 'en' ? 'en-US' : 'uz-UZ', {
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
