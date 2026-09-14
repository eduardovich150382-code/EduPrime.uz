import type { BBox } from './types';

/**
 * Javob kalitini topish — NAQSH bilan, AI'siz.
 *
 * To'g'ri javob savol matnining ichida bo'lmasligi mumkin. Haqiqiy to'plamlarda
 * uch xil joylashuv uchraydi va uchalasi ham qo'llab-quvvatlanadi:
 *   · savoldan keyin darhol — "ans: B"              (inglizcha kitob)
 *   · bet yuqorisida yoki ostida qator               (turkcha kitob)
 *   · mavzu tugagach jadval, ko'pincha keyingi betda (o'zbekcha kitob)
 *
 * Bu Gemini ishi EMAS: naqsh qat'iy, chaqiruv esa pul va vaqt. Topilgan harf
 * modelga "berilgan kalit" sifatida uzatiladi va model o'z yechimini shu bilan
 * TEKSHIRADI (structure.ts).
 *
 * Fayl SOF — ./grouping kabi baza, tarmoq va brauzerga bog'lanmaydi. Blok turi
 * ham shu yerda strukturaviy tarzda e'lon qilingan: `LinearBlock` ni import
 * qilish ./grouping bilan aylanma bog'liqlik hosil qilardi.
 */

/** Kalit qayerdan olingani — S7 da ustoz "bu javob qayerdan keldi" deb ko'radi. */
export type KeySourceKind = 'inline' | 'page-key' | 'table';

export interface AnswerKeySource {
  page: number;
  kind: KeySourceKind;
}

export interface ResolvedAnswer {
  letter: string;
  source: AnswerKeySource;
}

export type KeyIssue = 'KEY_AMBIGUOUS' | 'NO_KEY_FOUND';

/** `findAnswerKeys` kiruvchi blokdan shuncha maydonni talab qiladi. */
export interface KeyCandidateBlock {
  page: number;
  bbox: BBox;
  text: string;
  globalIndex: number;
}

export interface KeyBlock {
  page: number;
  bbox: BBox;
  globalIndex: number;
  /** savol raqami → harf. Ikki marta uchragan raqam bu yerda YO'Q. */
  entries: Map<number, string>;
}

/**
 * `<son><ajratgich><harf>` juftligi. Ajratgich ixtiyoriy: `.` `-` `–` `)` yoki
 * probel ("1. B", "1-B", "2.B", "3) D", "4 C").
 *
 * Harfdan keyin harf, raqam yoki YOPUVCHI QAVS kelmasligi shart. Harf va raqam
 * "3 Dalada" kabi oddiy matnni kesadi; yopuvchi qavs esa variant qatorini:
 * "1. A) 2 B) 3 C) 4 D) 5" da juftliklar (1,A) (2,B) (3,C) (4,D) bo'lib
 * ko'rinadi va sonlari ham o'suvchi — qavssiz tekshiruvda bu savol javob
 * kaliti deb qabul qilinardi.
 */
const KEY_PAIR = /(\d{1,3})\s*[.\-–)]?\s*([A-E])(?![\p{L}\d)])/gu;

/** Kalit bloki deb hisoblash uchun eng kam juftlik soni. */
const MIN_KEY_PAIRS = 3;

/**
 * Juftliklar ular egallagan ORALIQNI shunchalik qoplashi kerak — butun blokni
 * emas. Oraliq: birinchi juftlik boshidan oxirgi juftlik oxirigacha. Nasriy
 * matnda juftliklar orasida uzun matn turadi va qamrov pasayadi; haqiqiy kalit
 * qatorida esa oraliq deyarli faqat juftliklardan iborat. Oraliq bo'yicha
 * o'lchash yorliqni ("CEVAP ANAHTARI", "Javoblar:") bepul qoldiradi.
 */
const MIN_KEY_COVERAGE = 0.6;

/** Kalit jadvali savoldan keyin keladi — shuncha betgacha oldinga qaraladi. */
const MAX_FORWARD_PAGES = 3;

/** Orqaga esa atigi bir bet: undan narisi boshqa mavzuning kaliti. */
const MAX_BACKWARD_PAGES = 1;

function nonSpaceLength(text: string): number {
  return text.replace(/\s+/g, '').length;
}

interface PairScan {
  pairs: { number: number; letter: string }[];
  coverage: number;
}

function scanPairs(text: string): PairScan {
  const pairs: { number: number; letter: string }[] = [];
  let matched = 0;
  let spanStart = -1;
  let spanEnd = 0;
  KEY_PAIR.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = KEY_PAIR.exec(text)) !== null) {
    pairs.push({ number: Number(match[1]), letter: match[2] });
    matched += nonSpaceLength(match[0]);
    if (spanStart < 0) spanStart = match.index;
    spanEnd = match.index + match[0].length;
  }
  if (spanStart < 0) return { pairs, coverage: 0 };
  const span = nonSpaceLength(text.slice(spanStart, spanEnd));
  return { pairs, coverage: span === 0 ? 0 : matched / span };
}

