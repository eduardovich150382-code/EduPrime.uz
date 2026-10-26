import { describe, expect, it } from 'vitest';
import { BUNDLE_STYLE, EXPIRY_PILL_STYLES, GOAL_STYLES, LEGACY_STYLE, expiryState, subscriptionStyle } from '../goal-styles';

// WCAG 2.1 nisbiy yorqinlik formulasi.
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('obuna kartochkasi ranglari', () => {
  const pairs: [string, string, string][] = [
    ...Object.entries(GOAL_STYLES).map(([goal, s]): [string, string, string] => [goal, s.color, s.background]),
    ...Object.entries(EXPIRY_PILL_STYLES).map(([state, s]): [string, string, string] => [`pill ${state}`, s.color, s.background]),
    ['BUNDLE', BUNDLE_STYLE.color, BUNDLE_STYLE.background],
    ['legacy', LEGACY_STYLE.color, LEGACY_STYLE.background],
    // Fan nomi (text-primary) va sana (#4b5563) har bir kartochka fonida.
    ...[...Object.values(GOAL_STYLES), BUNDLE_STYLE, LEGACY_STYLE].flatMap((s, i): [string, string, string][] => [
      [`fon ${i} sana`, '#4b5563', s.background], [`fon ${i} fan`, '#1f2937', s.background]]),
    // Popover — oq fon, kategoriya nomi o'z rangida.
    ...[...Object.values(GOAL_STYLES), BUNDLE_STYLE, LEGACY_STYLE].map((s, i): [string, string, string] => [`popover ${i}`, s.color, '#ffffff']),
  ];
  it.each(pairs)('%s: matn/fon kamida 4.5:1 (WCAG AA)', (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  // Kartalar yonma-yon turadi — to'yingan fonlar tusi bo'yicha aniq ajralsin.
  // SAT ataylab kulrang (to'yinganlik past) — u tus bilan emas, rangsizligi bilan farqlanadi.
  it('maqsad fonlari tusi bir-biridan kamida 30° farq qiladi', () => {
    const hsl = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const max = Math.max(r, g, b); const min = Math.min(r, g, b); const d = max - min;
      const hue = d === 0 ? 0 : max === r ? (((g - b) / d) % 6) * 60 : max === g ? ((b - r) / d + 2) * 60 : ((r - g) / d + 4) * 60;
      return { hue: (hue + 360) % 360, saturation: d === 0 ? 0 : d / (1 - Math.abs(max + min - 1)) };
    };
    const saturated = Object.entries(GOAL_STYLES).map(([goal, s]) => [goal, hsl(s.background)] as const).filter(([, c]) => c.saturation > 0.5);
    expect(saturated.map(([goal]) => goal)).not.toContain('SAT');
    for (const [a, ca] of saturated) for (const [b, cb] of saturated) {
      if (a >= b) continue;
      const distance = Math.min(Math.abs(ca.hue - cb.hue), 360 - Math.abs(ca.hue - cb.hue));
      expect(distance, `${a} / ${b}`).toBeGreaterThanOrEqual(30);
    }
  });

  it('muddat holati chegaralari', () => {
    expect([16, 8, 7, 4, 3, 0, -1].map(expiryState)).toEqual(['ok', 'ok', 'soon', 'soon', 'urgent', 'urgent', 'expired']);
  });

  it('uslub: maqsad rangi, BUNDLE oltin, eski tarif va noma’lum maqsad neytral', () => {
    expect(subscriptionStyle({ plan: 'CATEGORY', goal: 'ATTESTATION', isLegacy: false }))
      .toMatchObject({ color: GOAL_STYLES.ATTESTATION.color, border: GOAL_STYLES.ATTESTATION.color });
    expect(subscriptionStyle({ plan: 'BUNDLE', goal: null, isLegacy: false })).toBe(BUNDLE_STYLE);
    expect(subscriptionStyle({ plan: 'PREMIUM', goal: null, isLegacy: true })).toBe(LEGACY_STYLE);
    expect(subscriptionStyle({ plan: 'CATEGORY', goal: null, isLegacy: false })).toBe(LEGACY_STYLE);
  });
});
