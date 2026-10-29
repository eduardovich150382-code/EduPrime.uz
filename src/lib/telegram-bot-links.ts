// Bot va sayt o'rtasidagi havolalar — bot (server) ham, /tg sahifasi
// (brauzer) ham ishlatadi, shuning uchun bu yerda server importlari yo'q.

export const BOT_USERNAME = 'EduPrimeuzbot';

/** Bot tugmasidan Mini App: /tg kirish sahifasi foydalanuvchini kiritib `path` ga olib boradi. */
export function miniAppUrl(appUrl: string, path = '/'): string {
  const base = appUrl.replace(/\/+$/, '');
  return path === '/' ? `${base}/tg` : `${base}/tg?to=${encodeURIComponent(path)}`;
}

// t.me/EduPrimeuzbot?startapp=<kalit> — kanal postlari va reklamada
// to'g'ridan-to'g'ri bo'limni ochish uchun. Faqat ro'yxatdagi kalitlar.
const START_TARGETS: Record<string, string> = {
  tests: '/tests',
  attestation: '/attestation',
  pricing: '/pricing',
  rating: '/rating',
  results: '/dashboard',
  dashboard: '/dashboard',
  referral: '/dashboard/referral',
};

export function miniAppStartTarget(startParam: string | null | undefined): string | null {
  return startParam ? START_TARGETS[startParam] ?? null : null;
}

// Do'st taklif havolasi: t.me/EduPrimeuzbot?start=ref_<kod>. Referal kodlari
// `slug-random` ko'rinishida (lib/referral-code.ts) — Telegram start
// parametri ruxsat bergan belgilar ichida.
const REF_PATTERN = /^ref_([a-z0-9-]{3,40})$/;

export function referralStartParameter(code: string): string { return `ref_${code}`; }

export function parseReferralStart(value: string): string | null {
  return REF_PATTERN.exec(value)?.[1] ?? null;
}

// Reklama havolasi: t.me/EduPrimeuzbot?start=ad_<kod>. Kod BotStart.source'ga
// yoziladi va hisobotda guruhlanadi — shuning uchun qat'iy, kichik harfli.
const AD_PATTERN = /^ad_([a-z0-9_-]{1,32})$/;

export function parseAdStart(value: string): string | null {
  return AD_PATTERN.exec(value)?.[1] ?? null;
}

export function botReferralLink(code: string): string {
  return `https://t.me/${BOT_USERNAME}?start=${referralStartParameter(code)}`;
}
