import { shuffleArray } from './shuffle';

/**
 * MATCHING savol turi uchun umumiy yordamchi funksiyalar. Chap va o'ng
 * ustunlar indeks bo'yicha bog'langan — left[i] right[i] bilan juftlashadi
 * (bu "canonical" — asl, autor tomonidan kiritilgan tartib).
 *
 * Xavfsizlik: talabaga ko'rsatiladigan o'ng ustun har doim aralashtiriladi
 * (server, urug'langan/seeded tartibda — /lib/shuffle.ts'dagi boshqa
 * variant aralashtirish bilan bir xil naqsh), lekin qaysi aralashtirilgan
 * pozitsiya qaysi original juftlikka tegishli ekani (indexOrder) hech
 * qachon mijozga yuborilmaydi — faqat serverda hisoblanadi.
 *
 * Talaba yechish vaqtida "aralashtirilgan pozitsiya" formatida javob
 * yuboradi (chunki shuni ko'rib turibdi); server buni darhol "canonical"
 * (asl) indekslarga tarjima qilib, SHU holatda saqlaydi — shu sababli
 * natija sahifasi hech qanday shuffle formulasini qayta hisoblamasdan,
 * to'g'ridan-to'g'ri solishtira oladi.
 */

export interface MatchingPairs {
  left: string[];
  right: string[];
}

export function parseMatchingPairs(options: unknown): MatchingPairs {
  const o = options as any;
  if (o && Array.isArray(o.left) && Array.isArray(o.right) && o.left.length === o.right.length) {
    return {
      left: o.left.map((x: unknown) => (typeof x === 'string' ? x : '')),
      right: o.right.map((x: unknown) => (typeof x === 'string' ? x : '')),
    };
  }
  return { left: [], right: [] };
}

// indexOrder[j] = j-pozitsiyadagi (aralashtirilgan) o'ng element qaysi
// canonical indeksdan kelganini bildiradi.
export function shuffleMatchingIndexOrder(pairCount: number, seed: number): number[] {
  const indices = Array.from({ length: pairCount }, (_, i) => i);
  return shuffleArray(indices, seed);
}

// Talaba yuborgan (aralashtirilgan pozitsiya) javoblarni canonical
// indekslarga o'giradi — server tomonida baholash va saqlashdan oldin
// bir marta chaqiriladi.
export function translateMatchingToCanonical(shuffledMatches: (number | null)[], indexOrder: number[]): (number | null)[] {
  return shuffledMatches.map((pos) => {
    if (pos === null || pos === undefined || pos < 0 || pos >= indexOrder.length) return null;
    return indexOrder[pos];
  });
}

export function encodeMatchingAnswer(matches: (number | null)[]): string {
  return JSON.stringify(matches);
}

export function parseMatchingAnswer(answer: string | null | undefined): (number | null)[] {
  if (!answer) return [];
  try {
    const parsed = JSON.parse(answer);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x) => (typeof x === 'number' ? x : null));
  } catch {
    return [];
  }
}

// canonicalMatches[i] === i bo'lsa, i-qator to'g'ri (talaba to'g'ri
// juftlikni tanlagan) — bu yerda hech qanday shuffle kerak emas, chunki
// saqlangan javob allaqachon canonical formatda.
export function isMatchingRowCorrect(canonicalMatches: (number | null)[], rowIndex: number): boolean {
  return canonicalMatches[rowIndex] === rowIndex;
}

export function isMatchingCorrect(canonicalMatches: (number | null)[], pairCount: number): boolean {
  if (pairCount === 0 || canonicalMatches.length !== pairCount) return false;
  return canonicalMatches.every((c, i) => c === i);
}
