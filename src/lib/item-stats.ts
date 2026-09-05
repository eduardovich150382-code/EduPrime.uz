/**
 * Savol sifati statistikasi (S27) — `Attempt` yozuvlaridan `ItemStat`ga
 * yoziladigan qiymatlarning SOF (bazaga bog'liq bo'lmagan, shuning uchun
 * qo'lda hisoblangan misollar bilan sinaladigan) hisoblash mantig'i.
 * Haqiqiy so'rov va yozish `/api/cron/item-stats`da.
 */

/** Statistika ma'noga ega bo'lishi uchun eng kam urinishlar soni. */
export const MIN_ATTEMPTS_FOR_STATS = 20;

/**
 * Klassik diskriminatsiya indeksi uchun yuqori/quyi guruh ulushi (27%) —
 * Kelley (1939) usuli, item-analysis'da eng ko'p qo'llaniladigan chegara.
 */
const DISCRIMINATION_GROUP_FRACTION = 0.27;

export interface AttemptForStats {
  isCorrect: boolean;
  /** Noto'g'ri javobda tanlangan variant (distractorHits uchun) — to'g'ri javobda ham bo'sh bo'lishi mumkin. */
  answer: string;
  timeSpentSec: number;
  /**
   * Shu urinish bog'liq TestResult.percentage (0-100) — diskriminatsiya
   * guruhlash "umumiy natija"ga asoslanadi (bitta savolning o'zi emas):
   * talaba shu SAVOLNI qanday topshirgani emas, UMUMAN qanday natija
   * ko'rsatgani (kuchli/zaif) bo'yicha yuqori/quyi 27% guruhga ajratiladi.
   */
  percentage: number;
}

export interface ItemStatsResult {
  attemptCount: number;
  correct: number;
  pValue: number;
  discrimination: number;
  avgTimeSec: number;
  /** Noto'g'ri javob -> necha marta tanlangani. */
  distractorHits: Record<string, number>;
}

/**
 * `attempts.length < MIN_ATTEMPTS_FOR_STATS` bo'lsa `null` — kam
 * urinishdan hisoblangan pValue/discrimination ma'nosiz (tasodifga bog'liq).
 */
export function computeItemStats(attempts: AttemptForStats[]): ItemStatsResult | null {
  if (attempts.length < MIN_ATTEMPTS_FOR_STATS) return null;

  const attemptCount = attempts.length;
  const correct = attempts.filter((a) => a.isCorrect).length;
  const pValue = correct / attemptCount;
  const avgTimeSec = attempts.reduce((sum, a) => sum + a.timeSpentSec, 0) / attemptCount;

  const distractorHits: Record<string, number> = {};
  for (const a of attempts) {
    if (a.isCorrect || !a.answer) continue;
    distractorHits[a.answer] = (distractorHits[a.answer] ?? 0) + 1;
  }

  // Umumiy natija (percentage) bo'yicha eng yuqori va eng quyi 27% guruh
  // orasidagi to'g'ri javob ulushi farqi — savol kuchli va zaif talabani
  // qanchalik ajratishini ko'rsatadi. Musbat qiymat — yaxshi savol (kuchli
  // talaba ko'proq to'g'ri topadi), 0 yoki manfiy — chalkash/noto'g'ri savol.
  const sorted = [...attempts].sort((a, b) => b.percentage - a.percentage);
  const groupSize = Math.max(1, Math.round(attemptCount * DISCRIMINATION_GROUP_FRACTION));
  const topGroup = sorted.slice(0, groupSize);
  const bottomGroup = sorted.slice(attemptCount - groupSize);
  const topCorrectRate = topGroup.filter((a) => a.isCorrect).length / topGroup.length;
  const bottomCorrectRate = bottomGroup.filter((a) => a.isCorrect).length / bottomGroup.length;
  const discrimination = topCorrectRate - bottomCorrectRate;

  return { attemptCount, correct, pValue, discrimination, avgTimeSec, distractorHits };
}

/** `distractorHits`dan eng ko'p tanlangan noto'g'ri variantni topadi — teacher/item-quality ekrani uchun. */
export function topDistractor(distractorHits: Record<string, number> | null | undefined): { answer: string; count: number } | null {
  if (!distractorHits) return null;
  let best: { answer: string; count: number } | null = null;
  for (const [answer, count] of Object.entries(distractorHits)) {
    if (!best || count > best.count) best = { answer, count };
  }
  return best;
}
