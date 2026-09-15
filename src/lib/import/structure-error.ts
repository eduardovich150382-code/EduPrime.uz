import { redactSecrets } from '@/lib/logger';
import type { ModelCaller } from './structure';

/**
 * Strukturalash chaqiruvining nosozliklari — tasniflash, qayta urinish va
 * saqlanadigan shaklga keltirish.
 *
 * Alohida fayl, chunki `structure.ts` prompt va javob tekshiruviga bag'ishlangan
 * va allaqachon 380 satrdan oshgan. Bu yerdagi hamma narsa SOF: tarmoq ham,
 * soat ham ineksiya qilinadi, shuning uchun testlar haqiqiy vaqt kutmaydi.
 */

/**
 * Qayta urinishlar orasidagi kutish (ms).
 *
 * Uch urinish = eng yomon holatda 15 soniya kutish. Marshrutda
 * `maxDuration = 60` shu hisobga qo'yilgan; chaqiruvlar paket ichida parallel
 * ketgani uchun kutish ham parallel kechadi.
 */
export const RETRY_DELAYS = [1000, 4000, 10000] as const;

/**
 * Chaqiruvga qoldiriladigan eng kam vaqt (ms).
 *
 * Byudjetdan shundan kam qolgan bo'lsa yangi chaqiruv boshlanmaydi va kutib
 * qayta urinilmaydi: yarim yo'lda uziladigan chaqiruv na natija beradi, na
 * bepul — Gemini uzilgan chaqiruv uchun ham hisob yozadi.
 */
export const RETRY_RESERVE_MS = 12000;

/**
 * Vaqt byudjeti tugagani uchun bajarilmagan chaqiruv.
 *
 * Bu XATO EMAS, balki "hozir ulgurmaymiz" degani: blok `BLOCK` bosqichida
 * qoladi, `attempts` oshmaydi va keyingi so'rovda yangidan uriniladi. Shu sabab
 * `isRetriableError` uni qayta urinishga arzimaydigan deb belgilaydi — qayta
 * urinish uchun vaqt allaqachon yo'q.
 */
export class TimeBudgetError extends Error {
  constructor(message = 'Vaqt byudjeti tugadi', options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'TimeBudgetError';
  }
}

/** Yiqilish sababining `ImportDraft.raw` ga yoziladigan shakli. */
export interface LastError {
  message: string;
  name: string;
  status?: number;
  at: string;
}

/** Xato xabarining saqlanadigan uzunligi — undan ortig'i qirqiladi. */
const MAX_MESSAGE = 500;

/** Vaqtincha nosozlik belgilari — status yo'q bo'lganda xabar bo'yicha. */
const RETRIABLE_TEXT = /429|RESOURCE_EXHAUSTED|UNAVAILABLE|\b503\b|timed?\s*out|ETIMEDOUT|ECONNRESET|abort/i;

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

/** Xatodagi HTTP status — SDK uni `status` yoki `statusCode` da beradi. */
export function statusOf(error: unknown): number | undefined {
  const record = asRecord(error);
  for (const key of ['status', 'statusCode'] as const) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  const message = asRecord(error).message;
  return typeof message === 'string' ? message : String(error);
}

/**
 * Qayta urinishga ARZIYDIGAN xatolarni ajratadi.
 *
 * Faqat vaqtinchalik nosozliklar: tezlik chegarasi (429 / RESOURCE_EXHAUSTED),
 * xizmatning vaqtincha ishlamasligi (503) va timeout. 400, sxema xatosi yoki
 * buzilgan JSON — qayta urinish bilan tuzalmaydi, faqat pul va vaqt ketadi.
 */
