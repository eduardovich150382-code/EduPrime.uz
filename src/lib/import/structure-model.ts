import { GoogleGenerativeAI, type Part } from '@google/generative-ai';
import { buildStructurePrompt, STRUCTURE_SCHEMA, type ModelCaller, type StructureInput } from './structure';

/**
 * `ModelCaller` ning haqiqiy amalga oshirilishi — Gemini chaqiruvi.
 *
 * `structure.ts` dan ALOHIDA fayl: o'sha fayl sof qoladi va testlar SDK'ni
 * mock qilmasdan ishlaydi. Bu yerda esa tarmoq bor — shuning uchun bu faylning
 * o'z testi yo'q, marshrut testlarida mock qilinadi.
 */

export const STRUCTURE_MODEL = 'gemini-3.5-flash';

/** Bitta rasmning eng katta hajmi — asset yuklashdagi chegara bilan bir xil. */
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

async function fetchInline(url: string): Promise<Part | null> {
  const res = await fetch(url);
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
function createCache(): (url: string) => Promise<Part | null> {
  const cache = new Map<string, Promise<Part | null>>();
  return (url: string) => {
    const hit = cache.get(url);
    if (hit) return hit;
    // Xato bo'lsa ham va'da keshda qoladi: qayta urinish o'sha so'rov ichida
    // foyda bermaydi, savol rasmsiz strukturalanadi.
    const pending = fetchInline(url).catch(() => null);
    cache.set(url, pending);
    return pending;
  };
}

/**
 * Gemini chaqiruvchisini yaratadi. Kesh chaqiruvchining umriga bog'liq —
 * har marshrut so'rovi uchun bittadan yaratilsin.
 */
export function createGeminiCaller(apiKey = process.env.GEMINI_API_KEY || ''): ModelCaller {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: STRUCTURE_MODEL,
    generationConfig: {
      // Aniqlik kerak, ijod emas: bir xil savol ikki marta bir xil
      // strukturalansin, aks holda qayta urinish boshqa natija berardi.
      temperature: 0,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      responseSchema: STRUCTURE_SCHEMA,
    },
  });
  const load = createCache();

  return async (input: StructureInput) => {
    const urls = [...input.pageImages.map((p) => p.url), ...input.images.map((i) => i.url)];
    const parts = (await Promise.all(urls.map(load))).filter((part): part is Part => part !== null);

    const result = await model.generateContent([buildStructurePrompt(input), ...parts]);
    return {
      json: JSON.parse(result.response.text()),
      tokens: result.response.usageMetadata?.totalTokenCount ?? 0,
    };
  };
}
