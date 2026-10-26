import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/db', () => ({ db: {} }));
import { BOT_START_URL, INTENT_TTL_MS, createIntentToken, intentStartParameter, isIntentExpired, parseIntent, parseIntentStart } from '../checkout-intent';
import { parseCheckoutStart } from '../category-checkout';

describe('checkout niyati tokeni', () => {
  it('kriptografik token Telegram start chegarasiga sig‘adi va har safar yangi', () => {
    const tokens = new Set(Array.from({ length: 50 }, createIntentToken));
    expect(tokens.size).toBe(50);
    for (const token of tokens) {
      const parameter = intentStartParameter(token);
      expect(parameter).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
      expect(parameter.length).toBe(35); expect(parseIntentStart(parameter)).toBe(token);
      expect(`${BOT_START_URL}${parameter}`).toBe(`https://t.me/EduPrimeuzbot?start=ci_${token}`);
    }
  });
  it.each(['ci_', 'ci_short', `ci_${'a'.repeat(33)}`, `ci_${'a'.repeat(31)}!`, `buy_p_${'a'.repeat(32)}`, `xci_${'a'.repeat(32)}`])('%s rad etiladi', (value) => {
    expect(parseIntentStart(value)).toBeNull();
  });
  it('eski buy_p_ parametri bilan aralashmaydi', () => {
    expect(parseCheckoutStart(intentStartParameter(createIntentToken()))).toBeNull();
  });
});

describe('checkout niyati qiymati', () => {
  const intent = { userId: 'u1', productId: 'p', offerId: 'o', subjectIds: ['physics'], createdAt: 1_000_000 };
  it('60 daqiqa amal qiladi', () => {
    expect(isIntentExpired(intent, intent.createdAt + INTENT_TTL_MS - 1)).toBe(false);
    expect(isIntentExpired(intent, intent.createdAt + INTENT_TTL_MS)).toBe(true);
    expect(INTENT_TTL_MS).toBe(60 * 60 * 1000);
  });
  it('buzilgan yoki to‘liq bo‘lmagan JSON null qaytaradi', () => {
    expect(parseIntent(JSON.stringify(intent))).toEqual(intent);
    expect(parseIntent('{bad')).toBeNull();
    expect(parseIntent(JSON.stringify({ ...intent, userId: '' }))).toBeNull();
    expect(parseIntent(JSON.stringify({ ...intent, subjectIds: 'physics' }))).toBeNull();
  });
});
