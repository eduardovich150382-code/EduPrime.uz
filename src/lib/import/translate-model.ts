import { GoogleGenerativeAI } from '@google/generative-ai';
import { createChainedCaller, STRUCTURE_MODELS } from './structure-chain';
import { buildTranslatePrompt } from './translate-prompt';
import { TRANSLATE_SCHEMA, type TranslateCaller, type TranslateGroup } from './translate';

/**
 * `TranslateCaller` ning haqiqiy amalga oshirilishi — Gemini chaqiruvi.
 *
 * `translate.ts` dan ALOHIDA fayl: o'sha fayl sof qoladi va testlar SDK'ni
 * mock qilmasdan ishlaydi. Bu yerda esa tarmoq bor — shuning uchun bu faylning
 * o'z testi yo'q, marshrut testlarida mock qilinadi.
 *
 * `structure-model.ts` dan farqi: RASM YO'Q. Tarjimaga sahifa aksi kerak emas
 * (matn allaqachon strukturalangan), shuning uchun na rasm yuklash, na kesh
 * bor — bu har chaqiruvdan minglab tokenni oladi va kunlik kvotani tejaydi.
 */

/** Bitta modelga bog'langan chaqiruvchi — zanjirning bir bo'g'ini. */
function createModelCaller(genAI: GoogleGenerativeAI, modelName: string): TranslateCaller {
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      // Aniqlik kerak, ijod emas: bir xil savol ikki marta bir xil
      // tarjima qilinsin, aks holda qayta urinish boshqa natija berardi.
      temperature: 0,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      responseSchema: TRANSLATE_SCHEMA,
    },
  });

  // `signal` ni `withRetry` beradi: har chaqiruvning o'z vaqt chegarasi bor,
  // shuning uchun osilib qolgan bitta chaqiruv butun funksiyani Vercel
  // chegarasiga (504) olib bormaydi.
  return async (group: TranslateGroup, signal?: AbortSignal) => {
    const result = await model.generateContent([buildTranslatePrompt(group)], { signal });
    return {
      json: JSON.parse(result.response.text()),
      tokens: result.response.usageMetadata?.totalTokenCount ?? 0,
    };
  };
}

/**
 * Gemini chaqiruvchisini yaratadi — `IMPORT_GEMINI_MODELS` zanjiri bo'ylab.
 *
 * Zanjir strukturalash bilan BIR XIL ro'yxatdan foydalanadi: kunlik kvota
 * modelga beriladi, bosqichga emas, shuning uchun alohida ro'yxat tutish
 * faqat sozlamani ikkilantirardi.
 *
 * Zanjirning "kvotasi tugagan model" belgisi chaqiruvchining umriga bog'liq —
 * har marshrut so'rovi uchun bittadan yaratilsin.
 */
export function createTranslateCaller(apiKey = process.env.GEMINI_API_KEY || ''): TranslateCaller {
  const genAI = new GoogleGenerativeAI(apiKey);
  return createChainedCaller(STRUCTURE_MODELS, (model) => createModelCaller(genAI, model));
}
