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
const RETRIABLE_TEXT = /429|RESOURCE_EXHAUSTED|UNAVAILABLE|\b503\b|timed?\s*out|ETIMEDOUT|ECONNRESET/i;

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

  return async (input) => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await call(input);
      } catch (error) {
        if (attempt >= delays.length || !isRetriableError(error)) throw error;
        await sleep(Math.round(delays[attempt] * (0.75 + random() * 0.5)));
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
