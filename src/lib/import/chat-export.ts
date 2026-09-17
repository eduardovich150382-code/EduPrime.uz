import { imageToken, imageTokensOf, type StructuredOption } from './structure';
import { maskImageTokens } from './translate';

/**
 * Savollarni chatga tashlanadigan matnga aylantirish — ikkinchi import
 * yo'lining birinchi yarmi.
 *
 * `structure.ts`/`translate.ts` bilan bir xil falsafa: bu fayl SOF — baza ham,
 * tarmoq ham yo'q, shuning uchun chiqqan matnni test to'g'ridan-to'g'ri
 * tekshira oladi.
 *
 * Nega umuman kerak: serverdagi Gemini yo'li Vercel'ning 60 s chegarasiga va
 * bepul kunlik kvotaga taqaladi. Chatda ikkalasi ham yo'q va model kuchliroq,
 * shuning uchun uzun hujjat uchun bu yo'l ishonchliroq. Ikkala yo'l ham bitta
 * joyda — `raw.stage = 'READY'` da tugaydi.
 */

export interface ExportDraft {
  order: number;
  /** `textOriginal` — manba tilidagi matn. */
  text: string;
  /** `optionsOriginal` — BLOCK bosqichida bo'sh (variantlar xom matn ichida). */
  options: StructuredOption[];
  /** `raw.images[].assetId` — bu savolga ulangan kesilgan rasmlar. */
  images: string[];
}

export interface ExportedBlock {
  order: number;
  /** Chatga ketadigan matn — `### <order>` sarlavhasi bilan. */
  body: string;
  /** Qisqa token → haqiqiy token. `ImportDraft.raw.tokenMap` ga yoziladi. */
  tokenMap: Record<string, string>;
}

/**
 * Bazadan o'qilgan draft qatori — eksport ham, `apply` ham AYNI shu shakldan
 * boshlaydi.
 *
 * Ikkala marshrut bir xil qatordan bir xil tokenlarni olishi SHART: qisqa
 * token (`[[IMG1]]`) haqiqiy rasmga faqat shu moslik orqali qaytadi.
 */
export interface DraftRow {
  order: number;
  /** Manba tilidagi matn; xom blokda variantlar ham shu yerda. */
  textOriginal: string;
  /** `textOriginal` bo'sh bo'lsa ishlatiladigan zaxira. */
  text: string;
  /** Json ustun — strukturalangan draftda variantlar, xom blokda bo'sh. */
  optionsOriginal: unknown;
  /** Json ustun — `images`, `notQuestion` va boshqa blok ma'lumotlari. */
  raw: unknown;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

/** `options`/`optionsOriginal` Json ustunini variantlar massiviga aylantiradi. */
function parseOptions(value: unknown): StructuredOption[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    const o = asRecord(entry);
    return {
      label: typeof o.label === 'string' ? o.label : String.fromCharCode(65 + index),
      text: typeof o.text === 'string' ? o.text : '',
      imageToken: typeof o.imageToken === 'string' && o.imageToken ? o.imageToken : null,
    };
  });
}

/** `raw.images[].assetId` — savolga ulangan kesilgan rasmlar, YOZILGAN TARTIBDA. */
function parseImages(raw: Record<string, unknown>): string[] {
  if (!Array.isArray(raw.images)) return [];
  return raw.images
    .map((entry) => asRecord(entry).assetId)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
}

/**
 * Son solishtiruvi uchun manba: savol matni va variantlar BIRGA.
 *
 * Xom blokda variantlar matn ichida, avtomatik yo'ldan o'tgan draftda esa
 * `optionsOriginal` ustunida. Faqat matn olinsa ikkinchi holatda son to'plami
 * chala bo'lib, yolg'on bayroq berardi. `apply` ham, `image-map` ham shu
 * funksiyadan foydalanadi — ikki nusxa bir-biridan jimgina ajralib ketmasin.
 */
export function sourceTextOf(text: string, optionsOriginal: unknown): string {
  return [text, ...parseOptions(optionsOriginal).map((o) => o.text)].filter(Boolean).join('\n');
}

/** Baza qatoridan eksport kirishi. */
export function toExportDraft(row: DraftRow): ExportDraft {
  const raw = asRecord(row.raw);
  return {
    order: row.order,
    text: row.textOriginal || row.text,
    options: parseOptions(row.optionsOriginal),
    images: parseImages(raw),
  };
}

/**
 * Kalit qatori sifatida aniqlangan blok chatga YUBORILMAYDI: uning tarjimasi
 * ham, javobi ham yo'q. Avtomatik yo'l ham aynan shu maydonga qaraydi.
 */
export function isRealQuestion(row: DraftRow): boolean {
  return asRecord(row.raw).notQuestion !== true;
}

