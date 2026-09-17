import { imageTokensOf, type StructuredOption } from './structure';
import { numbersOf, unmaskImageTokens, type MaskedToken } from './translate';

/**
 * Chatdan qaytgan JSON ni tekshirish va `ImportDraft` ustunlariga aylantirish —
 * ikkinchi import yo'lining ikkinchi yarmi.
 *
 * `chat-export.ts` kabi SOF: baza yo'q, shuning uchun har tekshiruvni test
 * to'g'ridan-to'g'ri qaytara oladi. Marshrut (`apply/route.ts`) faqat qatorni
 * o'qiydi, shu funksiyani chaqiradi va natijani yozadi.
 *
 * Tekshiruv HAR SAVOL UCHUN ALOHIDA: guruhdagi bittasi yiqilsa qolgani
 * baribir yoziladi. `translateBatch` dagi bilan bir xil sabab — qayta ishlash
 * ustozning vaqti, bitta buzuq savol esa qolgan 49 tasini yo'qotmasligi kerak.
 */

/** Variantlarning eng kam va eng ko'p soni — A dan H gacha. */
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 8;

/** Chatdan kelgan bitta savol. */
export interface ChatItem {
  order: number;
  text: string;
  options: string[];
  answer: string;
}

/** Ustozga ko'rsatiladigan muammo — kod `issues` ga ham tushishi mumkin. */
export interface Problem {
  order: number;
  code: string;
}

export type ApplyResult =
  | { ok: false; code: string }
  | { ok: true; text: string; options: StructuredOption[]; correctAnswer: string; flags: string[] };

export interface ApplySource {
  /**
   * Manba matni — son solishtiruvi uchun. Marshrut uni `textOriginal` va
   * `optionsOriginal` dan quradi: xom blokda variantlar matn ichida, lekin
   * strukturalangan draftda alohida ustunda turadi.
   */
  sourceText: string;
  /**
   * Qisqa token → haqiqiy token. Marshrut uni `chat-export.ts#tokenMapOf`
   * bilan draftning O'ZIDAN qayta hisoblaydi — bazada saqlangan nusxadan
   * emas, chunki saqlangan nusxa job qayta yaratilganda yo'qolardi.
   */
  tokenMap: Record<string, string>;
  /** `raw.answerKey.letter` — kitobdan naqsh bilan topilgan javob. */
  answerKey: string | null;
  /**
   * `raw.number` — kitobdagi savol raqami ("12." ko'rinishida matn boshida).
   *
   * Son solishtiruvidan chiqarib tashlanadi: xom blok matni raqam bilan
   * BOSHLANADI, chat javobidagi "text" esa undan tozalangan bo'ladi. Aks holda
   * deyarli HAR savol yolg'on `NUMBER_MISMATCH` olib, bayroq ma'nosini
   * butunlay yo'qotardi.
   */
  sourceNumber: number | null;
  /**
   * `raw.mode` — savol olingan sahifaning rejimi (manifest.ts#SourceMode).
   * Eski draftlarda yo'q, shuning uchun `string | null`: bu yerda qiymatni
   * tor turga majburlashdan foyda yo'q, baza JSON'ida nima bo'lsa shu keladi.
   */
  sourceMode: string | null;
}

/**
 * Manba matni ishonchsiz rejimlar: `skan` — OCR, `qol` — ustoz terib chiqqan
 * matn. Ikkalasida ham chat matnni SAHIFA RASMIGA qarab tuzatadi, ya'ni
 * sonlar qonuniy ravishda farq qiladi.
 */
