// middleware'ning "kim login talab qiladi" qarori — Next runtime'siz
// (Vitest'da) tekshirilishi uchun alohida sof funksiyada.

// Shu prefikslar ostidagi hamma narsa login talab qiladi.
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/courses',
  '/results',
  '/rating',
  '/profile',
  '/pricing',
  '/teacher',
  '/admin',
];

// /tests ro'yxati mehmonga ochiq ((public) guruhi), lekin uning ichidagi
// har bir yo'l — /tests/<id>/solve va kelajakdagilari — yopiq: savol matni
// pullik mahsulot. Shuning uchun `startsWith('/tests')` emas, aniq ajratish.
const TESTS_LIST = '/tests';

export function getCleanPath(pathname: string): string {
  // Middleware'ga query kelmaydi, lekin funksiya to'liq URL qismi bilan
  // chaqirilsa ham `?type=...` qarorni o'zgartirmasin.
  const path = pathname.split(/[?#]/, 1)[0];
  return path.replace(/^\/(uz|ru|en)(?=\/|$)/, '') || '/';
}

export function isProtectedPath(pathname: string): boolean {
  const cleanPath = getCleanPath(pathname);
  if (cleanPath === TESTS_LIST || cleanPath === `${TESTS_LIST}/`) return false;
  if (cleanPath.startsWith(`${TESTS_LIST}/`)) return true;
  return PROTECTED_PREFIXES.some((prefix) => cleanPath.startsWith(prefix));
}