/**
 * Draft qatori uchun qisqa token xaritasi.
 *
 * `apply` xaritani BAZADAN O'QIMAYDI, shu yerda QAYTA HISOBLAYDI. Sabab
 * qimmatga tushib o'rganildi: xarita eksport paytida `raw.tokenMap` ga
 * yozilardi, `/blocks` ni qayta chaqirish esa `raw` ni butunlay yangilab uni
 * o'chirib yuborardi — ZIP qayta yuklanganda esa job umuman yangi bo'lib,
 * xarita hech qachon yozilmagan bo'lardi. Natijada chat mukammal javob
 * qaytarsa ham HAR savol `IMAGE_TOKEN_INVALID` olib, rasmlar jimgina
 * o'chirilardi.
 *
 * Raqamlash `draft.images` tartibidan deterministik kelib chiqadi, ya'ni qayta
 * hisoblash saqlangan xarita bilan bir xil natija beradi va hech qanday
 * holatga bog'liq emas.
 */
export function tokenMapOf(row: DraftRow): Record<string, string> {
  return buildExportBlock(toExportDraft(row)).tokenMap;
}

/** Variant yorlig'i — chatga `A)`, `B)` bo'lib chiqadi. */
function labelOf(option: StructuredOption, index: number): string {
  const label = option.label.trim().toUpperCase();
  return /^[A-H]$/.test(label) ? label : String.fromCharCode(65 + index);
}

/** Matn oxiriga token qo'shadi — bo'sh matnda ortiqcha probel qolmaydi. */
function appendToken(value: string, token: string): string {
  const trimmed = value.trimEnd();
  return trimmed ? `${trimmed}\n${token}` : token;
}

/**
 * Har rasm tokenini MATN ichiga keltiradi.
 *
 * Bu qadamsiz bo'lmaydi: `BLOCK` bosqichidagi draftning matnida `[[IMG:...]]`
 * tokeni UMUMAN yo'q — rasmlar `raw.images` da turadi va tokenni
 * `buildStructurePrompt` chaqiruv paytida yasaydi. Chat yo'lida esa
 * strukturalash bosqichi yo'q, shuning uchun tokenni shu yerda matnga
 * qo'yamiz: keyin `maskImageTokens` uni boshqa hammasi bilan bir xil
 * maskalaydi va rasm chatdan qaytgan javobda o'z joyini topadi.
 *
 * Variantning `imageToken` maydoni ham O'SHA variant matniga ko'chadi —
 * variantdagi rasm savol matniga ko'chib o'tsa, ustoz uchun bu yo'qolganidan
 * ham chalg'ituvchiroq.
 */
function inlineTokens(draft: ExportDraft): { text: string; options: StructuredOption[] } {
  let text = draft.text;
  const options = draft.options.map((option) => {
    if (!option.imageToken || option.text.includes(option.imageToken)) return { ...option };
    return { ...option, text: appendToken(option.text, option.imageToken) };
  });

  const present = new Set([text, ...options.map((o) => o.text)].flatMap(imageTokensOf));
  for (const assetId of draft.images) {
    const token = imageToken(assetId);
    if (present.has(token)) continue;
    present.add(token);
    text = appendToken(text, token);
  }

  return { text, options };
}

/**
 * Bitta draftning chat bloki.
 *
 * `### <order>` — qaytishda YAGONA moslash kaliti (`@@unique([jobId, order])`).
 * Savol raqami (`raw.number`) emas: u kitobda takrorlanishi ham, umuman
 * bo'lmasligi ham mumkin.
 */
export function buildExportBlock(draft: ExportDraft): ExportedBlock {
  const source = inlineTokens(draft);
  const masked = maskImageTokens(source.text, source.options);

  const tokenMap: Record<string, string> = {};
  for (const [key, entry] of masked.map) tokenMap[key] = entry.token;

  // Variantlar faqat strukturalangan draftda alohida turadi; `BLOCK`
  // bosqichida ular xom matnning o'zida, shuning uchun qatorlar qo'shilmaydi.
  const lines = [`### ${draft.order}`, masked.text.trim()];
  masked.options.forEach((option, index) => {
    lines.push(`${labelOf(option, index)}) ${option.text.trim()}`);
  });

  return { order: draft.order, body: lines.join('\n'), tokenMap };
}

export function buildExportChunk(drafts: readonly ExportDraft[]): ExportedBlock[] {
  return drafts.map(buildExportBlock);
}

/** Bloklarni chatga tashlanadigan yagona matnga qo'shadi. */
export function renderMarkdown(blocks: readonly ExportedBlock[]): string {
  return blocks.map((block) => block.body).join('\n\n');
}
