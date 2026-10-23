import { describe, expect, it } from 'vitest';
import { checkoutCallback, checkoutKey, checkoutPrice, resolveCheckoutKey, subscriptionFromPayment } from '../category-checkout';
import { canAccessByEntitlements } from '../entitlements';

const now = new Date('2026-10-24T07:00:00Z');
const current = (subjectIds: string[], extra = {}) => ({ productId: 'p', subjectIds, isActive: true, startDate: new Date('2026-10-01'), endDate: new Date('2026-12-01'), ...extra });
const product = { id: 'p', kind: 'CATEGORY' as const, subjectRule: 'ONE' as const, categoryId: 'att' };
const offer = { id: 'o', durationMonths: 1, untilDate: null };
const subjects = ['physics', 'math'].map((id) => ({ id, categoryId: 'att', isMandatory: false }));

describe('checkout narxi', () => {
  it.each([
    [[], ['physics'], 10001],
    [[current(['physics'])], ['math'], 7501],
    [[current(['physics'])], ['physics'], 10001],
    [[current(['physics']), current(['math'])], ['physics'], 10001],
    [[current(['physics'], { productId: 'other' })], ['math'], 10001],
    [[current(['physics'], { isActive: false })], ['math'], 10001],
    [[current(['physics'], { endDate: now })], ['math'], 10001],
    [[current(['physics'], { startDate: new Date('2026-11-01') })], ['math'], 10001],
    [[current([])], [], 10001],
  ])('faol doiraga qarab chegirma: %j', (active, ids, expected) => {
    expect(checkoutPrice(10001, 25, 'p', ids, active, now)).toBe(expected);
  });
  it('DTM blok tartibi yangilashni chegirmaga aylantirmaydi', () => {
    expect(checkoutPrice(10000, 30, 'p', ['a', 'b', 'm1', 'm2', 'm3'], [current(['m3', 'b', 'm2', 'a', 'm1'])], now)).toBe(10000);
    expect(checkoutPrice(10000, 30, 'p', ['a', 'c', 'm1', 'm2', 'm3'], [current(['a', 'b', 'm1', 'm2', 'm3'])], now)).toBe(7000);
  });
  it('nol narx va to‘liq chegirma butun so‘m bo‘ladi', () => {
    expect(checkoutPrice(0, 25, 'p', ['math'], [current(['physics'])], now)).toBe(0);
    expect(checkoutPrice(10001, 100, 'p', ['math'], [current(['physics'])], now)).toBe(0);
  });
  it.each([[-1, 10], [1.5, 10], [1000, 101]])('noto‘g‘ri narxni qabul qilmaydi', (price, discount) => {
    expect(() => checkoutPrice(price, discount, 'p', [], [], now)).toThrow('INVALID_PRICE');
  });
});

describe('to‘lovdan obuna doirasi va muddati', () => {
  it('boshlanish tasdiqlash vaqtida, bir xil fan esa endDate dan', () => {
    expect(subscriptionFromPayment(product, offer, ['physics'], subjects, now, []).startDate).toEqual(now);
    const result = subscriptionFromPayment(product, offer, ['physics'], subjects, now, [{ subjectIds: ['physics'], endDate: new Date('2026-12-01') }]);
    expect(result.startDate).toEqual(new Date('2026-12-01'));
    expect(result.endDate).toEqual(new Date('2027-01-01'));
  });
  it('boshqa fan uzaytirishga ta’sir qilmaydi', () => {
    expect(subscriptionFromPayment(product, offer, ['physics'], subjects, now, [{ subjectIds: ['math'], endDate: new Date('2026-12-01') }]).startDate).toEqual(now);
  });
  it('muddati tugagan qat’iy sana obuna bermaydi', () => {
    expect(() => subscriptionFromPayment(product, { ...offer, durationMonths: null, untilDate: now }, ['physics'], subjects, now, [])).toThrow('EXPIRED_OFFER');
  });
  it('DTM ikkita asosiy va uchta majburiy fanni saqlaydi', () => {
    const mandatory = ['m1', 'm2', 'm3'].map((id) => ({ id, categoryId: 'att', isMandatory: true }));
    const result = subscriptionFromPayment({ ...product, subjectRule: 'DTM_BLOCK' }, offer, ['physics', 'math', 'm1', 'm2', 'm3'], [...subjects, ...mandatory], now, []);
    expect(result.subjectIds).toEqual(['m1', 'm2', 'm3', 'math', 'physics']);
    const ent = { now, isAdmin: false, permissions: [], categoryTypes: new Map(), purchasedTestIds: new Set<string>(), subscriptions: [{ ...result, isActive: true, subjectRule: 'DTM_BLOCK' as const }] };
    for (const subjectId of result.subjectIds) expect(canAccessByEntitlements({ id: subjectId, categoryId: 'att', subjectId, isFree: false, accessType: 'paid' }, ent)).toBe(true);
    expect(canAccessByEntitlements({ id: 'other', categoryId: 'att', subjectId: 'other', isFree: false, accessType: 'paid' }, ent)).toBe(false);
  });
  it('sotib olingan ONE obunasi faqat o‘z fanini ochadi', () => {
    const result = subscriptionFromPayment(product, offer, ['physics'], subjects, now, []);
    const ent = { now, isAdmin: false, permissions: [], categoryTypes: new Map(), purchasedTestIds: new Set<string>(), subscriptions: [{ ...result, isActive: true, subjectRule: 'ONE' as const }] };
    const test = { id: 'test', categoryId: 'att', subjectId: 'physics', isFree: false, accessType: 'paid' };
    expect(canAccessByEntitlements(test, ent)).toBe(true);
    expect(canAccessByEntitlements({ ...test, subjectId: 'math' }, ent)).toBe(false);
    expect(canAccessByEntitlements({ ...test, categoryId: 'other' }, ent)).toBe(false);
  });
  it('boshqa kategoriya va takrorlangan fanni rad etadi', () => {
    expect(() => subscriptionFromPayment(product, offer, ['unknown'], subjects, now, [])).toThrow('INVALID_SUBJECT');
    expect(() => subscriptionFromPayment(product, offer, ['physics', 'physics'], subjects, now, [])).toThrow();
  });
  it('NONE va BUNDLE fan tanlamaydi', () => {
    expect(subscriptionFromPayment({ ...product, subjectRule: 'NONE' }, offer, [], [], now, []).subjectIds).toEqual([]);
    expect(subscriptionFromPayment({ ...product, kind: 'BUNDLE', categoryId: null }, offer, [], [], now, []).plan).toBe('BUNDLE');
  });
});

describe('callback holati', () => {
  it('DTM to‘liq tanlovi 64 baytga sig‘adi', () => {
    const callback = checkoutCallback('o', 'obuna-attestation', ['cmxxxxxxxxxxxxxxxxxxxxxxx', 'cmyyyyyyyyyyyyyyyyyyyyyyy'], 'cmzzzzzzzzzzzzzzzzzzzzzzz');
    expect(Buffer.byteLength(callback)).toBeLessThanOrEqual(64);
    const row = { id: 'physics' };
    expect(resolveCheckoutKey([row], checkoutKey(row.id))).toEqual(row);
  });
  it('topilmagan yoki noaniq kalitni rad etadi', () => {
    expect(() => resolveCheckoutKey([], 'unknown')).toThrow('INVALID_SELECTION');
    expect(() => resolveCheckoutKey([{ id: 'p' }, { id: 'p' }], checkoutKey('p'))).toThrow('INVALID_SELECTION');
  });
});