/**
 * Blok javob kaliti qatorimi.
 *
 * Uchala shart birga bajarilishi kerak: kamida uchta juftlik, sonlar o'suvchi
 * (kalit har doim savol tartibida yoziladi) va juftliklar matnni qoplaydi.
 * Bittasi yetarli emas — "1990-yilda B nuqtada" bitta juftlik ham bermaydi,
 * lekin uzun matnda tasodifan uchtasi topilishi mumkin.
 */
export function isKeyBlock(text: string): boolean {
  const { pairs, coverage } = scanPairs(text);
  if (pairs.length < MIN_KEY_PAIRS) return false;
  if (coverage < MIN_KEY_COVERAGE) return false;
  for (let i = 1; i < pairs.length; i++) {
    if (pairs[i].number <= pairs[i - 1].number) return false;
  }
  return true;
}

/**
 * Hujjatdagi barcha kalit bloklari.
 *
 * Kiruvchi massiv `flattenBlocks(manifest)` bo'lishi SHART, savol bloklari
 * emas: turkcha kitobda kalit qatori betning eng tepasida, birinchi savoldan
 * OLDIN turadi va `groupIntoQuestions` uni `preamble` ga (kolontitul tasmasiga
 * tushsa — `furniture` ga) tashlaydi. Savollar ustida qidirilsa bunday kalit
 * hech qachon topilmaydi.
 */
export function findAnswerKeys(blocks: readonly KeyCandidateBlock[]): KeyBlock[] {
  const keys: KeyBlock[] = [];
  for (const block of blocks) {
    if (!isKeyBlock(block.text)) continue;
    const { pairs } = scanPairs(block.text);
    const entries = new Map<number, string>();
    const duplicated = new Set<number>();
    for (const pair of pairs) {
      if (entries.has(pair.number)) duplicated.add(pair.number);
      entries.set(pair.number, pair.letter);
    }
    // Bir blok bitta raqamga ikki xil javob bersa, qaysi biri to'g'ri ekanini
    // bilmaymiz — taxmin qilmaymiz, o'sha raqam kalitsiz qoladi.
    for (const number of duplicated) entries.delete(number);
    if (entries.size === 0) continue;
    keys.push({ page: block.page, bbox: block.bbox, globalIndex: block.globalIndex, entries });
  }
  return keys;
}

/**
 * Savolga tegishli kalitni tanlaydi.
 *
 * Savol raqamlari kitobda qaytadan boshlanishi mumkin (turkcha kitobda har bet
 * alohida "Test"), shuning uchun raqam bo'yicha GLOBAL qidiruv xato. Tanlash
 * masofa bo'yicha:
 *   a) o'sha betdagi kalit           → 'page-key'
 *   b) keyingi eng yaqin bet, ≤3 bet → 'table'  (o'zbekcha jadval savoldan keyin)
 *   c) oldingi eng yaqin bet, ≤1 bet → 'table'
 *
 * Ikki nomzod teng masofada bo'lsa — `KEY_AMBIGUOUS`, taxmin qilinmaydi:
 * noto'g'ri javob bilan chiqqan savol umuman javobsiz savoldan battar.
 */
export function resolveAnswer(
  number: number | null,
  page: number,
  keys: readonly KeyBlock[],
): { answer: ResolvedAnswer | null; issue: KeyIssue | null } {
  if (number === null) return { answer: null, issue: 'NO_KEY_FOUND' };

  const candidates = keys.filter((k) => k.entries.has(number));
  if (candidates.length === 0) return { answer: null, issue: 'NO_KEY_FOUND' };

  const samePage = candidates.filter((k) => k.page === page);
  if (samePage.length > 1) return { answer: null, issue: 'KEY_AMBIGUOUS' };
  if (samePage.length === 1) {
    return {
      answer: { letter: samePage[0].entries.get(number)!, source: { page, kind: 'page-key' } },
      issue: null,
    };
  }

  const reachable = candidates.filter((k) => {
    const delta = k.page - page;
    return delta > 0 ? delta <= MAX_FORWARD_PAGES : -delta <= MAX_BACKWARD_PAGES;
  });
  if (reachable.length === 0) return { answer: null, issue: 'NO_KEY_FOUND' };

  const distance = (k: KeyBlock): number => Math.abs(k.page - page);
  const nearest = Math.min(...reachable.map(distance));
  const closest = reachable.filter((k) => distance(k) === nearest);
  if (closest.length > 1) return { answer: null, issue: 'KEY_AMBIGUOUS' };

  const key = closest[0];
  return {
    answer: { letter: key.entries.get(number)!, source: { page: key.page, kind: 'table' } },
    issue: null,
  };
}

/** Blok OXIRIDAGI "ans: B" — boshqa joyda uchrasa savol matnining bir qismi. */
const INLINE_ANSWER = /\bans\s*[:.]?\s*([A-E])\s*$/i;

/**
 * Savol matnining ichidagi kalit ("ans: B") — eng ustun manba.
 *
 * Harf matndan OLIB TASHLANADI: savol matnida javob turib qolsa, test
 * yechayotgan o'quvchi uni ko'rib qoladi.
 */
export function extractInlineAnswer(text: string): { letter: string; text: string } | null {
  const match = INLINE_ANSWER.exec(text);
  if (!match) return null;
  return {
    letter: match[1].toUpperCase(),
    text: text.slice(0, match.index).trimEnd(),
  };
}
