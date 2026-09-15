import type { ResponseSchema } from '@google/generative-ai';
import { SchemaType } from '@google/generative-ai';
import { imageTokensOf, type Caller, type StructuredOption } from './structure';
import {
  parseMs,
  RateLimitedError,
  TimeBudgetError,
  withRetry,
  type RetryOptions,
} from './structure-error';

/**
 * Strukturalangan savolni manba tilidan maqsad tiliga o'girish — sxema,
 * LaTeX tuzatish, javob tekshiruvi va paketlash.
 *
 * `structure.ts` bilan bir xil falsafa: tarmoq chaqiruvi bu yerda EMAS, model
 * `TranslateCaller` sifatida ineksiya qilinadi (haqiqiy chaqiruvchi —
 * ./translate-model). Shu sabab bu fayl va uning testlari SDK'ni mock
 * qilmasdan ishlaydi.
 *
 * S4 dan ikki muhim farq bor:
 *  1. Chaqiruvga RASM yuborilmaydi — tarjimaga sahifa aksi kerak emas, bu esa
 *     tokenni va kunlik kvotani sezilarli tejaydi.
 *  2. Bir chaqiruvda bir NECHTA savol ketadi (guruh): tarjima javobi qisqa va
 *     `maxOutputTokens` ga urilmaydi, guruhlash esa chaqiruvlar sonini, demak
 *     kunlik kvota sarfini bir necha barobar kamaytiradi.
 */

// ---------------------------------------------------------------------------
// Turlar
// ---------------------------------------------------------------------------

export interface TranslateInput {
  order: number;
  /** Manba tilidagi matn — `ImportDraft.textOriginal`. */
  text: string;
  /** Manba tilidagi variantlar — `ImportDraft.optionsOriginal`. */
  options: StructuredOption[];
}

/** Bitta Gemini chaqiruviga ketadigan savollar guruhi. */
export interface TranslateGroup {
  items: TranslateInput[];
  sourceLang: string;
  targetLang: string;
  subject: string;
}

export interface TranslatedQuestion {
  text: string;
  options: StructuredOption[];
  issues: string[];
  confidence: number;
}

export interface TranslateOutcome {
  order: number;
  /** Tekshiruvdan o'tgan tarjima — yiqilganda `null` (yarim natija saqlanmaydi). */
  result: TranslatedQuestion | null;
  tokens: number;
  failed: boolean;
  model?: string;
  error?: unknown;
  /**
   * Yiqilganda modelning javobidan namuna — matn va birinchi variant.
   *
   * Xato KODI nima yiqilganini aytadi, lekin nega yiqilganini aytmaydi:
   * birinchi haqiqiy importda sababni faqat kodga qarab taxmin qilishga
   * to'g'ri keldi. Endi javobning o'zi logda ko'rinib turadi.
   */
  sample?: string;
  /** Vaqt yoki kvota yetmagani uchun bajarilmadi — bu YIQILISH EMAS. */
  deferred?: boolean;
  /** Zanjirdagi hamma modelning kvotasi tugadi — `deferred` ning bir turi. */
  rateLimited?: boolean;
}

export interface TranslateBatchResult {
  outcomes: TranslateOutcome[];
  batches: number;
  deadlineHit: boolean;
}

export type TranslateCaller = Caller<TranslateGroup>;

// ---------------------------------------------------------------------------
// Sozlamalar
// ---------------------------------------------------------------------------

/**
 * Bitta so'rovning vaqt byudjeti (ms).
 *
 * Strukturalashnikidan (40 s) uzunroq: tarjima chaqiruvi bir guruh savolni
 * o'z ichiga oladi, lekin rasm yuklamaydi — sarflangan vaqt asosan modelning
 * o'zida.
 */
export function parseTranslateDeadlineMs(raw: string | undefined): number {
  return parseMs(raw, 45000, 5000, 55000);
}

/** Bitta Gemini chaqiruvining chegarasi (ms). */
export function parseTranslateCallTimeoutMs(raw: string | undefined): number {
  return parseMs(raw, 30000, 5000, 55000);
}

/** Bitta HTTP so'rovda navbatdan olinadigan savol soni. */
export function parseTranslateBatch(raw: string | undefined): number {
  return parseMs(raw, 40, 1, 200);
}

