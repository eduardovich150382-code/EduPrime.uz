// `returnTo` kabi so'rov parametridan kelgan qaytish manzilini tekshiradi va
// xavfsiz shaklda ulaydi. Kurs darsidagi test (`/tests/[id]/solve`) natija
// sahifasidan qaysi darsga qaytish kerakligini shu orqali uzatadi
// (`courses/[id]/learn` -> `tests/[id]/solve` -> `results/[id]`) —
// foydalanuvchidan kelgan qiymatni yo'naltirishda ishlatishdan oldin HAR
// DOIM shu fayldan o'tkazilsin (ochiq yo'naltirish — open redirect — bo'lmasligi uchun).

// Boshqaruv belgilari (kod nuqtasi 0x00-0x1F yoki 0x7F, ya'ni \n \r \t va
// h.k.) — literal holda ("/\n//evil.com") ham, foiz-kodlangan holda
// ("/%0A//evil.com") ham olib tashlanadi. Brauzerlar URL'dan LITERAL
// boshqaruv belgilarini avtomatik olib tashlaydi (WHATWG URL spec) —
// shuning uchun "/\n//evil.com" aslida "//evil.com" (ochiq yo'naltirish)
// bo'lib qoladi. Foiz-kodlangan shakl esa boshqa qatlamda (masalan qayta
// dekodlanganda) xuddi shu natijaga olib kelishi mumkin, shuning uchun
// prefiks tekshiruvlaridan OLDIN ikkalasi ham olib tashlanadi.
const CONTROL_CHAR_OR_ENCODED_PATTERN = '%(0[0-9A-Fa-f]|1[0-9A-Fa-f]|7[Ff])|[\\x00-\\x1F\\x7F]';
const CONTROL_CHAR_OR_ENCODED = new RegExp(CONTROL_CHAR_OR_ENCODED_PATTERN, 'g');

/**
 * Faqat ICHKI, saytning o'z manzili qabul qilinadi: bitta "/" bilan
 * boshlanishi kerak. Quyidagilar rad etiladi (`null` qaytariladi):
 * - "/" bilan boshlanmagan har qanday qiymat (tashqi URL — `https://...`,
 *   `javascript:`, `mailto:` va h.k. — bularning hech biri "/" bilan
 *   boshlanmaydi)
 * - "//evil.com" — protokol-nisbiy URL, klassik ochiq yo'naltirish vektori
 *   (boshqaruv belgilari olib tashlangandan KEYIN ham tekshiriladi)
 * - "/\evil.com" yoki "\evil.com" — ba'zi brauzerlar teskari qiya
 *   chiziqni to'g'ri qiya chiziqqa aylantirib, yuqoridagi bilan bir xil
 *   natijaga olib keladi
 *
 * Qaytarilgan qiymat — boshqaruv belgilaridan tozalangan (asl emas);
 * chaqiruvchi shu TOZALANGAN qiymatdan foydalansin.
 */
export function sanitizeReturnPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.replace(CONTROL_CHAR_OR_ENCODED, '');
  const trimmed = cleaned.trim();
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

const DEFAULT_LOGIN_CALLBACK = '/dashboard';

/** Login sahifasi yozadi, telegram-callback o'qiydi va o'chiradi. */
export const LOGIN_CALLBACK_STORAGE_KEY = 'loginCallbackUrl';

/**
 * Login sahifasidagi `callbackUrl` (middleware himoyalangan sahifadan
 * yuborganda qo'yadi) — kirishdan keyin qayerga qaytish. NextAuth o'zi ham
 * tashqi manzilni rad etadi, lekin Telegram oqimida qiymat localStorage
 * orqali o'tadi, shuning uchun ikkala joyda ham shu tekshiruv ishlatiladi.
 */
export function resolveLoginCallback(value: string | null | undefined): string {
  return sanitizeReturnPath(value) ?? DEFAULT_LOGIN_CALLBACK;
}

/**
 * callbackUrl locale prefiksli bo'lsin (middleware ham shunday qo'yadi),
 * aks holda ruscha sahifadan kirgan mehmon o'zbekcha sahifaga qaytardi.
 * `uz` — asosiy til, `as-needed` routing'da prefikssiz.
 */
export function localizedPath(path: string, locale: string): string {
  return locale === 'uz' ? path : `/${locale}${path}`;
}

/**
 * "Kirish" havolasi: mehmon kirgach turgan sahifasiga qaytadi. Bosh sahifa
 * va login'ning o'zida parametr qo'shilmaydi — u yerdan qaytishning ma'nosi
 * yo'q, standart `/dashboard` to'g'riroq.
 */
export function loginHref(currentPath: string | null | undefined): string {
  const safe = sanitizeReturnPath(currentPath);
  if (!safe || /^\/((uz|ru|en)\/?)?$/.test(safe) || /^\/((uz|ru|en)\/)?login(\/|$|\?)/.test(safe)) {
    return '/login';
  }
  return `/login?callbackUrl=${encodeURIComponent(safe)}`;
}