const UNRELIABLE_TEXT_MODES = ['skan', 'qol'];

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function same(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/** Ro'yxatdan qiymatning BITTA uchrashini olib tashlaydi. */
export function dropOnce(values: readonly string[], value: string | null): string[] {
  if (value === null) return [...values];
  const index = values.indexOf(value);
  return index === -1 ? [...values] : [...values.slice(0, index), ...values.slice(index + 1)];
}

/**
 * Rasm tokenlarini matndan olib tashlaydi — son solishtiruvidan OLDIN.
 *
 * Tokenning ichidagi cuid da raqamlar bor (`cmu2gfe670005lc0438g6uky5`), manba
 * matnida esa token umuman bo'lmaydi: `BLOCK` bosqichida rasmlar `raw.images`
 * da turadi. Tozalamasdan solishtirilsa HAR rasmli savol yolg'on
 * `NUMBER_MISMATCH` olardi va bayroq ma'nosini butunlay yo'qotardi.
 *
 * Regex EMAS, `imageTokensOf`: `structure.ts` dagi naqsh ataylab eksport
 * qilinmagan (`g` bayrog'i bilan u holatli).
 */
export function withoutImages(text: string): string {
  let out = text;
  for (const token of imageTokensOf(text)) out = out.replace(token, ' ');
  return out;
}

/**
 * Model javobidagi massivni topadi.
 *
 * Chatdagi model ko'pincha massivni o'radi ("results", "questions") — ustozni
 * JSON ni qo'lda ochishga majburlashdan ko'ra ikkita tanish kalitni ham
 * qabul qilgan ma'qul.
 */
function itemsOf(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  const record = asRecord(raw);
  for (const key of ['results', 'questions', 'items']) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return null;
}

/**
 * Chat javobini `ChatItem` massiviga aylantiradi.
 *
 * `order` butun son bo'lmasa element hech qanday draftga moslashmaydi va uni
 * ustozga ko'rsatadigan `order` ham yo'q — shuning uchun u `-1` bilan
 * belgilanadi.
 */
export function parseChatJson(raw: unknown): { items: ChatItem[]; problems: Problem[] } {
  const source = itemsOf(raw);
  if (!source) return { items: [], problems: [{ order: -1, code: 'JSON_INVALID' }] };

  const items: ChatItem[] = [];
  const problems: Problem[] = [];

  for (const entry of source) {
    const r = asRecord(entry);
    const order = Number(r.order);
    if (!Number.isInteger(order)) {
      problems.push({ order: -1, code: 'ORDER_INVALID' });
      continue;
    }
    items.push({
      order,
      text: typeof r.text === 'string' ? r.text : '',
      options: Array.isArray(r.options) ? r.options.map((o) => (typeof o === 'string' ? o : '')) : [],
      answer: typeof r.answer === 'string' ? r.answer : '',
    });
  }

  return { items, problems };
}

/**
 * Bitta savolni tekshiradi va yoziladigan shaklga keltiradi.
 *
 * `label` chatdan SO'RALMAYDI — u indeksdan qo'yiladi. Modeldan kam narsa
 * so'ralsa u kam xato qiladi, yorliq esa variantlar tartibidan deterministik
 * kelib chiqadi.
 */
export function applyChatItem(source: ApplySource, item: ChatItem): ApplyResult {
  if (item.options.length < MIN_OPTIONS || item.options.length > MAX_OPTIONS) {
    return { ok: false, code: 'OPTION_COUNT_INVALID' };
  }

  const answer = item.answer.trim().toUpperCase();
  const index = answer.length === 1 ? answer.charCodeAt(0) - 65 : -1;
  if (index < 0 || index >= item.options.length) return { ok: false, code: 'ANSWER_INVALID' };

  const options: StructuredOption[] = item.options.map((text, i) => ({
    label: String.fromCharCode(65 + i),
    text,
    imageToken: null,
  }));

  // Har yozuv `from: 'text'`: eksport tokenni qaysi maydondan olganini
  // saqlamaydi va saqlashi ham shart emas — yo'qolgan token savol matnining
  // oxiriga qaytariladi, ustoz esa uni ko'rib chiqish oynasida joyiga suradi.
  const map = new Map<string, MaskedToken>(
    Object.entries(source.tokenMap).map(([key, token]) => [key, { token, from: 'text' as const }]),
  );

  const restored = unmaskImageTokens(item.text, options, map);
  const flags = [...restored.issues];

  const allText = [restored.text, ...restored.options.map((o) => o.text)].join('\n');
  // `$` soni toq — ochilib yopilmagan matematika. Qayerda tugashini bilmasdan
  // tuzatib bo'lmaydi, shuning uchun faqat bayroq: savol baribir yoziladi.
  if ((allText.match(/\$/g) ?? []).length % 2 !== 0) flags.push('LATEX_UNBALANCED');

  // Sonni model o'zgartirib yuborishi boshqa hech qanday tekshiruv bilan
  // tutilmaydi va test bankida JIMGINA noto'g'ri javobga olib keladi.
  // Savol raqami IKKALA tomondan ham chiqariladi: chat uni ba'zan saqlaydi,
  // ba'zan tashlaydi — ikkalasi ham xato emas.
  //
  // Skan va qo'lda terilgan sahifada esa solishtiruv UMUMAN bajarilmaydi:
  // manba `textOriginal` ning o'zi ishonchsiz, farq esa deyarli har savolda
  // chiqib, bayroqni ma'nosiz shovqinga aylantiradi.
  if (!UNRELIABLE_TEXT_MODES.includes(source.sourceMode ?? '')) {
    const number = source.sourceNumber === null ? null : String(source.sourceNumber);
    const sourceNumbers = dropOnce(numbersOf(withoutImages(source.sourceText)), number);
    const candidateNumbers = dropOnce(numbersOf(withoutImages(allText)), number);
    if (!same(sourceNumbers, candidateNumbers)) flags.push('NUMBER_MISMATCH');
  }

  // Kitobdan naqsh bilan topilgan kalit ustun EMAS (chatdagi model savolni
  // o'zi ham yechadi), lekin farq jimgina yutilmaydi — ustoz ko'rib chiqsin.
  if (source.answerKey && source.answerKey !== answer) flags.push('ANSWER_MISMATCH');

  return {
    ok: true,
    text: restored.text,
    options: restored.options,
    correctAnswer: answer,
    flags: [...new Set(flags)],
  };
}