/** Bitta Gemini chaqiruvidagi savollar soni. */
export function parseTranslateGroup(raw: string | undefined): number {
  return parseMs(raw, 5, 1, 10);
}

/** Bir to'lqinda parallel ketadigan guruhlar soni. */
export function parseTranslateConcurrency(raw: string | undefined): number {
  return parseMs(raw, 4, 1, 10);
}

export const TRANSLATE_DEADLINE_MS = parseTranslateDeadlineMs(process.env.IMPORT_TRANSLATE_DEADLINE_MS);
export const TRANSLATE_CALL_TIMEOUT_MS = parseTranslateCallTimeoutMs(
  process.env.IMPORT_TRANSLATE_CALL_TIMEOUT_MS,
);
export const TRANSLATE_BATCH = parseTranslateBatch(process.env.IMPORT_TRANSLATE_BATCH);
export const TRANSLATE_GROUP = parseTranslateGroup(process.env.IMPORT_TRANSLATE_GROUP);
export const TRANSLATE_CONCURRENCY = parseTranslateConcurrency(process.env.IMPORT_TRANSLATE_CONCURRENCY);

/** Til kodining solishtiriladigan shakli — manifestda "uz-UZ" ham, "uz" ham uchraydi. */
export function langKey(lang: string): string {
  return lang.trim().slice(0, 2).toLowerCase();
}

/**
 * Tarjima kerakmi.
 *
 * Tillar teng bo'lsa Gemini UMUMAN chaqirilmaydi: o'zbekcha kitob uchun bu
 * bosqich bepul va bir zumda o'tishi kerak.
 */
export function shouldTranslate(sourceLang: string, targetLang: string): boolean {
  return langKey(sourceLang) !== langKey(targetLang);
}

// ---------------------------------------------------------------------------
// Chiqish sxemasi
// ---------------------------------------------------------------------------

export const TRANSLATE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    results: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          order: { type: SchemaType.INTEGER },
          text: { type: SchemaType.STRING },
          // `imageToken` bu yerda ATAYLAB yo'q: u rasmning identifikatorini
          // saqlaydi va modeldan uni aynan qaytarishni talab qilish bajarib
          // bo'lmaydigan ish edi. Maydon natijaga manbadan ko'chiriladi.
          options: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                label: { type: SchemaType.STRING },
                text: { type: SchemaType.STRING },
              },
              required: ['label', 'text'],
            },
          },
          issues: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          confidence: { type: SchemaType.NUMBER },
        },
        required: ['order', 'text', 'options'],
      },
    },
  },
  required: ['results'],
};

// ---------------------------------------------------------------------------
// LaTeX tuzatish — SOF va tarjimadan OLDIN
// ---------------------------------------------------------------------------

/**
 * Boshidagi `\f`, `\s`, `\t`, `\v` yo'qolgan buyruqlar.
 *
 * PDF matn qatlamida `\frac` ba'zan `rac` bo'lib keladi: `\f` (form feed)
 * escape ketma-ketligi sifatida talqin qilinib, matndan tushib qoladi.
 *
 * Oldidagi harf yoki teskari chiziq TEKSHIRILADI: aks holda to'g'ri yozilgan
 * `\frac{` ichidagi `rac{` yana bir marta "tuzatilib", buzilgan matn chiqardi.
 */
