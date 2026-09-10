import * as Sentry from '@sentry/nextjs';

// Markazlashgan log — `console.error` ni to'g'ridan-to'g'ri chaqirish o'rniga
// shu yerdan o'tkazamiz. Ikkita sabab bor:
//
// 1. Xatolar Vercel loglaridan tashqari Sentry'ga ham tushsin. Vercel log
//    saqlash muddati qisqa va qidiruvi yo'q — prod'da nima buzilganini
//    keyinroq aniqlash imkonsiz bo'lib qolardi.
// 2. Log kontekstiga maxfiy qiymat tushib qolmasin. Route'lardagi xato
//    obyektlari ba'zan so'rov sarlavhalarini, Prisma esa `DATABASE_URL` ni
//    o'z ichiga oladi; Sentry — tashqi xizmat, unga token yoki parol
//    yuborilishi ma'lumot sizishi hisoblanadi.

export type LogContext = Record<string, unknown>;

// Kalit nomining normallashtirilgan (faqat harf/raqam, kichik harf)
// shaklida shu bo'laklardan biri uchrasa, kalit butunlay olib tashlanadi.
// Ajratuvchilarni tashlab yuborish `api_key`, `apiKey`, `X-API-Key` va
// `DATABASE_URL` ni bitta qoida bilan qamrab oladi.
const SENSITIVE_KEY_PARTS = [
  'token',
  'secret',
  'password',
  'authorization',
  'cookie',
  'apikey',
  'databaseurl',
] as const;

// Kalit emas, uning bir qismi tekshiriladi: `accessToken`, `refreshToken`,
// `NEXTAUTH_SECRET` kabi nomlar ham tozalansin. Ortiqcha tozalash xavfsiz,
// yetarlicha tozalamaslik — yo'q.
function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return SENSITIVE_KEY_PARTS.some((part) => normalized.includes(part));
}

// Xatoning `name`/`message`/`stack` idan boshqa maydonlari ko'chirilmaydi —
// kutubxonalar (Prisma, node-fetch) xato obyektiga so'rov konfiguratsiyasini
// ilib qo'yishi mumkin, u yerda esa ulanish satri yoki sarlavhalar bo'ladi.
function serializeError(error: Error): LogContext {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}

const MAX_DEPTH = 6;

function sanitizeValue(value: unknown, seen: WeakSet<object>, depth: number): unknown {
  if (value === null || typeof value !== 'object') {
    // Funksiya va symbol log uchun ma'nosiz, lekin JSON'da yo'qoladi —
    // nima tushib qolganini ko'rsatib qo'yamiz.
    if (typeof value === 'function') return '[Function]';
    if (typeof value === 'symbol') return value.toString();
    if (typeof value === 'bigint') return value.toString();
    return value;
  }

  if (depth > MAX_DEPTH) return '[Max depth]';

  // Halqali havolalar (masalan `req.socket.server`) rekursiyani to'xtatmasa
  // logger'ning o'zi stack overflow bilan yiqilardi.
  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  if (value instanceof Error) {
    return sanitizeValue(serializeError(value), seen, depth + 1);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, seen, depth + 1));
  }

  if (value instanceof Date) return value.toISOString();

  const result: LogContext = {};
  for (const [key, item] of Object.entries(value)) {
    if (isSensitiveKey(key)) continue;
    result[key] = sanitizeValue(item, seen, depth + 1);
  }
  return result;
}

/**
 * Kontekst obyektidan maxfiy kalitlarni (token, secret, password,
 * authorization, cookie, apiKey, DATABASE_URL va ularning variantlarini)
 * ichma-ich olib tashlaydi. Test uchun alohida eksport qilingan.
 */
export function sanitizeContext(context: LogContext): LogContext {
  return sanitizeValue(context, new WeakSet(), 0) as LogContext;
}

// DSN berilmagan bo'lsa Sentry umuman ishga tushirilmaydi (client
// yaratilmaydi) — lokal ishlab chiqish va CI aynan shu holatda ishlaydi.
// `Sentry.getClient()` shuni tekshirishning eng ishonchli usuli: env
// o'zgaruvchisini qayta o'qish emas, SDK haqiqatan sozlanganini bildiradi.
function isSentryEnabled(): boolean {
  return Sentry.getClient() !== undefined;
}

function report(message: string, context?: LogContext): void {
  if (!isSentryEnabled()) return;

  // Kontekstdagi haqiqiy `Error` Sentry'da stack trace va guruhlash beradi,
  // shuning uchun uni xabar sifatida emas, exception sifatida yuboramiz.
  const cause = context?.error;
  const extra = context ? sanitizeContext(context) : undefined;

  if (cause instanceof Error) {
    Sentry.captureException(cause, { level: 'error', extra: { message, ...extra } });
  } else {
    Sentry.captureMessage(message, { level: 'error', extra });
  }
}

function emit(
  level: 'info' | 'warn' | 'error',
  message: string,
  context?: LogContext,
): void {
  const safeContext = context ? sanitizeContext(context) : undefined;

  // Konsolga yozish saqlanadi — Vercel logi hamon birinchi qarash joyi,
  // Sentry uni almashtirmaydi, ustiga qo'shiladi.
  const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (safeContext) sink(message, safeContext);
  else sink(message);
}

export const logger = {
  info(message: string, context?: LogContext): void {
    emit('info', message, context);
  },
  warn(message: string, context?: LogContext): void {
    emit('warn', message, context);
  },
  error(message: string, context?: LogContext): void {
    emit('error', message, context);
    report(message, context);
  },
};