export function isRetriableError(error: unknown): boolean {
  // Vaqt tugagani — qayta urinish bilan tuzalmaydi.
  if (error instanceof TimeBudgetError) return false;

  // Chaqiruv o'z chegarasida uzilgan: `AbortController` `DOMException`
  // ('AbortError') beradi, Gemini SDK esa uni o'z sinfiga o'raydi va nomni
  // yo'qotadi — shuning uchun xabar matni ham tekshiriladi (RETRIABLE_TEXT).
  if (asRecord(error).name === 'AbortError') return true;

  // Status ANIQ bo'lsa, faqat shunga qaraladi: "400 Bad Request ... 503" kabi
  // xabar matni tufayli 400 qayta urinilib ketmasin.
  const status = statusOf(error);
  if (status !== undefined) return status === 429 || status === 503 || status === 504;

  // Buzilgan JSON (`JSON.parse`) — model javobi noto'g'ri, takror foydasiz.
  if (error instanceof SyntaxError) return false;

  // Tarmoq xatolarida sabab `message` da emas, `code` da bo'ladi
  // (`ECONNRESET`, `UND_ERR_CONNECT_TIMEOUT`), shuning uchun ikkalasi ham
  // tekshiriladi.
  const code = asRecord(error).code;
  const haystack = typeof code === 'string' ? `${messageOf(error)} ${code}` : messageOf(error);
  return RETRIABLE_TEXT.test(haystack);
}

const sleepReal = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export interface RetryOptions {
  delays?: readonly number[];
  /** Testda haqiqiy vaqt kutilmasin uchun ineksiya qilinadi. */
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  /** So'rov byudjetidan qolgan vaqt (ms) — berilmasa vaqt cheklanmaydi. */
  remaining?: () => number;
  /** Testda soatni kutmaslik uchun — chaqiruv chegarasining taymeri. */
  setTimer?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimer?: (timer: ReturnType<typeof setTimeout>) => void;
}

/**
 * Chaqiruvchini eksponensial kutish bilan o'raydi.
 *
 * Jitter SHART: bir paketdagi olti chaqiruv birdaniga chegaraga urilsa,
 * jittersiz ular birdaniga qayta urinib, o'sha chegarani yana urardi.
 *
 * MUHIM: bu takrorlar `ImportDraft.raw.attempts` ni OSHIRMAYDI — ular bitta
 * urinish ichidagi ichki qayta urinish. `attempts` ni faqat marshrut, har
 * so'rov uchun bir martadan oshiradi.
 */
export function withRetry(call: ModelCaller, options: RetryOptions = {}): ModelCaller {
  const delays = options.delays ?? RETRY_DELAYS;
  const sleep = options.sleep ?? sleepReal;
  const random = options.random ?? Math.random;
  const remaining = options.remaining;
  const setTimer = options.setTimer ?? setTimeout;
  const clearTimer = options.clearTimer ?? clearTimeout;

  return async (input) => {
    for (let attempt = 0; ; attempt++) {
      // Byudjetdan chaqiruvga qolgan vaqt. Nolga tushgan bo'lsa chaqiruv
      // UMUMAN boshlanmaydi: baribir uzilardi, Gemini esa uzilgan chaqiruv
      // uchun ham pul oladi.
      const budget = (remaining?.() ?? Infinity) - RETRY_RESERVE_MS;
      if (budget <= 0) throw new TimeBudgetError();

      // Har chaqiruvning O'Z chegarasi bor. Faqat to'lqinlar orasida tekshirish
      // yetmaydi: osilib qolgan bitta chaqiruv butun to'lqinni, demak butun
      // funksiyani chegaraga (504) olib borardi.
      const controller = new AbortController();
      const timer = setTimer(() => controller.abort(), Math.min(STRUCTURE_CALL_TIMEOUT_MS, budget));
      try {
        return await call(input, controller.signal);
      } catch (error) {
        if (attempt >= delays.length || !isRetriableError(error)) throw error;
        const delay = Math.round(delays[attempt] * (0.75 + random() * 0.5));
        // Kutishga ham, keyingi chaqiruvga ham vaqt yetmasa — qayta urinilmaydi.
        // Bu yiqilish EMAS: blok tegilmagan holda keyingi so'rovga qoladi.
        if (remaining !== undefined && remaining() < delay + RETRY_RESERVE_MS) {
          throw new TimeBudgetError(undefined, { cause: error });
        }
        await sleep(delay);
      } finally {
        // Taymer ALBATTA tozalanadi — aks holda muvaffaqiyatli chaqiruvdan
        // keyin ham u funksiyani tirik ushlab turardi.
        clearTimer(timer);
      }
    }
  };
}

