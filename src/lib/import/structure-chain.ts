import { logger } from '@/lib/logger';
import { isModelNotFound, isRateLimit, RateLimitedError } from './structure-error';
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
export function parseStructureModels(
  raw: string | undefined,
  fallback: readonly string[] = [DEFAULT_STRUCTURE_MODEL],
): string[] {
  // Standart ro'yxat chaqiruvchiga bog'liq: strukturalash bitta model bilan
  // boshlanadi, AI import (`gemini.ts`) esa uzun zanjir bilan.
  if (raw === undefined) return [...fallback];
  const models = raw
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  return models.length > 0 ? models : [...fallback];
}

export const STRUCTURE_MODELS = parseStructureModels(process.env.IMPORT_GEMINI_MODELS);

/**
 * Zanjir bo'ylab chaqiradigan `ModelCaller` yasaydi.
 *
 * 429 (kvota) kelsa KUTMASDAN keyingi modelga o'tiladi — kutishning foydasi
 * yo'q, chegara kunlik. Model API da TOPILMASA (404 / `NOT_FOUND`) ham
 * o'tiladi: aks holda ro'yxatdagi bitta noto'g'ri nom butun zanjirni ishdan
 * chiqarardi. Boshqa xatolar (oddiy 400, sxema, buzilgan JSON, timeout)
 * haqiqiy nosozlik — ular o'sha zahoti tashqariga otiladi, zanjir ularni
 * yashirmaydi.
 *
 * Kvotasi tugagan yoki topilmagan model SHU CHAQIRUVCHI umrida (ya'ni bitta
 * HTTP so'rov davomida) boshqa chaqirilmaydi: aks holda har blok uchun
 * qaytadan urinib, vaqt byudjetini va chegarani bekorga yeyardi.
 *
 * Zanjir tugaganda kamida bitta model 429 bergan bo'lsa `RateLimitedError`
 * otiladi — u yiqilish emas, marshrut blokni keyingi kunga qoldiradi. Hech
 * biri 429 bermagan (hamma nom topilmagan) bo'lsa asl xato otiladi: bu kvota
 * emas, sozlama xatosi — uni "ertaga tiklanadi" deb ko'rsatish yolg'on
 * bo'lardi va bloklar abadiy kechiktirilardi.
 */
export function createChainedCaller<TInput>(
  models: readonly string[],
  make: (model: string) => Caller<TInput>,
): Caller<TInput> {
  const exhausted = new Set<string>();
  // Oxirgi xatolar chaqiruvchi umri bo'yi saqlanadi: keyingi blokda hamma
  // model allaqachon belgilangan bo'lsa ham, zanjir NIMA sababdan tugagani
  // (kvota yoki noto'g'ri nom) yo'qolmasin.
  let lastRateLimit: unknown;
  let lastNotFound: unknown;
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
    for (const model of models) {
      if (exhausted.has(model)) continue;
      try {
        const result = await callerFor(model)(input, signal);
        // Qaysi model javob berganini natija olib ketadi: u `raw.model` ga
        // yoziladi va sifatni modellar kesimida taqqoslash imkonini beradi.
        return { ...result, model };
      } catch (error) {
        if (isRateLimit(error)) {
          lastRateLimit = error;
        } else if (isModelNotFound(error)) {
          // Sokin o'tib ketilmaydi: noto'g'ri nom env'da tuzatilishi kerak.
          // Model shu chaqiruvchida bir marta belgilanadi, log ham bir marta.
          logger.warn("[model-chain] model topilmadi, keyingisiga o'tildi", { model });
          lastNotFound = error;
        } else {
          throw error;
        }
        exhausted.add(model);
      }
    }

    // Kvota ustun: bitta model 429 bergan bo'lsa ham zanjir ertaga tiklanadi.
    if (lastRateLimit === undefined && lastNotFound !== undefined) throw lastNotFound;
    throw new RateLimitedError(undefined, { cause: lastRateLimit });
  };
}
