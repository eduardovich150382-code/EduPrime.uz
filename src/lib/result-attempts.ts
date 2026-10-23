import { buildQuery, DEFAULT_FILTERS, TEST_GOALS, type TestGoal } from './tests-filters';

// Natija sahifasidagi urinishlar tarixi. API barcha natijalarni emas, faqat
// jami sonni, joriy natijadan oldingilar sonini va oxirgi 5 tasini beradi —
// ko'p marta yechilgan testda ham javob yengil qoladi. Raqamlash shu uch
// qiymatdan tiklanadi, shuning uchun bu yerda sof funksiyada (Vitest).

export interface AttemptSummary {
  id: string;
  score: number;
  maxScore: number;
  completedAt: string;
}

// GET /api/results/[id] javobidagi `attempts` maydoni.
export interface AttemptsPayload {
  total: number;
  /** Joriy natijadan oldin topshirilganlar soni (completedAt, teng bo'lsa id bo'yicha). */
  olderCount: number;
  /** Eng yangi urinishlar (ko'pi bilan 5 ta), tartibi kafolatlanmagan. */
  recent: AttemptSummary[];
}

export interface NumberedAttempt extends AttemptSummary {
  number: number;
}

export interface AttemptHistory {
  currentNumber: number;
  total: number;
  /** O'sish tartibida — "1-urinish, 2-urinish, ..." o'qilishi uchun. */
  recent: NumberedAttempt[];
}

function newestFirst(a: AttemptSummary, b: AttemptSummary): number {
  const diff = new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
  if (diff !== 0) return diff;
  // API'dagi `orderBy: [completedAt desc, id desc]` bilan bir xil tie-break
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

export function buildAttemptHistory(payload: AttemptsPayload): AttemptHistory {
  // `recent` eng yangilari bo'lgani uchun eng yangisining raqami — `total`.
  // count va findMany alohida so'rovlar: oraliqda yangi natija qo'shilsa
  // raqam 0 yoki manfiyga tushib qolmasin.
  const sorted = [...payload.recent].sort(newestFirst);
  const total = Math.max(payload.total, sorted.length);
  const recent = sorted
    .map((attempt, i) => ({ ...attempt, number: Math.max(1, total - i) }))
    .reverse();
  return { currentNumber: Math.max(1, payload.olderCount + 1), total, recent };
}

function isTestGoal(value: string): value is TestGoal {
  return (TEST_GOALS as readonly string[]).includes(value);
}

// "Testlarga qaytish" — foydalanuvchini shu test turiga filtrlangan
// ro'yxatga qaytaradi. Tur noma'lum bo'lsa oddiy /tests.
export function testsHrefForType(type: string | null | undefined): string {
  if (!type || !isTestGoal(type)) return '/tests';
  return `/tests${buildQuery({ ...DEFAULT_FILTERS, type })}`;
}
