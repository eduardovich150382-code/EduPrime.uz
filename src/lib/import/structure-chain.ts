import { isRateLimit, RateLimitedError } from './structure-error';
import type { Caller } from './structure';

/**
 * Model zanjiri — bepul tarifda ishlash uchun.
 *
 * Gemini bepul tarifida kunlik chegara (RPD) HAR MODELGA alohida beriladi:
 * Flash modeli ~20 so'rov, Flash-Lite ~500. Bitta model bilan kuniga 20 savol
 * strukturalanardi — platforma yaroqsiz. Zanjir bir model kvotasi tugagach
 * keyingisiga o'tadi va kunlik imkoniyat modellar yig'indisiga aylanadi.
 *
 * Fayl SOF: SDK ham, tarmoq ham yo'q — chaqiruvchi ineksiya qilinadi, shuning
 * uchun testi mock'siz ishlaydi (`structure-model.ts` faqat Gemini chaqiruvini
 * yasaydi).
 */

/** `IMPORT_GEMINI_MODELS` berilmaganda ishlatiladigan yagona model. */
export const DEFAULT_STRUCTURE_MODEL = 'gemini-3.5-flash';

/**
 * `IMPORT_GEMINI_MODELS` ni o'qiydi — vergul bilan ajratilgan ro'yxat.
 *
 * TARTIB MUHIM: birinchi model birinchi sinaladi, shuning uchun ro'yxat boshiga
 * kunlik chegarasi eng katta model qo'yiladi.
 *
 * `parseStructureConcurrency` (./structure-error) bilan bir xil naqsh: env'ni
 * o'zi o'qimaydi, satr qabul qiladi — testi `process.env` ga tegmaydi. Bo'sh
 * elementlar tashlanadi va ro'yxat bo'sh chiqsa standartga qaytiladi: sozlama
 * xatosi tufayli import butunlay to'xtab qolmasin.
 */
export function parseStructureModels(raw: string | undefined): string[] {
  if (raw === undefined) return [DEFAULT_STRUCTURE_MODEL];
  const models = raw
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  return models.length > 0 ? models : [DEFAULT_STRUCTURE_MODEL];
}

export const STRUCTURE_MODELS = parseStructureModels(process.env.IMPORT_GEMINI_MODELS);

/**
 * Zanjir bo'ylab chaqiradigan `ModelCaller` yasaydi.
 *
 * 429 (kvota) kelsa KUTMASDAN keyingi modelga o'tiladi — kutishning foydasi
 * yo'q, chegara kunlik. Boshqa xatolar (400, sxema, buzilgan JSON, timeout)
 * modelga bog'liq emas, shuning uchun ular o'sha zahoti tashqariga otiladi va
 * zanjir keyingi modelga tegmaydi.
 *
 * Kvota tugagan model SHU CHAQIRUVCHI umrida (ya'ni bitta HTTP so'rov
 * davomida) boshqa chaqirilmaydi: aks holda har blok uchun qaytadan urinib,
 * vaqt byudjetini va chegarani bekorga yeyardi.
 *
 * Hamma model tugagan bo'lsa `RateLimitedError` otiladi — u yiqilish emas,
 * marshrut blokni tegmasdan keyingi kunga qoldiradi.
 */
export function createChainedCaller<TInput>(
  models: readonly string[],
  make: (model: string) => Caller<TInput>,
): Caller<TInput> {
  const exhausted = new Set<string>();
  // Chaqiruvchilar keshlanadi: har blok uchun yangi SDK obyekti yasash ham
  // ortiqcha, ham modelga bog'langan keshni (masalan rasm keshi) yo'qotardi.
  const callers = new Map<string, Caller<TInput>>();

  const callerFor = (model: string): Caller<TInput> => {
    const hit = callers.get(model);
    if (hit) return hit;
    const caller = make(model);
    callers.set(model, caller);
    return caller;
  };

  return async (input, signal) => {
    let lastError: unknown = new RateLimitedError();

    for (const model of models) {
      if (exhausted.has(model)) continue;
      try {
        const result = await callerFor(model)(input, signal);
        // Qaysi model javob berganini natija olib ketadi: u `raw.model` ga
        // yoziladi va sifatni modellar kesimida taqqoslash imkonini beradi.
        return { ...result, model };
      } catch (error) {
        if (!isRateLimit(error)) throw error;
        exhausted.add(model);
        lastError = error;
      }
    }

    throw new RateLimitedError(undefined, { cause: lastError });
  };
}
