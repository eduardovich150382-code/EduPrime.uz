import type { AIImportedQuestion, QuestionOption, QuestionType } from '@/types';
import { imageTokensOf, withoutImageTokens } from './image-token';
import { labelToIndex, MAX_OPTIONS, MIN_OPTIONS, optionLabel } from './option-labels';

/**
 * Ustoz chatdan nusxalab qo'ygan JSON ni savollarga aylantirish.
 *
 * Nega server emas: bu qadamda Gemini umuman kerak emas — chat savollarni
 * o'zi JSON qilib bergan. Server chaqiruvi faqat kunlik kvota, 60 soniyalik
 * chegara va `maxOutputTokens` da kesilish xavfini qo'shardi.
 *
 * SOF: tarmoq ham, baza ham yo'q, shuning uchun har qoidani test
 * to'g'ridan-to'g'ri tekshira oladi.
 */

/** ~2 MB. JS belgilarida sanaladi — baytda emas, chunki tahlil ham shunday. */
export const MAX_PASTE_CHARS = 2 * 1024 * 1024;
export const MAX_PASTED_QUESTIONS = 500;

export type PastedProblemCode =
  | 'JSON_INVALID'
  | 'JSON_TRUNCATED'
  | 'NOT_ARRAY'
  | 'EMPTY'
  | 'TOO_LARGE'
  | 'TOO_MANY'
  | 'TEXT_EMPTY'
  | 'OPTION_COUNT_INVALID';

export type PastedWarningCode =
  | 'ANSWER_MISSING'
  | 'ANSWER_UNKNOWN'
  | 'LATEX_UNBALANCED'
  | 'IMAGE_TOKEN_STRIPPED';

/** `order` — massivdagi O'RIN (indeks+1). Hujjat darajasidagi muammoda -1. */
export interface PastedProblem {
  order: number;
  code: PastedProblemCode;
}

export interface PastedWarning {
  order: number;
  code: PastedWarningCode;
}

export interface PastedParseResult {
  /** HALOKATLI muammo bo'lsa — HAR DOIM bo'sh. */
  questions: AIImportedQuestion[];
  problems: PastedProblem[];
  warnings: PastedWarning[];
  /** JSON dagi elementlar soni — 0 savol qaytganda ham ustozga ko'rsatiladi. */
  totalSeen: number;
}

/**
 * Kod qobig'ini (uch teskari apostrof) olib tashlaydi.
 *
 * Chat javobni deyarli har doim shu qobiq bilan beradi. Boshqa "aqlli"
 * tozalash QILINMAYDI: matn ichidan JSON ni taxmin bilan qidirish kesilgan
 * javobni to'g'ri deb o'qib yuborishi mumkin.
 */
export function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) return trimmed;
  const withoutOpen = trimmed.replace(/^```[^\n]*\n?/, '');
  return withoutOpen.replace(/```\s*$/, '').trim();
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Model javobidagi massivni topadi.
 *
 * `chat-apply.ts#itemsOf` bilan bir xil kalitlar — ustozni JSON ni qo'lda
 * ochishga majburlashdan ko'ra tanish o'ramni qabul qilgan ma'qul. `questions`
 * kaliti ayni paytda `/api/ai/import` javobining o'zi.
 */
function itemsOf(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  const record = asRecord(raw);
  for (const key of ['questions', 'results', 'items']) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return null;
}

/**
 * Javob o'rtada uzilganmi.
 *
 * Kesilgan JSON ustoz uchun butunlay boshqa vaziyat: tuzatadigan narsa yo'q,
 * chatdan davomini so'rash kerak. `JSON_INVALID` bilan bir xil xabar bersak,
 * u JSON ni bekorga qo'lda tekshirib chiqardi.
 */
function looksTruncated(text: string): boolean {
  const open = text[0];
  if (open !== '[' && open !== '{') return false;
  const close = text[text.length - 1];
  return close !== (open === '[' ? ']' : '}');
}

/** `$` soni toq — ochilib yopilmagan matematika (chat-apply.ts dagi bilan bir xil qoida). */
function latexUnbalanced(parts: string[]): boolean {
  const joined = parts.join('\n');
  return (joined.match(/\$/g) ?? []).length % 2 !== 0;
}