/**
 * Xatoni `raw.lastError` ga yoziladigan shaklga keltiradi.
 *
 * Xabar `redactSecrets` dan o'tkaziladi: Gemini SDK xatosi so'rov URL'ini,
 * ya'ni `?key=...` ni o'z ichiga oladi va u shundoq bazaga tushib qolardi.
 * Uzunlik cheklanadi — `raw` ustuni savolning o'zi uchun, log uchun emas.
 */
export function toLastError(error: unknown, now: Date = new Date()): LastError {
  const status = statusOf(error);
  return {
    message: redactSecrets(messageOf(error)).slice(0, MAX_MESSAGE),
    name: error instanceof Error ? error.name : typeof error,
    ...(status === undefined ? {} : { status }),
    at: now.toISOString(),
  };
}

/** Paketdagi parallel chaqiruvlar soni — standart qiymat. */
const DEFAULT_CONCURRENCY = 6;

/**
 * `IMPORT_STRUCTURE_CONCURRENCY` ni o'qiydi.
 *
 * `parseDailyImportLimit` (./constants) bilan bir xil naqsh: env'ni o'zi
 * o'qimaydi, satr qabul qiladi — shuning uchun testi `process.env` ga
 * tegmaydi. Noto'g'ri qiymatda yiqilmaydi, standartga qaytadi: sozlama
 * xatosi tufayli import butunlay to'xtab qolmasin.
 */
export function parseStructureConcurrency(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_CONCURRENCY;
  const parsed = Number(raw.trim());
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) return DEFAULT_CONCURRENCY;
  return parsed;
}

export const STRUCTURE_CONCURRENCY = parseStructureConcurrency(process.env.IMPORT_STRUCTURE_CONCURRENCY);

/**
 * Sonli sozlamani o'qiydi — `parseStructureConcurrency` bilan bir xil naqsh:
 * satr qabul qiladi, noto'g'ri qiymatda yiqilmasdan standartga qaytadi.
 */
function parseMs(raw: string | undefined, fallback: number, min: number, max: number): number {
  if (raw === undefined) return fallback;
  const parsed = Number(raw.trim());
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
}

/** Bitta so'rovning vaqt byudjeti — standart qiymat. */
const DEFAULT_DEADLINE_MS = 40000;

/**
 * `IMPORT_STRUCTURE_DEADLINE_MS` ni o'qiydi.
 *
 * Standart 40 s — marshrutdagi `maxDuration = 60` dan xavfsiz masofada: oxirgi
 * to'lqin muddat chizig'idan sal oldin boshlangan bo'lsa ham tugashga va
 * natijalarni bazaga yozishga ulguradi.
 */
export function parseStructureDeadlineMs(raw: string | undefined): number {
  return parseMs(raw, DEFAULT_DEADLINE_MS, 5000, 55000);
}

export const STRUCTURE_DEADLINE_MS = parseStructureDeadlineMs(process.env.IMPORT_STRUCTURE_DEADLINE_MS);

/** Bitta Gemini chaqiruvining chegarasi — standart qiymat. */
const DEFAULT_CALL_TIMEOUT_MS = 25000;

/** `IMPORT_STRUCTURE_CALL_TIMEOUT_MS` ni o'qiydi. */
export function parseStructureCallTimeoutMs(raw: string | undefined): number {
  return parseMs(raw, DEFAULT_CALL_TIMEOUT_MS, 5000, 55000);
}

export const STRUCTURE_CALL_TIMEOUT_MS = parseStructureCallTimeoutMs(
  process.env.IMPORT_STRUCTURE_CALL_TIMEOUT_MS,
);

/** Bitta so'rovda olinadigan blok soni — standart qiymat. */
const DEFAULT_BATCH = 8;

/**
 * `IMPORT_STRUCTURE_BATCH` ni o'qiydi.
 *
 * Asosiy himoya — muddat (`STRUCTURE_DEADLINE_MS`), bu esa qo'shimcha: kichik
 * paket muddatgacha to'liq ishlanadi va klient siklining har aylanmasi
 * ilgarilaganini ko'rsatadi.
 */
export function parseStructureBatch(raw: string | undefined): number {
  return parseMs(raw, DEFAULT_BATCH, 1, 40);
}

export const STRUCTURE_BATCH = parseStructureBatch(process.env.IMPORT_STRUCTURE_BATCH);
