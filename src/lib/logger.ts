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

// Maxfiy qiymat har doim ham alohida kalitda kelmaydi: Prisma ulanish xatosi
// `message` ichida to'liq DSN'ni (`postgresql://user:parol@host:5432/db`)
// olib keladi, tashqi API xatolari esa `Authorization` sarlavhasini yoki
// so'rov qatorini xato matniga qo'shib yuboradi. Kalit nomiga qarab tozalash
// bularni ushlamaydi, shuning uchun matnning o'zi ham naqshlar bo'yicha
// tekshiriladi.
const REDACTION_PATTERNS: ReadonlyArray<[RegExp, string]> = [
  // Ulanish satrlari — DSN ichida foydalanuvchi nomi va parol bo'ladi.
  [/\b(postgres(ql)?|mysql|mongodb(\+srv)?|redis|amqp):\/\/[^\s"'`]+/gi, '[redacted-dsn]'],
  // `Authorization: Bearer <token>` — sarlavha matn sifatida tushib qolishi mumkin.
  [/\bBearer\s+[A-Za-z0-9._~+\/=-]{8,}/gi, 'Bearer [redacted]'],
  // So'rov qatoridagi maxfiy parametrlar; kalit nomi saqlanadi, qiymati emas —
  // xatoni o'qiyotgan odam qaysi parametr borligini bilsin.
  [/([?&](?:token|key|api_?key|secret|password|access_token)=)[^&\s]+/gi, '$1[redacted]'],
];

/**
 * Erkin matndan (xato xabari, stack trace, log satri) maxfiy qiymatlarni
 * naqsh bo'yicha o'chiradi. Test uchun alohida eksport qilingan.
 */
export function redactSecrets(text: string): string {
  let result = text;
  for (const [pattern, replacement] of REDACTION_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

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
    // Har qanday string — `message` va `stack` ham shu yerdan o'tadi, chunki
    // ular oddiy string maydonlar.
    if (typeof value === 'string') return redactSecrets(value);
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

// Logger'dan o'tmaydigan xatolar ham bor: `onRequestError` Server Component
// va route handler'lardagi tutilmagan xatolarni to'g'ridan-to'g'ri Sentry'ga
// yuboradi. Shuning uchun tozalash SDK'ning `beforeSend` bosqichida ham
// takrorlanadi — bu oxirgi to'siq, undan keyin ma'lumot tashqariga chiqadi.
type RedactableEvent = {
  message?: unknown;
  exception?: { values?: Array<{ value?: unknown } | null | undefined> | null } | null;
  extra?: LogContext | null;
  // `request` va `breadcrumbs` ni SDK o'zi ilib qo'yadi — kodimizdan
  // o'tmaydi, shuning uchun logger'ning tozalashi ularga tegmaydi.
  request?: { url?: unknown; query_string?: unknown; data?: unknown } | null;
  breadcrumbs?: Array<{ message?: unknown; data?: LogContext | null } | null | undefined> | null;
};

/**
 * Sentry hodisasining erkin matnli maydonlarini — `message`, exception
 * qiymatlari, `extra`, so'rov URL/query/tanasi va breadcrumb'lar — joyida
 * tozalaydi va o'sha hodisani qaytaradi. `beforeSend` uchun mo'ljallangan,
 * test uchun eksport.
 */
export function redactEvent<T extends RedactableEvent>(event: T): T {
  if (typeof event.message === 'string') {
    event.message = redactSecrets(event.message);
  }

  const values = event.exception?.values;
  if (Array.isArray(values)) {
    for (const value of values) {
      if (value && typeof value.value === 'string') {
        value.value = redactSecrets(value.value);
      }
    }
  }

  if (event.extra) {
    event.extra = sanitizeContext(event.extra);
  }

  // So'rov qatoridagi maxfiy parametrlar aynan shu yerda bo'ladi: SDK
  // hodisaga to'liq URL va `query_string` ni avtomatik qo'shadi.
  const request = event.request;
  if (request) {
    if (typeof request.url === 'string') {
      request.url = redactSecrets(request.url);
    }
    // `query_string` ajratuvchisiz keladi (`token=abc&lang=uz`), naqsh esa
    // `?` yoki `&` dan boshlanadi — shuning uchun vaqtincha `?` qo'shamiz.
    if (typeof request.query_string === 'string') {
      request.query_string = redactSecrets(`?${request.query_string}`).slice(1);
    }
    // Faqat string tanani tozalaymiz; parse qilingan obyekt tana bu yerga
    // kalit-qiymat ko'rinishida keladi va uni `sanitizeContext` emas, SDK
    // sozlamalari boshqaradi.
    if (typeof request.data === 'string') {
      request.data = redactSecrets(request.data);
    }
  }

  // Fetch va console izlari. Klient sahifalaridagi tozalanmagan
  // `console.error` lar Sentry'ga aynan shu yo'l bilan tushadi.
  const breadcrumbs = event.breadcrumbs;
  if (Array.isArray(breadcrumbs)) {
    for (const crumb of breadcrumbs) {
      if (!crumb) continue;
      if (typeof crumb.message === 'string') {
        crumb.message = redactSecrets(crumb.message);
      }
      if (crumb.data) {
        crumb.data = sanitizeContext(crumb.data);
      }
    }
  }

  return event;
}

// DSN berilmagan bo'lsa Sentry umuman ishga tushirilmaydi (client
// yaratilmaydi) — lokal ishlab chiqish va CI aynan shu holatda ishlaydi.
// `Sentry.getClient()` shuni tekshirishning eng ishonchli usuli: env
// o'zgaruvchisini qayta o'qish emas, SDK haqiqatan sozlanganini bildiradi.
function isSentryEnabled(): boolean {
  return Sentry.getClient() !== undefined;
}

/**
 * Kontekstdan Sentry teglarini ajratib oladi.
 *
 * Teg — Sentry'da filtrlanadigan maydon, `extra` esa faqat o'qish uchun.
 * `jobId`, `order`, `attempt` kabi qiymatlar aynan filtrlash uchun kerak,
 * shuning uchun ular alohida `tags` kalitida beriladi va `extra` ga
 * TAKRORLANMAYDI.
 */
function extractTags(context?: LogContext): Record<string, string> | undefined {
  const raw = context?.tags;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;

  const tags: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value === null || value === undefined) continue;
    // Sentry teg qiymati faqat string bo'ladi; obyekt yuborilsa "[object
    // Object]" bo'lib qolardi, shuning uchun ular umuman o'tkazilmaydi.
    if (typeof value === 'object') continue;
    tags[key] = redactSecrets(String(value));
  }
  return Object.keys(tags).length > 0 ? tags : undefined;
}

/** Berilgan xizmat kalitlarisiz nusxa — asl kontekst o'zgarmaydi. */
function omit(context: LogContext, keys: readonly string[]): LogContext {
  const result: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (keys.includes(key)) continue;
    result[key] = value;
  }
  return result;
}

function report(message: string, context: LogContext | undefined, level: 'error' | 'warning'): void {
  if (!isSentryEnabled()) return;

  // Kontekstdagi haqiqiy `Error` Sentry'da stack trace va guruhlash beradi,
  // shuning uchun uni xabar sifatida emas, exception sifatida yuboramiz.
  const cause = context?.error;
  const tags = extractTags(context);
  const extra = context ? sanitizeContext(omit(context, ['tags', 'report'])) : undefined;

  if (cause instanceof Error) {
    // `logMessage` deb nomlangan: kontekstda `message` kaliti bo'lsa
    // (masalan serializatsiya qilingan xatoning o'z xabari) log satri
    // bosilib ketmasin.
    Sentry.captureException(cause, { level, tags, extra: { ...extra, logMessage: message } });
  } else {
    Sentry.captureMessage(message, { level, tags, extra });
  }
}

function emit(
  level: 'info' | 'warn' | 'error',
  message: string,
  context?: LogContext,
): void {
  // `report` — Sentry uchun boshqaruv bayrog'i, log satrida ma'nosi yo'q.
  // `tags` esa QOLDIRILADI: Vercel logi hamon birinchi qarash joyi va
  // `jobId`/`order` aynan o'sha yerda kerak bo'ladi.
  const safeContext = context ? sanitizeContext(omit(context, ['report'])) : undefined;

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
  /**
   * Ogohlantirish — sukut bo'yicha faqat konsolga.
   *
   * Sentry'ga yuborish uchun kontekstda `report: true` bo'lishi SHART.
   * Sababi kvota: loyihadagi barcha `warn` lar avtomatik oqib ketsa bepul
   * tarif bir kunda tugaydi va haqiqiy xatolar shovqin ichida ko'rinmay
   * qoladi. Shuning uchun "bu ogohlantirish keyin tekshiriladi" degan qaror
   * chaqiruv joyida ataylab bildiriladi.
   */
  warn(message: string, context?: LogContext): void {
    emit('warn', message, context);
    if (context?.report === true) report(message, context, 'warning');
  },
  error(message: string, context?: LogContext): void {
    emit('error', message, context);
    report(message, context, 'error');
  },
};
