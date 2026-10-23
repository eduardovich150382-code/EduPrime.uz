import { parsePositiveInt } from './attestation-stats';

// Attestatsiya toifa shkalasi — sof funksiyalar (bazasiz, React'siz).
// Sozlamalar serverda lib/attestation-settings.ts orqali o'qiladi, admin
// PUT esa shu yerdagi `validateAttestationSettings` bilan tekshiradi.

export type AttestationTier = 'none' | 'tier2' | 'tier1' | 'top' | 'topBonus';

export interface TierThresholds {
  tier2: number;
  tier1: number;
  top: number;
  topBonus: number;
}

// Rasmiy 100 ballik shkala (o'ylab topilgan emas). Sozlama yo'q yoki
// buzuq bo'lsa shu qiymatlar ishlaydi.
export const DEFAULT_TIER_THRESHOLDS: TierThresholds = { tier2: 60, tier1: 70, top: 80, topBonus: 86 };

export const TIER_SETTING_KEYS: Record<keyof TierThresholds, string> = {
  tier2: 'attestation_tier2_min',
  tier1: 'attestation_tier1_min',
  top: 'attestation_tier_top_min',
  topBonus: 'attestation_tier_top_bonus_min',
};

const TIER_ORDER = ['tier2', 'tier1', 'top', 'topBonus'] as const;

function isValidScale(values: (number | null)[]): values is number[] {
  return values.every((v, i) => v !== null && v <= 100 && (i === 0 || v > values[i - 1]!));
}

/**
 * Sozlamalardan chegaralar. Bittasi buzuq bo'lsa ham **butun to'plam**
 * standartga qaytadi: aralash to'plam (masalan, 2-toifa 75, 1-toifa 70)
 * shkalani buzadi va toifani noto'g'ri aytadi.
 */
export function parseTierThresholds(get: (key: string) => string | null | undefined): TierThresholds {
  const values = TIER_ORDER.map((tier) => parsePositiveInt(get(TIER_SETTING_KEYS[tier])));
  if (!isValidScale(values)) return { ...DEFAULT_TIER_THRESHOLDS };
  const [tier2, tier1, top, topBonus] = values;
  return { tier2, tier1, top, topBonus };
}

/**
 * 100 ballik ball. `Question.points` 1 yoki 2 bo'lishidan qat'i nazar
 * nisbat bir xil — 50 savolli mockda to'g'ri javoblar × 2 ga teng.
 */
export function attestationScore(score: number, maxScore: number): number {
  if (!(maxScore > 0)) return 0;
  return Math.min(100, Math.max(0, Math.round((score / maxScore) * 100)));
}

export function getAttestationTier(ball: number, t: TierThresholds): AttestationTier {
  if (ball >= t.topBonus) return 'topBonus';
  if (ball >= t.top) return 'top';
  if (ball >= t.tier1) return 'tier1';
  if (ball >= t.tier2) return 'tier2';
  return 'none';
}

export const TIER_FILL: Record<Exclude<AttestationTier, 'none'>, number> = {
  tier2: 0.25,
  tier1: 0.5,
  top: 0.75,
  topBonus: 1,
};

/**
 * Toifa aylanasining to'lishi (0–1). Toifa yo'q bo'lsa aylana bo'sh
 * qolmaydi — 2-toifagacha bosib o'tilgan yo'l (birinchi chorak ichida),
 * aks holda 0 ball bilan 59 ball bir xil ko'rinardi.
 */
export function tierProgress(ball: number, t: TierThresholds): number {
  const tier = getAttestationTier(ball, t);
  if (tier !== 'none') return TIER_FILL[tier];
  return (Math.max(0, ball) / t.tier2) * TIER_FILL.tier2;
}

/** 2-toifagacha yetmagan ball va taxminiy to'g'ri javoblar soni (savol narxi = 100 / savollar soni). */
export function pointsToTier2(ball: number, t: TierThresholds, questionCount: number): { points: number; answers: number } {
  const points = Math.max(0, t.tier2 - ball);
  const perQuestion = questionCount > 0 ? 100 / questionCount : 2;
  // Epsilon: 100/30 kabi kasr narxda suzuvchi xato ceil ni bitta oshirib yubormasin.
  return { points, answers: Math.max(0, Math.ceil(points / perQuestion - 1e-9)) };
}

export const ATTESTATION_DATE_KEY = 'attestation_date';
export const ATTESTATION_DURATION_KEY = 'attestation_duration_min';

const ATTESTATION_KEYS = [ATTESTATION_DATE_KEY, ATTESTATION_DURATION_KEY, ...Object.values(TIER_SETTING_KEYS)];

export function hasAttestationKeys(input: Record<string, unknown>): boolean {
  return ATTESTATION_KEYS.some((key) => key in input);
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // `Date` 2026-02-30 ni jimgina 2026-03-02 ga suradi — qaytarib solishtiramiz.
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export type AttestationSettingsValidation =
  | { ok: true; values: Record<string, string> }
  | { ok: false; error: string };

/**
 * Admin PUT uchun. Sana va davomiylik bo'sh bo'lishi mumkin (sahifada qator
 * yashirinadi), chegaralar esa majburiy. Xato matni o'zbekcha — admin
 * paneli faqat o'zbekcha.
 */
export function validateAttestationSettings(input: Record<string, unknown>): AttestationSettingsValidation {
  const str = (key: string) => (typeof input[key] === 'string' ? (input[key] as string).trim() : '');

  const date = str(ATTESTATION_DATE_KEY);
  if (date && !isCalendarDate(date)) {
    return { ok: false, error: "Attestatsiya sanasi YYYY-MM-DD shaklida va haqiqiy sana bo'lishi kerak" };
  }
  const duration = str(ATTESTATION_DURATION_KEY);
  if (duration && parsePositiveInt(duration) === null) {
    return { ok: false, error: "Davomiylik musbat butun son (daqiqa) bo'lishi kerak" };
  }
  const tiers = TIER_ORDER.map((tier) => parsePositiveInt(str(TIER_SETTING_KEYS[tier])));
  if (tiers.some((v) => v === null || v > 100)) {
    return { ok: false, error: "Toifa chegaralari 1 dan 100 gacha butun son bo'lishi kerak" };
  }
  if (!isValidScale(tiers)) {
    return { ok: false, error: "Toifa chegaralari o'sish tartibida bo'lishi kerak: 2-toifa < 1-toifa < Oliy < Oliy + ustama" };
  }

  const values: Record<string, string> = { [ATTESTATION_DATE_KEY]: date, [ATTESTATION_DURATION_KEY]: duration };
  TIER_ORDER.forEach((tier, i) => {
    values[TIER_SETTING_KEYS[tier]] = String(tiers[i]);
  });
  return { ok: true, values };
}
