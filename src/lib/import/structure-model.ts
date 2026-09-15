import { GoogleGenerativeAI, type Part } from '@google/generative-ai';
import { createChainedCaller, STRUCTURE_MODELS } from './structure-chain';
import { buildStructurePrompt, STRUCTURE_SCHEMA, type ModelCaller, type StructureInput } from './structure';

/**
 * `ModelCaller` ning haqiqiy amalga oshirilishi — Gemini chaqiruvi.
 *
 * `structure.ts` dan ALOHIDA fayl: o'sha fayl sof qoladi va testlar SDK'ni
 * mock qilmasdan ishlaydi. Bu yerda esa tarmoq bor — shuning uchun bu faylning
 * o'z testi yo'q, marshrut testlarida mock qilinadi.
 */

/** Bitta rasmning eng katta hajmi — asset yuklashdagi chegara bilan bir xil. */
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

async function fetchInline(url: string, signal?: AbortSignal): Promise<Part | null> {
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const buffer = await res.arrayBuffer();
  if (buffer.byteLength > MAX_IMAGE_BYTES) return null;
  const mimeType = res.headers.get('content-type')?.split(';')[0] || 'image/png';
  return { inlineData: { data: Buffer.from(buffer).toString('base64'), mimeType } };
}

/**
 * Bir so'rov davomidagi rasm keshi.
 *
 * Bitta betdagi 20 savol AYNI bet aksini so'raydi — keshsiz o'sha fayl 20
 * marta yuklab olinardi. (Gemini'ga baribir har chaqiruvda yuboriladi: bu
 * token xarajati, u `ImportJob.costTokens` da o'lchanadi.)
 */
function createCache(): (url: string, signal?: AbortSignal) => Promise<Part | null> {
  const cache = new Map<string, Promise<Part | null>>();
  return (url: string, signal?: AbortSignal) => {
    const hit = cache.get(url);
    if (hit) return hit;
    // Xato bo'lsa ham va'da keshda qoladi: qayta urinish o'sha so'rov ichida
    // foyda bermaydi, savol rasmsiz strukturalanadi. Uzilish ham shunday —
    // rasmni birinchi so'ragan chaqiruv chegaraga urilsa, keyingi savol o'sha
    // rasmsiz strukturalanadi, lekin butun to'lqin kutib qolmaydi.
    const pending = fetchInline(url, signal).catch(() => null);
    cache.set(url, pending);
    return pending;
  };
}

/** Bitta modelga bog'langan chaqiruvchi — zanjirning bir bo'g'ini. */
function createModelCaller(
  genAI: GoogleGenerativeAI,
  modelName: string,
  load: (url: string, signal?: AbortSignal) => Promise<Part | null>,
): ModelCaller {
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      // Aniqlik kerak, ijod emas: bir xil savol ikki marta bir xil
      // strukturalansin, aks holda qayta urinish boshqa natija berardi.
      temperature: 0,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      responseSchema: STRUCTURE_SCHEMA,
    },
  });

  // `signal` ni `withRetry` beradi: har chaqiruvning o'z vaqt chegarasi bor,
  // shuning uchun osilib qolgan bitta chaqiruv butun funksiyani Vercel
  // chegarasiga (504) olib bormaydi. Signal rasm yuklashga ham uzatiladi.
  return async (input: StructureInput, signal?: AbortSignal) => {
    const urls = [...input.pageImages.map((p) => p.url), ...input.images.map((i) => i.url)];
    const loaded = await Promise.all(urls.map((url) => load(url, signal)));
    const parts = loaded.filter((part): part is Part => part !== null);

    const result = await model.generateContent([buildStructurePrompt(input), ...parts], { signal });
    return {
      json: JSON.parse(result.response.text()),
      tokens: result.response.usageMetadata?.totalTokenCount ?? 0,
    };
  };
}

/**
 * Gemini chaqiruvchisini yaratadi — `IMPORT_GEMINI_MODELS` zanjiri bo'ylab.
 *
 * Kesh ham, zanjirning "kvotasi tugagan model" belgisi ham chaqiruvchining
 * umriga bog'liq — har marshrut so'rovi uchun bittadan yaratilsin.
 *
 * Rasm keshi zanjirdan TASHQARIDA: model almashganda o'sha bet aksi qaytadan
 * yuklab olinmasin.
 */
export function createGeminiCaller(apiKey = process.env.GEMINI_API_KEY || ''): ModelCaller {
  const genAI = new GoogleGenerativeAI(apiKey);
  const load = createCache();
  return createChainedCaller(STRUCTURE_MODELS, (model) => createModelCaller(genAI, model, load));
}
