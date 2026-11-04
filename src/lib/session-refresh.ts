// Sessiya cookie'sini fonda uzaytirish qarori — `SessionProvider` dagi
// effektdan ajratilgan sof funksiya, DOM'siz testlanishi uchun.

export const SESSION_REFRESHED_AT_KEY = 'authSessionRefreshedAt';

// JWT maxAge 24 soat (`lib/auth.ts`). 6 soat — kun davomida bir necha marta
// kirgan foydalanuvchi cookie'si har doim kamida 18 soat zaxira bilan
// uzayib turadi, so'rovlar esa sahifa ko'rishlariga qaraganda juda kam.
export const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * `last` — oxirgi fon yangilanishi (ms), bo'lmasa `null`. Noto'g'ri qiymat
 * (NaN, kelajakdagi vaqt — soat o'zgargan) yangilashga olib keladi: shubhali
 * holatda bitta ortiqcha so'rov chiqib ketishdan arzon.
 */
export function shouldRefreshSession(last: number | null, now: number): boolean {
  if (last === null || !Number.isFinite(last) || last > now) return true;
  return now - last >= REFRESH_INTERVAL_MS;
}