export function parsePastedQuestions(text: string): PastedParseResult {
  const failed = (code: PastedProblemCode, totalSeen = 0): PastedParseResult => ({
    questions: [],
    problems: [{ order: -1, code }],
    warnings: [],
    totalSeen,
  });

  // Chegara parse'dan OLDIN: 2 MB li matnni JSON.parse qilish sahifani
  // muzlatardi, xato xabari esa baribir bir xil.
  if (text.length > MAX_PASTE_CHARS) return failed('TOO_LARGE');

  const cleaned = stripCodeFences(text);
  if (!cleaned) return failed('EMPTY');

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return failed(looksTruncated(cleaned) ? 'JSON_TRUNCATED' : 'JSON_INVALID');
  }

  const items = itemsOf(parsed);
  if (!items) return failed('NOT_ARRAY');
  if (items.length === 0) return failed('EMPTY');
  if (items.length > MAX_PASTED_QUESTIONS) return failed('TOO_MANY', items.length);

  const questions: AIImportedQuestion[] = [];
  const problems: PastedProblem[] = [];
  const warnings: PastedWarning[] = [];

  items.forEach((entry, index) => {
    // Tartib — massivdagi O'RIN. `order` maydoni o'qilmaydi: rasm biriktirish
    // (image-match.ts) N-savol ↔ N-draft indeksiga tayanadi, `order` bo'yicha
    // qayta tartiblash esa hamma rasmni bir qadamga siljitardi.
    const order = index + 1;
    const raw = asRecord(entry);
    const rawOptions = Array.isArray(raw.options) ? raw.options : [];
    // Shakl HAR ELEMENT uchun alohida aniqlanadi: o'ralgan javobda ikkala
    // shakl ham kelishi mumkin.
    const isChatShape = rawOptions.length > 0 && typeof rawOptions[0] === 'string';

    const type: QuestionType = raw.type === 'OPEN_ENDED' ? 'OPEN_ENDED' : 'MULTIPLE_CHOICE';
    const options: QuestionOption[] = rawOptions.map((option, i) => {
      const record = asRecord(option);
      return {
        // Yorliq HAR DOIM indeksdan qayta qo'yiladi — manbadagisi ishonchsiz.
        label: optionLabel(i),
        text: isChatShape ? str(option) : str(record.text),
        image: isChatShape || typeof record.image !== 'string' ? null : record.image,
      };
    });

    const itemWarnings: PastedWarningCode[] = [];

    // Rasm tokeni: bu oqimda rasm B2 (ImportImageAttach) orqali ulanadi,
    // matn ichida qolgan token esa savolda ko'rinib turardi. Regex EMAS —
    // `image-token.ts` dagi umumiy yordamchi.
    const hasToken = [str(raw.text), ...options.map((o) => o.text)].some(
      (t) => imageTokensOf(t).length > 0,
    );
    const clean = (value: string) => withoutImageTokens(value).replace(/\s+/g, ' ').trim();
    const questionText = hasToken ? clean(str(raw.text)) : str(raw.text).trim();
    if (hasToken) {
      for (const option of options) option.text = clean(option.text);
      itemWarnings.push('IMAGE_TOKEN_STRIPPED');
    }

    // ---- HALOKATLI tekshiruvlar ----
    // Bitta savolni jimgina tashlab ketish undan keyingi HAMMA rasmni bir
    // qadamga siljitadi, B2 esa qo'shni siljishni sonlar bilan tutmaydi.
    // Shuning uchun "hammasi yoki hech narsa". Muammolar baribir hamma
    // element uchun yig'iladi — ustoz to'liq ro'yxatni bir ko'rishda ko'rsin.
    if (!questionText) problems.push({ order, code: 'TEXT_EMPTY' });
    // 2-8 chegarasi faqat variantli savolga: `/api/ai/import` javobidagi
    // OPEN_ENDED savol qonuniy ravishda `options: []` bilan keladi va uni
    // halokatli deb sanash butun paketni nolga tushirardi.
    if (type !== 'OPEN_ENDED' && (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS)) {
      problems.push({ order, code: 'OPTION_COUNT_INVALID' });
    }

    // ---- OGOHLANTIRISHLAR (savol qoladi) ----
    let correctAnswer = '';
    if (type === 'OPEN_ENDED') {
      correctAnswer = str(raw.correctAnswer).trim();
      if (!correctAnswer) itemWarnings.push('ANSWER_MISSING');
    } else {
      const answer = isChatShape ? str(raw.answer) : str(raw.correctAnswer);
      if (!answer.trim()) {
        itemWarnings.push('ANSWER_MISSING');
      } else {
        const at = labelToIndex(answer);
        // Javob variantlar ichida bo'lmasa `correctAnswer` bo'sh qoladi —
        // ustoz qo'lda tanlaydi. Taxmin qilib qo'yish jimgina noto'g'ri
        // baholashga olib borardi.
        if (at < 0 || at >= options.length) itemWarnings.push('ANSWER_UNKNOWN');
        else correctAnswer = optionLabel(at);
      }
    }

    if (latexUnbalanced([questionText, ...options.map((o) => o.text)])) {
      itemWarnings.push('LATEX_UNBALANCED');
    }

    for (const code of itemWarnings) warnings.push({ order, code });

    // `confidence` bu yerda AI ishonchi EMAS — import ogohlantirishi.
    // Mavjud `LOW_CONFIDENCE_THRESHOLD` (0.85) belgisini qayta ishlatadi,
    // shuning uchun ogohlantirishli savol sahifada "tekshiring" bo'lib
    // ajraladi. Bazaga aloqasi yo'q: `aiConfidence` sahifa holatidan nariga
    // chiqmaydi (`mapQuestionForApi` uni yubormaydi).
    const rule = itemWarnings.length > 0 ? 0.5 : 1;
    // API shaklida asl qiymat bo'lsa u PASAYTIRILADI, ko'tarilmaydi: AI ning
    // o'z past ishonchi ("bu savolni tekshiring") yo'qolmasligi kerak.
    const source = typeof raw.confidence === 'number' ? raw.confidence : null;
    const confidence = source === null ? rule : Math.min(source, rule);

    questions.push({
      text: questionText,
      options: type === 'OPEN_ENDED' ? [] : options,
      correctAnswer,
      explanation: typeof raw.explanation === 'string' ? raw.explanation : undefined,
      images: Array.isArray(raw.images)
        ? raw.images.filter((image): image is string => typeof image === 'string')
        : undefined,
      type,
      topic: str(raw.topic).slice(0, 100),
      bloomLevel: str(raw.bloomLevel),
      difficulty: Number.isInteger(raw.difficulty) ? (raw.difficulty as number) : null,
      confidence,
    });
  });

  // Halokatli muammo bo'lsa HECH BIR savol qo'shilmaydi.
  if (problems.length > 0) {
    return { questions: [], problems, warnings, totalSeen: items.length };
  }
  return { questions, problems, warnings, totalSeen: items.length };
}
