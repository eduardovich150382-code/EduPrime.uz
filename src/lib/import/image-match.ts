import { dropOnce, withoutImages } from './chat-apply';
import { QUESTION_START_PATTERNS } from './grouping';
import { numbersOf } from './translate';

/**
 * Chat yo'lidan kelgan savollarga ZIP'dagi rasmlarni biriktirish.
 *
 * `chat-export.ts` kabi SOF: baza, tarmoq va brauzer yo'q. Marshrut
 * (`image-map/route.ts`) draftlarni o'qiydi, klient esa shu funksiya bilan
 * ularni AI import bergan savollarga moslaydi.
 *
 * Kalit — TARTIB, kitobdagi savol raqami emas: turk kitobida raqamlash har
 * bo'limda 1 dan qayta boshlanadi, chatdan esa raqam umuman so'ralmaydi.
 * Tartibning zaif joyi — chat bitta savolni tashlasa yoki ikkitasini
 * birlashtirsa undan keyingi HAMMA rasm jimgina siljiydi. Shu sababli ikki
 * to'siq bor: soni teng bo'lmasa umuman biriktirilmaydi, teng bo'lsa har
 * juftlikning sonlari solishtiriladi.
 */

export interface MapEntry {
  index: number;
  order: number;
  images: string[];
  numbers: string[];
}

/** AI import bergan savol. */
export interface MatchInput {
  text: string;
  options: string[];
}

export interface Pair {
  index: number;
  images: string[];
  score: number | null;
  flagged: boolean;
}

export interface MatchResult {
  countMismatch: boolean;
  pairs: Pair[];
  /** Biriktirilmagan, rasmi BOR yozuvlar. */
  leftover: MapEntry[];
  /** Biriktirilgan rasmlar soni. */
  attached: number;
}

/** Shundan past ulushda juftlik ustozga ko'rsatiladi. */
const FLAG_BELOW = 0.5;

/**
 * Draftning son belgisi — tildan qat'i nazar o'zgarmaydigan yagona arzon belgi.
 *
 * Rasm tokenlari olib tashlanadi: cuid ichidagi raqamlar son emas. Savol
 * raqami ham olib tashlanadi: chatdan raqam so'ralmaydi, aks holda yagona soni
 * o'z raqami bo'lgan savol doim 0 ball olib, yolg'on bayroq berardi.
 *
 * Raqam avval matn BOSHIDAN kesiladi — `raw.number` ga ishonib bo'lmaydi:
 * guruhlash yulduzchali savolda ("37*.") qo'shni raqamni olgan holat bor.
 * Naqshlar guruhlashdagi bilan bir xil, aks holda ikki joy turlicha "savol
 * boshi" deb hisoblardi. Prefiks kesilsa `raw.number` qayta ishlatilmaydi:
 * "8. Kuch 8 N" da matn ichidagi 8 ham yo'qolardi. Matn raqamsiz boshlansa
 * (PDF'da raqam alohida blokda qolgan) — zaxira sifatida `raw.number` bir
 * marta olib tashlanadi.
 */
export function draftNumbersOf(sourceText: string, number: unknown): string[] {
  const text = withoutImages(sourceText);
  for (const pattern of QUESTION_START_PATTERNS) {
    if (pattern.test(text)) return numbersOf(text.replace(pattern, ' '));
  }
  return dropOnce(numbersOf(text), typeof number === 'number' ? String(number) : null);
}

/**
 * Draft sonlaridan nechtasi savolda uchraganining ulushi.
 *
 * Multiset sifatida: draftdagi ikkita "2" savoldagi bitta "2" bilan to'liq
 * mos deb hisoblanmasin.
 */
function scoreOf(draftNumbers: readonly string[], question: MatchInput): number | null {
  if (draftNumbers.length === 0) return null;
  const pool = numbersOf(withoutImages([question.text, ...question.options].join('\n')));
  let hits = 0;
  for (const value of draftNumbers) {
    const at = pool.indexOf(value);
    if (at === -1) continue;
    pool.splice(at, 1);
    hits++;
  }
  return hits / draftNumbers.length;
}

export function matchByOrder(entries: MapEntry[], questions: MatchInput[]): MatchResult {
  // Yarim-yorti biriktirish yo'q: siljigan tartibda noto'g'ri joylashgan
  // rasmni ustoz sezmay qoladi, biriktirilmagani esa ko'rinib turadi.
  if (entries.length !== questions.length) {
    return {
      countMismatch: true,
      pairs: [],
      leftover: entries
        .filter((e) => e.images.length > 0)
        .map((e) => ({ ...e, images: [...e.images], numbers: [...e.numbers] })),
      attached: 0,
    };
  }

  const pairs = entries.map((entry, i): Pair => {
    const score = scoreOf(entry.numbers, questions[i]);
    // Bayroq savolni yiqitmaydi — rasm baribir biriktiriladi, ustoz ko'rib chiqadi.
    return { index: entry.index, images: [...entry.images], score, flagged: score !== null && score < FLAG_BELOW };
  });

  return {
    countMismatch: false,
    pairs,
    leftover: [],
    attached: pairs.reduce((sum, p) => sum + p.images.length, 0),
  };
}
