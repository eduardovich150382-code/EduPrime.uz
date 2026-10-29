// /tests kartasining holat mantig'i — komponentsiz (Vitest'da) tekshirilishi
// uchun alohida sof funksiyalarda. Karta faqat shu natijani chizadi.

import { localizedPath, loginHref } from './safe-return-path';

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
  /** Reklama uchun bepul test (lib/ad-free-test.ts) — kirgan har kimga ochiq. */
  promoFree?: boolean;
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

// Natija bo'lsa qulf ko'rsatilmaydi. `hasAccess` — GET /api/tests javobidan:
// true bo'lsa (obunachi, xaridor, admin) pullik test ham oddiy "Boshlash".
// Noma'lum (`undefined`, eski javob) bo'lsa eski xatti-harakat — qulf.
// Haqiqiy himoya baribir serverda (check-access, lib/access.ts).
export function getCardState(test: CardAccessInfo, result?: BriefResult, hasAccess?: boolean): CardState {
  if (result) {
    return {
      kind: 'solved',
      resultId: result.id,
      score: result.score,
      maxScore: result.maxScore,
      percentage: result.percentage,
    };
  }
  if (hasAccess === true) return { kind: 'start' };
  // Mehmonda ham "Boshlash": havola login'ga, so'ng Mini App/sayt to'g'ridan-to'g'ri testga.
  if (test.promoFree) return { kind: 'start' };
  if (test.isFree || test.accessType === 'free') return { kind: 'start' };
  if (test.accessType === 'paid') return { kind: 'buy', price: test.price || 0 };
  if (test.accessType === 'premium') return { kind: 'upgrade', plan: 'premium' };
  if (test.accessType === 'teacher') return { kind: 'upgrade', plan: 'teacher' };
  return { kind: 'upgrade', plan: 'other' };
}

export type LockBadge = { kind: 'price'; price: number } | { kind: 'premium' } | { kind: 'teacher' } | { kind: 'subscription' } | { kind: 'free' } | null;

// Qulf yonidagi kichik belgi. premium_teacher'ga "Premium" — eng ko'p
// sotiladigan tarif, Ustoz tarifini solve sahifasi qo'shimcha aytadi.
// Noma'lum accessType'da belgi yo'q, faqat qulf ikonkasi.
export function getLockBadge(test: CardAccessInfo, state: CardState): LockBadge {
  // Qulf emas, aksincha — reklama testini ro'yxatda ajratib ko'rsatadi.
  if (test.promoFree) return state.kind === 'solved' ? null : { kind: 'free' };
  if (state.kind === 'buy') return { kind: 'price', price: state.price };
  if (state.kind !== 'upgrade') return null;
  if (test.accessType === 'premium' || test.accessType === 'premium_teacher') return { kind: 'premium' };
  if (test.accessType === 'teacher') return { kind: 'teacher' };
  if (test.accessType === 'subscription') return { kind: 'subscription' };
  return null;
}

export interface CardLinks {
  primary: string;
  // Faqat yechilgan testda: "Natijani ko'rish".
  secondary?: string;
}

// Qulflangan testda ham asosiy tugma /pricing yoki botga emas, solve'ga
// olib boradi: kartadagi hasAccess faqat ishora (eskirgan bo'lishi ham
// mumkin), yakuniy qarorni solve sahifasi check-access orqali qiladi —
// obunasiz foydalanuvchi o'sha yerda "Test yopiq" ekranini ko'radi.
//
// `guest` — mehmon: solve baribir login so'raydi, shuning uchun to'g'ridan-
// to'g'ri login'ga, qaytish manzili shu testning (locale prefiksli) solve
// sahifasi. Mehmonda natija yo'q — ikkinchi havola ham yo'q.
export function getCardLinks(testId: string, state: CardState, guest?: { locale: string }): CardLinks {
  const solve = `/tests/${testId}/solve`;
  if (guest) return { primary: loginHref(localizedPath(solve, guest.locale)) };
  if (state.kind === 'solved') return { primary: solve, secondary: `/results/${state.resultId}` };
  return { primary: solve };
}
