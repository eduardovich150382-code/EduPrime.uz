// /tests kartasining holat mantig'i — komponentsiz (Vitest'da) tekshirilishi
// uchun alohida sof funksiyalarda. Karta faqat shu natijani chizadi.

// /api/results?brief=true javobidagi bitta qator. Savol/javob ma'lumoti
// ataylab yo'q — kartaga faqat ball va natija sahifasiga havola kerak.
export interface BriefResult {
  id: string;
  testId: string;
  completedAt: string;
  score: number;
  maxScore: number;
  percentage: number;
}

export interface CardAccessInfo {
  isFree: boolean;
  accessType?: string;
  price?: number;
}

export type CardState =
  | { kind: 'solved'; resultId: string; score: number; maxScore: number; percentage: number }
  | { kind: 'start' }
  | { kind: 'buy'; price: number }
  | { kind: 'upgrade'; plan: 'premium' | 'teacher' | 'other' };

const NEW_TEST_DAYS = 7;
const DAY_MS = 1000 * 60 * 60 * 24;

export function isNewTest(createdAt?: string, now: Date = new Date()): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return (now.getTime() - created) / DAY_MS <= NEW_TEST_DAYS;
}

// Har test uchun eng yangi natija. API tartibiga tayanmaymiz: avval
// `new Map(results.map(...))` desc tartibda oxirgi yozuvni — ya'ni eng
// eskisini — saqlab qolardi.
export function latestResultByTest(results: BriefResult[]): Map<string, BriefResult> {
  const latest = new Map<string, BriefResult>();
  for (const r of results) {
    const prev = latest.get(r.testId);
    if (!prev || new Date(r.completedAt).getTime() > new Date(prev.completedAt).getTime()) {
      latest.set(r.testId, r);
    }
  }
  return latest;
}

// Eski karta xatti-harakati saqlanadi: natija bo'lsa qulf ko'rsatilmaydi,
// natijasiz pullik testda esa obuna holatidan qat'i nazar qulf tugmasi
// chiqadi. Haqiqiy himoya baribir serverda (check-access, lib/access.ts).
export function getCardState(test: CardAccessInfo, result?: BriefResult): CardState {
  if (result) {
    return {
      kind: 'solved',
      resultId: result.id,
      score: result.score,
      maxScore: result.maxScore,
      percentage: result.percentage,
    };
  }
  if (test.isFree || test.accessType === 'free') return { kind: 'start' };
  if (test.accessType === 'paid') return { kind: 'buy', price: test.price || 0 };
  if (test.accessType === 'premium') return { kind: 'upgrade', plan: 'premium' };
  if (test.accessType === 'teacher') return { kind: 'upgrade', plan: 'teacher' };
  return { kind: 'upgrade', plan: 'other' };
}

export interface CardLinks {
  primary: string;
  // Faqat yechilgan testda: "Natijani ko'rish".
  secondary?: string;
}

// Qulflangan testda ham asosiy tugma /pricing yoki botga emas, solve'ga
// olib boradi: karta obuna holatini bilmaydi, solve sahifasi esa
// check-access orqali biladi — obunachi to'g'ridan-to'g'ri kiradi,
// obunasiz foydalanuvchi o'sha yerda "Test yopiq" ekranini ko'radi.
export function getCardLinks(testId: string, state: CardState): CardLinks {
  const solve = `/tests/${testId}/solve`;
  if (state.kind === 'solved') return { primary: solve, secondary: `/results/${state.resultId}` };
  return { primary: solve };
}