const BROKEN_LATEX: readonly (readonly [RegExp, string])[] = [
  [/(?<![\\A-Za-z])rac\{/g, '\\frac{'],
  [/(?<![\\A-Za-z])qrt\{/g, '\\sqrt{'],
  [/(?<![\\A-Za-z])ec\{/g, '\\vec{'],
  [/(?<![\\A-Za-z])imes(?![A-Za-z])/g, '\\times'],
  [/(?<![\\A-Za-z])heta(?![A-Za-z])/g, '\\theta'],
];

/**
 * `$` tashqarisida turgan, ANIQ LaTeX ekani ko'rinib turgan ifodalar.
 *
 * Faqat buyruq bilan boshlanadiganlar: `G_X`, `T_K` kabi ifodalarni bu yerda
 * deterministik topib bo'lmaydi (oddiy matndan farqi yo'q) — ular promptda
 * modelga qoldirilgan.
 */
const BARE_LATEX = /\\frac\{[^{}]*\}\{[^{}]*\}|\\sqrt\{[^{}]*\}|\\vec\{[^{}]*\}|\\times|\\theta/g;

export interface RepairResult {
  text: string;
  issues: string[];
}

/**
 * Buzilgan LaTeX'ni tiklaydi va ochiq qolganini `$...$` ichiga oladi.
 *
 * Tarjimadan OLDIN, manba matni ustida ishlaydi. Sababi ikkita: buzilgan
 * buyruq (`rac{P}{2}`) modelga kirsa, u `rac` ni so'z deb tarjima qilishga
 * urinib butun ifodani chalkashtiradi; ikkinchidan, deterministik tuzatishni
 * modelga topshirish uni sinab bo'lmaydigan qilardi.
 */
export function repairLatex(text: string): RepairResult {
  const issues: string[] = [];

  let repaired = text;
  for (const [pattern, replacement] of BROKEN_LATEX) {
    repaired = repaired.replace(pattern, replacement);
  }
  if (repaired !== text) issues.push('LATEX_REPAIRED');

  // Matn `$` bo'yicha bo'linadi: juft indeksli bo'laklar matematikadan
  // TASHQARIDA, toq indekslilar ichida. Ichkariga umuman tegilmaydi — u yerda
  // hamma narsa allaqachon LaTeX.
  const parts = repaired.split('$');
  if (parts.length % 2 === 0) {
    // `$` soni toq — ochilib yopilmagan matematika. Qayerda tugashini bilmasdan
    // o'rash faqat ahvolni yomonlashtiradi, shuning uchun faqat bayroq qo'yiladi.
    issues.push('LATEX_UNBALANCED');
    return { text: repaired, issues };
  }

  let wrapped = false;
  const out = parts.map((part, index) => {
    if (index % 2 === 1) return part;
    return part.replace(BARE_LATEX, (match) => {
      wrapped = true;
      return `$${match}$`;
    });
  });
  if (wrapped) issues.push('LATEX_WRAPPED');

  return { text: out.join('$'), issues };
}

// ---------------------------------------------------------------------------
// Rasm tokenlarini maskalash
// ---------------------------------------------------------------------------

/** Maskalangan token — xaritadagi yozuv. */
export interface MaskedToken {
  /** To'liq haqiqiy token: `[[IMG:cmu2gfe670005lc0438g6uky5]]`. */
  token: string;
  /** Token qaysi maydondan olingani: savol matni yoki variant indeksi. */
  from: 'text' | number;
}

/**
 * Javobdagi qisqa token. Ataylab `[[IMG:...]]` naqshiga MOS EMAS — shuning
 * uchun maskalangan matnda `imageTokensOf` bo'sh qaytaradi va haqiqiy token
 * sizib chiqsa tekshiruv uni baribir ko'radi.
 */
const MASKED_TOKEN = /\[\[IMG(\d+)\]\]/g;

/** Yo'qolgan tokenni maydon oxiriga qaytaradi. */
function appendToken(value: string, token: string): string {
  const trimmed = value.trimEnd();
  return trimmed ? `${trimmed} ${token}` : token;
}

/**
 * Rasm tokenlarini modelga ko'rsatmaydigan qisqa belgilarga almashtiradi.
 *
 * Birinchi haqiqiy importda 11/11 savol `IMAGE_TOKEN_LOST` bilan yiqilgandi:
 * `[[IMG:cmu2gfe670005lc0438g6uky5]]` ichidagi 24 belgili cuid ni model
 * belgi-baboshi ko'chira olmaydi — tekshiruv to'g'ri edi, TALAB noto'g'ri.
 * `[[IMG1]]` ni esa model ishonchli saqlaydi, haqiqiy identifikator esa
 * modelga umuman ko'rinmaydi.
 *
 * Har UCHRASH alohida kalit oladi (bir token ikki marta uchrasa ham): shunda
 * xaritadagi yozuvlar soni manbadagi tokenlar soniga aynan teng bo'ladi va
 * tiklashda birortasi ortib yoki kamayib qolmaydi.
 */
export function maskImageTokens(
  text: string,
  options: StructuredOption[],
): { text: string; options: StructuredOption[]; map: Map<string, MaskedToken> } {
  const map = new Map<string, MaskedToken>();
  let counter = 0;

  const mask = (value: string, from: 'text' | number): string => {
    let masked = value;
    for (const token of imageTokensOf(value)) {
      const key = `IMG${++counter}`;
      map.set(key, { token, from });
      // Satr naqsh sifatida — birinchi QOLGAN uchrashni almashtiradi, ya'ni
      // takroriy token ikkinchi aylanishda o'z navbatini oladi.
      masked = masked.replace(token, `[[${key}]]`);
    }
    return masked;
  };

  return {
    text: mask(text, 'text'),
    options: options.map((option, index) => ({ ...option, text: mask(option.text, index) })),
    map,
  };
}

/**
 * Qisqa tokenlarni haqiqiysiga qaytaradi.
 *
 * Har xarita yozuvi BIR MARTA sarflanadi va sarflanmagani o'z maydoniga
 * qaytariladi — shuning uchun chiqishning token to'plami manbanikiga HAR DOIM
 * teng bo'ladi, model nima yozishidan qat'i nazar. Aynan shu sabab
 * `IMAGE_TOKEN_LOST` endi modelga emas, faqat shu funksiyaning xatosiga
 * bog'liq.
 *
 * Yo'qolgan token savolni YIQITMAYDI: rasm joyi noto'g'ri bo'lgani butun
 * tarjimani yo'qotishdan yaxshiroq, S7 (ko'rib chiqish) da ustoz tuzatadi.
 */
export function unmaskImageTokens(
  text: string,
  options: StructuredOption[],
  map: Map<string, MaskedToken>,
): { text: string; options: StructuredOption[]; issues: string[] } {
  const issues = new Set<string>();
  const used = new Set<string>();

  const unmask = (value: string): string =>
    value.replace(MASKED_TOKEN, (_match, digits: string) => {
      const key = `IMG${digits}`;
      const entry = map.get(key);
      // Xaritada yo'q kalit ham, ikkinchi marta uchragan kalit ham manbada
      // bo'lmagan rasmni ko'rsatadi — ikkalasi ham o'chiriladi.
      if (!entry || used.has(key)) {
        issues.add('IMAGE_TOKEN_INVALID');
        return '';
      }
      used.add(key);
      return entry.token;
    });

  let outText = unmask(text);
  const outOptions = options.map((option) => ({ ...option, text: unmask(option.text) }));

  for (const [key, entry] of map) {
    if (used.has(key)) continue;
    issues.add('IMAGE_TOKEN_MOVED');
    // Token O'ZI kelgan maydonga qaytadi: variantdagi rasm savol matniga
    // ko'chib o'tsa, ustoz uchun bu yo'qolganidan ham chalg'ituvchiroq.
    const option = typeof entry.from === 'number' ? outOptions[entry.from] : undefined;
    if (option) option.text = appendToken(option.text, entry.token);
    else outText = appendToken(outText, entry.token);
  }

  return { text: outText, options: outOptions, issues: [...issues] };
}

// ---------------------------------------------------------------------------
// Javobni tekshirish
// ---------------------------------------------------------------------------

/** Tuzatishdan KEYIN ham qolgan buzuq buyruq — model yasagan yangi nuqson. */
const STILL_BROKEN = /(?<![\\A-Za-z])(rac\{|qrt\{|ec\{|imes(?![A-Za-z])|heta(?![A-Za-z]))/;

/** Sonlar — turkcha o'nlik ajratgichi vergul bo'lgani uchun ikkalasi ham. */
const NUMBER = /\d+(?:[.,]\d+)?/g;

/** LaTeX buyruq nomlari — sonlarni sanashdan oldin olib tashlanadi. */
const LATEX_COMMAND = /\\[A-Za-z]+/g;

export interface VerifyResult {
  /** Yiqitadigan nuqson — blok `TRANSLATE_FAILED`, tarjima saqlanmaydi. */
  fatal: string | null;
  /** Yiqitmaydigan bayroqlar — tarjima saqlanadi, kod `issues` ga yoziladi. */
  flags: string[];
}

function allText(text: string, options: StructuredOption[]): string {
  return [text, ...options.map((o) => o.text)].join('\n');
}

function allTokens(text: string, options: StructuredOption[]): string[] {
  const tokens = [...imageTokensOf(text)];
  for (const option of options) {
    tokens.push(...imageTokensOf(option.text));
    if (option.imageToken) tokens.push(option.imageToken);
  }
  return tokens.sort();
}

function numbersOf(text: string): string[] {
  return (text.replace(LATEX_COMMAND, ' ').match(NUMBER) ?? [])
    .map((n) => String(Number(n.replace(',', '.'))))
    .sort();
}

function same(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/**
 * Model javobini manba bilan solishtiradi — modelning o'z so'ziga ISHONILMAYDI.
 *
 * Ikki xil natija ataylab ajratilgan. Rasm tokeni yo'qolgan yoki varianti
 * kamaygan savol YAROQSIZ — uni saqlash bazaga jimgina buzuq savol kiritish
 * degani, shuning uchun `fatal`. Son farqi esa har doim ham xato emas
 * (turkcha "iki" o'zbekcha "2" bo'lishi mumkin), lekin ko'rib chiqilishi shart
 * — shuning uchun `flags`.
 */
export function verifyTranslation(
  source: TranslateInput,
  candidate: { text: string; options: StructuredOption[] },
): VerifyResult {
  const flags: string[] = [];

  if (candidate.options.length !== source.options.length) {
    return { fatal: 'OPTION_COUNT_MISMATCH', flags };
  }

  const labelsMoved = source.options.some(
    (option, index) =>
      option.label.trim().toUpperCase() !== candidate.options[index].label.trim().toUpperCase(),
  );
  if (labelsMoved) return { fatal: 'OPTION_LABEL_MISMATCH', flags };

  if (!same(allTokens(source.text, source.options), allTokens(candidate.text, candidate.options))) {
    return { fatal: 'IMAGE_TOKEN_LOST', flags };
  }

  const candidateText = allText(candidate.text, candidate.options);
  if ((candidateText.match(/\$/g) ?? []).length % 2 !== 0) {
    return { fatal: 'LATEX_UNBALANCED', flags };
  }

  if (STILL_BROKEN.test(candidateText)) return { fatal: 'LATEX_COMMAND_BROKEN', flags };

  // Sonni model o'zgartirib yuborishi boshqa hech qanday tekshiruv bilan
  // tutilmaydi va test bankida JIMGINA noto'g'ri javobga olib keladi — shuning
  // uchun alohida bayroq. S7 (ko'rib chiqish oynasi) shu kodga qarab savolni
  // ustozga ajratib ko'rsatadi.
  if (!same(numbersOf(allText(source.text, source.options)), numbersOf(candidateText))) {
    flags.push('NUMBER_MISMATCH');
  }

  return { fatal: null, flags };
}

// ---------------------------------------------------------------------------
// Javobni o'qish
// ---------------------------------------------------------------------------

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, max = 4000): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

interface ParsedResult {
  text: string;
  options: StructuredOption[];
  issues: string[];
  confidence: number;
}

/**
 * Model javobidagi natijalarni `order` bo'yicha xaritaga soladi.
 *
 * Xarita, massiv emas: model natijalarni boshqa tartibda yoki kam qaytarishi
 * mumkin, indeks bo'yicha moslashtirilsa esa tarjimalar savollar orasida
 * jimgina ALMASHIB ketardi.
 */
export function parseTranslateResponse(raw: unknown): Map<number, ParsedResult> {
  const results = asRecord(raw).results;
  const map = new Map<number, ParsedResult>();
  if (!Array.isArray(results)) return map;

  for (const item of results) {
    const r = asRecord(item);
    const order = Number(r.order);
    if (!Number.isInteger(order)) continue;

    const rawOptions = Array.isArray(r.options) ? r.options : [];
    const options: StructuredOption[] = rawOptions.slice(0, 8).map((entry, index) => {
      const o = asRecord(entry);
      return {
        label: asString(o.label, 4) || String.fromCharCode(65 + index),
        text: asString(o.text),
        // Modeldan so'ralmaydi — `translateBatch` uni manbadan qaytaradi.
        imageToken: null,
      };
    });

    const confidence = Number(r.confidence);
    const issues: string[] = [];
    for (const issue of Array.isArray(r.issues) ? r.issues.slice(0, 10) : []) {
      const code = asString(issue, 40);
      if (code && !issues.includes(code)) issues.push(code);
    }

    map.set(order, {
      text: asString(r.text),
      options,
      issues,
      confidence: Number.isFinite(confidence) ? Math.min(Math.max(confidence, 0), 1) : 0.5,
    });
  }

  return map;
}

// ---------------------------------------------------------------------------
// Paketlash
// ---------------------------------------------------------------------------

/** Manba matnini tarjimaga tayyorlaydi — LaTeX tuzatilgan nusxasi va kodlari. */
export function prepareInput(input: TranslateInput): { input: TranslateInput; issues: string[] } {
  const issues = new Set<string>();
  const repairedText = repairLatex(input.text);
  for (const issue of repairedText.issues) issues.add(issue);

  const options = input.options.map((option) => {
    const repaired = repairLatex(option.text);
    for (const issue of repaired.issues) issues.add(issue);
    return { ...option, text: repaired.text };
  });

  return {
    input: { order: input.order, text: repairedText.text, options },
    issues: [...issues],
  };
}

/** Logga tushadigan namuna uzunligi — sabab ko'rinsin, log shishmasin. */
const SAMPLE_LENGTH = 300;

/** Model javobining ko'rinadigan boshi: matn va birinchi variant. */
function sampleOf(text: string, options: StructuredOption[]): string {
  return [text, options[0]?.text ?? ''].filter(Boolean).join(' | ').slice(0, SAMPLE_LENGTH);
}

/**
 * Variantning rasm maydonini manbadan ko'chiradi.
 *
 * Bu maydon modelga UMUMAN yuborilmaydi (sxemada ham yo'q): u rasm
 * identifikatorini saqlaydi, tarjimaga esa kerak emas. Indeks bo'yicha
 * ko'chirish xavfsiz — natijalar `order` bo'yicha olinadi, yorliqlar esa
 * indeks bo'yicha allaqachon tekshiriladi.
 */
function restoreOptionImages(
  source: readonly StructuredOption[],
  candidate: StructuredOption[],
): StructuredOption[] {
  return candidate.map((option, index) => ({
    ...option,
    imageToken: source[index]?.imageToken ?? null,
  }));
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let start = 0; start < items.length; start += size) out.push(items.slice(start, start + size));
  return out;
}

export interface TranslateBatchOptions extends RetryOptions {
  /** Bitta chaqiruvdagi savollar soni. */
  group?: number;
  /** Bir to'lqinda parallel ketadigan guruhlar soni. */
  concurrency?: number;
}

/**
 * Savollarni guruhlab tarjima qiladi.
 *
 * `structureBatch` bilan bir xil skelet: `Promise.allSettled` — bir guruh
 * yiqilsa qolganlari baribir qaytadi; `withRetry` — vaqtinchalik nosozlik
 * (503, timeout) butun guruhni yiqitmasin; muddat esa UCH joyda tekshiriladi
 * (chaqiruv boshlanishidan oldin, chaqiruvning o'z `AbortSignal` ida va
 * to'lqinlar orasida) — osilib qolgan bitta chaqiruv butun funksiyani Vercel
 * chegarasiga olib bormasin.
 *
 * Guruhning javobi kelgach har savol ALOHIDA tekshiriladi: guruhdagi bittasi
 * tekshiruvdan o'tmasa faqat o'sha yiqiladi, qolgani yoziladi.
 */
export async function translateBatch(
  inputs: readonly TranslateInput[],
  meta: { sourceLang: string; targetLang: string; subject: string },
  call: TranslateCaller,
  options: TranslateBatchOptions = {},
): Promise<TranslateBatchResult> {
  const group = options.group ?? TRANSLATE_GROUP;
  const concurrency = options.concurrency ?? TRANSLATE_CONCURRENCY;
  const remaining = options.remaining;
  const resilient = withRetry(call, { callTimeoutMs: TRANSLATE_CALL_TIMEOUT_MS, ...options });

  // Modelga faqat MASKALANGAN matn boradi: haqiqiy rasm tokeni xaritada
  // qoladi va javob kelgach qaytariladi.
  const prepared = inputs.map((raw) => {
    const { input, issues } = prepareInput(raw);
    const masked = maskImageTokens(input.text, input.options);
    return {
      input,
      issues,
      map: masked.map,
      sent: { order: input.order, text: masked.text, options: masked.options },
    };
  });
  const groups = chunk(prepared, group);

  const outcomes: TranslateOutcome[] = [];
  let batches = 0;
  let deadlineHit = false;

  for (let start = 0; start < groups.length; start += concurrency) {
    const wave = groups.slice(start, start + concurrency);
    const settled = await Promise.allSettled(
      wave.map((entries) => resilient({ items: entries.map((e) => e.sent), ...meta })),
    );
    batches++;

    settled.forEach((settledResult, index) => {
      const entries = wave[index];

      if (settledResult.status === 'rejected') {
        // Kvota ham, vaqt ham YIQILISH EMAS: sabab savolda emas, tashqi
        // chegarada — guruh tegilmasdan keyingi so'rovga qoladi.
        const rateLimited = settledResult.reason instanceof RateLimitedError;
        const deferred = rateLimited || settledResult.reason instanceof TimeBudgetError;
        for (const entry of entries) {
          outcomes.push({
            order: entry.input.order,
            result: null,
            tokens: 0,
            failed: !deferred,
            deferred,
            rateLimited,
            error: settledResult.reason,
          });
        }
        return;
      }

      const parsed = parseTranslateResponse(settledResult.value.json);
      // Token xarajati butun GURUHGA bitta — birinchi savolga yoziladi. Har
      // savolga takrorlansa `ImportJob.costTokens` guruh hajmiga ko'payib
      // shishib ketardi.
      let tokensLeft = settledResult.value.tokens;

      for (const entry of entries) {
        const tokens = tokensLeft;
        tokensLeft = 0;

        const candidate = parsed.get(entry.input.order);
        if (!candidate) {
          outcomes.push({
            order: entry.input.order,
            result: null,
            tokens,
            failed: true,
            model: settledResult.value.model,
            error: new Error('RESULT_MISSING'),
            // Savolning o'z javobi yo'q — guruh javobining boshi olinadi.
            sample: JSON.stringify(settledResult.value.json).slice(0, SAMPLE_LENGTH),
          });
          continue;
        }

        // Tekshiruv MASKA YECHILGANDAN keyin: shundan keyingina nomuvofiqlik
        // modelning emas, shu faylning xatosini bildiradi.
        const restored = unmaskImageTokens(candidate.text, candidate.options, entry.map);
        const translatedOptions = restoreOptionImages(entry.input.options, restored.options);

        const verdict = verifyTranslation(entry.input, {
          text: restored.text,
          options: translatedOptions,
        });
        if (verdict.fatal) {
          outcomes.push({
            order: entry.input.order,
            result: null,
            tokens,
            failed: true,
            model: settledResult.value.model,
            error: new Error(verdict.fatal),
            sample: sampleOf(candidate.text, candidate.options),
          });
          continue;
        }

        outcomes.push({
          order: entry.input.order,
          result: {
            text: restored.text,
            options: translatedOptions,
            issues: [
              ...new Set([
                ...entry.issues,
                ...candidate.issues,
                ...restored.issues,
                ...verdict.flags,
              ]),
            ],
            confidence: candidate.confidence,
          },
          tokens,
          failed: false,
          model: settledResult.value.model,
        });
      }
    });

    // Muddat to'lqinlar ORASIDA: boshlangan chaqiruvlar tugaydi va natijasi
    // yoziladi (Gemini'ga to'langan ish behuda ketmasin), qolgan guruhlarga esa
    // umuman tegilmaydi — ular keyingi so'rovda olinadi.
    if (remaining !== undefined && remaining() <= 0 && start + concurrency < groups.length) {
      deadlineHit = true;
      break;
    }
  }

  return { outcomes, batches, deadlineHit };
}
