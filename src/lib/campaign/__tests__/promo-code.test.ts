import { describe, expect, it } from 'vitest';
import { PROMO_ALPHABET, generatePromoCode, generatePromoCodes, normalizePromoInput } from '../promo-code';
import { flagBursts, noUsernameCount } from '../referral-review';

describe('generatePromoCode', () => {
  it('8 belgi, faqat alifbodan; 0 O 1 I yo‘q', () => {
    expect(PROMO_ALPHABET).toHaveLength(32);
    for (const ch of '0O1I') expect(PROMO_ALPHABET).not.toContain(ch);
    for (let i = 0; i < 200; i++) expect(generatePromoCode()).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{8}$/);
  });
  it('partiyada takror yo‘q', () => {
    const codes = generatePromoCodes(500);
    expect(codes).toHaveLength(500);
    expect(new Set(codes).size).toBe(500);
  });
});

describe('normalizePromoInput', () => {
  it('bo‘shliq va chiziqcha olinadi, katta harf', () => {
    expect(normalizePromoInput(' ab3d-ef 7h ')).toBe('AB3DEF7H');
    expect(normalizePromoInput('')).toBe('');
  });
});

describe('referral-review', () => {
  const at = (s: number) => new Date(Date.UTC(2026, 10, 20, 10, 0, s));
  it('1 daqiqada ≥ 3 ta — belgilanadi, siyraklari yo‘q', () => {
    const rows = [
      { id: 'a', createdAt: at(0) }, { id: 'b', createdAt: at(20) }, { id: 'c', createdAt: at(55) },
      { id: 'd', createdAt: at(300) }, { id: 'e', createdAt: at(400) },
    ];
    expect([...flagBursts(rows)].sort()).toEqual(['a', 'b', 'c']);
  });
  it('2 tasi yaqin — belgilanmaydi', () => {
    expect(flagBursts([{ id: 'a', createdAt: at(0) }, { id: 'b', createdAt: at(5) }]).size).toBe(0);
  });
  it('username yo‘qlar sanog‘i', () => {
    expect(noUsernameCount([{ username: null }, { username: 'x' }, { username: '' }])).toBe(2);
  });
});
