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
          options: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                label: { type: SchemaType.STRING },
                text: { type: SchemaType.STRING },
                imageToken: { type: SchemaType.STRING },
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
        imageToken: typeof o.imageToken === 'string' && o.imageToken ? o.imageToken : null,
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

  const prepared = inputs.map(prepareInput);
  const groups = chunk(prepared, group);

  const outcomes: TranslateOutcome[] = [];
  let batches = 0;
  let deadlineHit = false;

  for (let start = 0; start < groups.length; start += concurrency) {
    const wave = groups.slice(start, start + concurrency);
    const settled = await Promise.allSettled(
      wave.map((entries) => resilient({ items: entries.map((e) => e.input), ...meta })),
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
          });
          continue;
        }

        const verdict = verifyTranslation(entry.input, candidate);
        if (verdict.fatal) {
          outcomes.push({
            order: entry.input.order,
            result: null,
            tokens,
            failed: true,
            model: settledResult.value.model,
            error: new Error(verdict.fatal),
          });
          continue;
        }

        outcomes.push({
          order: entry.input.order,
          result: {
            text: candidate.text,
            options: candidate.options,
            issues: [...new Set([...entry.issues, ...candidate.issues, ...verdict.flags])],
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
