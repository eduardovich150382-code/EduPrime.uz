import { describe, it, expect } from 'vitest';
import {
  attestationScore,
  DEFAULT_TIER_THRESHOLDS,
  getAttestationTier,
  hasAttestationKeys,
  parseTierThresholds,
  pointsToTier2,
  TIER_SETTING_KEYS,
  tierProgress,
  validateAttestationSettings,
} from '../attestation-tiers';

const T = DEFAULT_TIER_THRESHOLDS;

function settings(values: Partial<Record<keyof typeof TIER_SETTING_KEYS, string>>) {
  const map = new Map(Object.entries(values).map(([k, v]) => [TIER_SETTING_KEYS[k as keyof typeof TIER_SETTING_KEYS], v]));
  return (key: string) => map.get(key);
}

describe('attestationScore', () => {
  it('100 ballik shkalaga o`tkazadi', () => {
    expect(attestationScore(42, 50)).toBe(84);
    expect(attestationScore(84, 100)).toBe(84);
    expect(attestationScore(50, 50)).toBe(100);
  });

  it('maxScore 0 yoki manfiy bo`lsa 0', () => {
    expect(attestationScore(0, 0)).toBe(0);
    expect(attestationScore(5, 0)).toBe(0);
    expect(attestationScore(5, -1)).toBe(0);
  });

  it('0–100 oralig`ida qoladi', () => {
    expect(attestationScore(120, 100)).toBe(100);
    expect(attestationScore(-3, 100)).toBe(0);
  });
});

describe('getAttestationTier', () => {
  it.each([
    [0, 'none'],
    [58, 'none'],
    [59, 'none'],
    [60, 'tier2'],
    [68, 'tier2'],
    [69, 'tier2'],
    [70, 'tier1'],
    [78, 'tier1'],
    [80, 'top'],
    [84, 'top'],
    [85, 'top'],
    [86, 'topBonus'],
    [100, 'topBonus'],
  ] as const)('%i ball → %s', (ball, tier) => {
    expect(getAttestationTier(ball, T)).toBe(tier);
  });

  it('maxsus chegaralarga bo`ysunadi', () => {
    const custom = { tier2: 50, tier1: 65, top: 75, topBonus: 90 };
    expect(getAttestationTier(55, custom)).toBe('tier2');
    expect(getAttestationTier(89, custom)).toBe('top');
  });
});

describe('tierProgress', () => {
  it('toifa darajasiga qarab choraklar', () => {
    expect(tierProgress(60, T)).toBe(0.25);
    expect(tierProgress(75, T)).toBe(0.5);
    expect(tierProgress(84, T)).toBe(0.75);
    expect(tierProgress(86, T)).toBe(1);
    expect(tierProgress(100, T)).toBe(1);
  });

  it('toifa yo`q bo`lsa 2-toifagacha bosib o`tilgan yo`l', () => {
    expect(tierProgress(0, T)).toBe(0);
    expect(tierProgress(30, T)).toBeCloseTo(0.125);
    expect(tierProgress(54, T)).toBeCloseTo(0.225);
    expect(tierProgress(59, T)).toBeLessThan(0.25);
  });
});

describe('parseTierThresholds', () => {
  it('kalitlar yo`q bo`lsa rasmiy shkala', () => {
    expect(parseTierThresholds(() => undefined)).toEqual(T);
  });

  it('to`g`ri maxsus qiymatlar qabul qilinadi', () => {
    expect(parseTierThresholds(settings({ tier2: '55', tier1: '65', top: ' 75 ', topBonus: '90' }))).toEqual({
      tier2: 55,
      tier1: 65,
      top: 75,
      topBonus: 90,
    });
  });

  it.each([
    ['raqam emas', { tier2: 'abc', tier1: '70', top: '80', topBonus: '86' }],
    ['bittasi yo`q', { tier2: '60', tier1: '70', top: '80' }],
    ['o`smaydi', { tier2: '75', tier1: '70', top: '80', topBonus: '86' }],
    ['teng', { tier2: '60', tier1: '70', top: '80', topBonus: '80' }],
    ['100 dan katta', { tier2: '60', tier1: '70', top: '80', topBonus: '101' }],
    ['nol', { tier2: '0', tier1: '70', top: '80', topBonus: '86' }],
  ])('%s → butun to`plam standartga', (_, values) => {
    expect(parseTierThresholds(settings(values))).toEqual(T);
  });
});

describe('pointsToTier2', () => {
  it('50 savolda har savol 2 ball', () => {
    expect(pointsToTier2(54, T, 50)).toEqual({ points: 6, answers: 3 });
    expect(pointsToTier2(59, T, 50)).toEqual({ points: 1, answers: 1 });
    expect(pointsToTier2(0, T, 50)).toEqual({ points: 60, answers: 30 });
  });

  it('2-toifaga yetgan bo`lsa 0', () => {
    expect(pointsToTier2(60, T, 50)).toEqual({ points: 0, answers: 0 });
  });
});

describe('validateAttestationSettings', () => {
  const good = {
    attestation_date: '2026-11-15',
    attestation_duration_min: '120',
    attestation_tier2_min: '60',
    attestation_tier1_min: '70',
    attestation_tier_top_min: '80',
    attestation_tier_top_bonus_min: '86',
  };

  it('to`g`ri qiymatlarni normallab qaytaradi', () => {
    const r = validateAttestationSettings({ ...good, attestation_date: ' 2026-11-15 ' });
    expect(r).toEqual({ ok: true, values: good });
  });

  it('sana va davomiylik bo`sh bo`lishi mumkin', () => {
    const r = validateAttestationSettings({ ...good, attestation_date: '', attestation_duration_min: '' });
    expect(r.ok).toBe(true);
  });

  it.each([
    ['noto`g`ri shakl', { attestation_date: '15.11.2026' }],
    ['mavjud bo`lmagan sana', { attestation_date: '2026-02-30' }],
    ['davomiylik 0', { attestation_duration_min: '0' }],
    ['davomiylik manfiy', { attestation_duration_min: '-5' }],
    ['davomiylik kasr', { attestation_duration_min: '1.5' }],
    ['chegara bo`sh', { attestation_tier1_min: '' }],
    ['chegara 101', { attestation_tier_top_bonus_min: '101' }],
    ['teng chegaralar', { attestation_tier1_min: '60' }],
    ['kamayuvchi', { attestation_tier_top_min: '65' }],
  ])('%s → xato', (_, patch) => {
    expect(validateAttestationSettings({ ...good, ...patch }).ok).toBe(false);
  });
});

describe('hasAttestationKeys', () => {
  it('faqat attestatsiya kalitlarini taniydi', () => {
    expect(hasAttestationKeys({ premium_price_1_month: '1' })).toBe(false);
    expect(hasAttestationKeys({ attestation_tier1_min: '70' })).toBe(true);
  });
});
