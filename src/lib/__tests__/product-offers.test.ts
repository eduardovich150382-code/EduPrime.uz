import { describe, expect, it } from 'vitest';
import { buildSubjectIds, computeEndDate, isValidOfferDuration, resolveStartDate, sameSubjectIds, tashkentDateInput, tashkentDayEnd } from '../product-offers';
import { normalizeTestAccess } from '../test-access-form';

const monthly = { durationMonths: 1, untilDate: null };
const now = new Date('2026-10-23T07:15:30.123Z');
const until = { durationMonths: null, untilDate: tashkentDayEnd('2027-01-01') };

describe('Toshkent muddati', () => {
  it.each([
    ['2026-01-31T18:30:00.000Z', 1, '2026-02-28T18:30:00.000Z'],
    ['2028-01-31T18:30:00.000Z', 1, '2028-02-29T18:30:00.000Z'],
    ['2026-10-31T20:30:00.000Z', 1, '2026-11-30T20:30:00.000Z'],
    ['2026-12-31T20:30:00.000Z', 1, '2027-01-31T20:30:00.000Z'],
    ['2028-02-29T07:00:00.000Z', 12, '2029-02-28T07:00:00.000Z'],
  ])('%s + %i oy', (start, months, end) => {
    expect(computeEndDate({ durationMonths: months, untilDate: null }, new Date(start)).toISOString()).toBe(end);
  });
  it('aniq sana Toshkent kunining oxiri, server zonasiga bog‘liq emas', () => {
    expect(tashkentDayEnd('2026-11-01').toISOString()).toBe('2026-11-01T18:59:59.999Z');
    expect(tashkentDateInput('2026-10-31T20:00:00Z')).toBe('2026-11-01');
  });
  it.each(['2026-02-29', '2026-02-30', '2026-13-01', '2026-00-01', 'x', '2026-1-01'])('noto‘g‘ri sana: %s', (date) => {
    expect(() => tashkentDayEnd(date)).toThrow('INVALID_DATE');
  });
  it('oylik uzaytirish eski endDate dan boshlanadi, manbalar o‘zgarmaydi', () => {
    const current = new Date('2026-11-30T20:30:00Z');
    expect(resolveStartDate(monthly, now, current)).toEqual(current);
    expect(computeEndDate(monthly, now, current).toISOString()).toBe('2026-12-31T20:30:00.000Z');
    expect(current.toISOString()).toBe('2026-11-30T20:30:00.000Z');
    expect(now.toISOString()).toBe('2026-10-23T07:15:30.123Z');
  });
  it('tugagan obuna hozirdan boshlanadi', () => {
    expect(resolveStartDate(monthly, now, new Date('2026-01-01'))).toEqual(now);
    expect(computeEndDate(monthly, now, new Date('2026-01-01')).toISOString()).toBe('2026-11-23T07:15:30.123Z');
  });
  it('sanagacha varianti eski muddatdan qat’i nazar qat’iy qoladi', () => {
    expect(resolveStartDate(until, now, new Date('2028-01-01'))).toEqual(now);
    expect(computeEndDate(until, now, new Date('2028-01-01'))).toEqual(until.untilDate);
  });
  it('o‘tgan sanagacha variantidan yangi obuna yaratilmaydi', () => {
    expect(() => computeEndDate({ durationMonths: null, untilDate: now }, now)).toThrow('EXPIRED_OFFER');
  });
  it.each([
    { durationMonths: null, untilDate: null }, { durationMonths: 1, untilDate: now },
    { durationMonths: 0, untilDate: null }, { durationMonths: 1.5, untilDate: null },
    { durationMonths: null, untilDate: new Date('bad') },
  ])('noto‘g‘ri muddat rad etiladi', (offer) => {
    expect(isValidOfferDuration(offer)).toBe(false);
    expect(() => computeEndDate(offer, now)).toThrow();
  });
});

describe('fanlar tanlovi', () => {
  const product = { kind: 'CATEGORY' as const, categoryId: 'dtm', subjectRule: 'DTM_BLOCK' as const };
  const mandatory = ['m1', 'm2', 'm3'].map((id) => ({ id, categoryId: 'dtm', isMandatory: true }));
  it('DTM ikki asosiy va uch majburiy fanni yozadi, boshqa kategoriya aralashmaydi', () => {
    const chosen = ['physics', 'math'];
    expect(buildSubjectIds(product, chosen, [...mandatory, { id: 'other', categoryId: 'other', isMandatory: true }])).toEqual(['m1', 'm2', 'm3', 'math', 'physics']);
    expect(chosen).toEqual(['physics', 'math']);
  });
  it.each([[], ['physics'], ['physics', 'physics'], ['physics', 'math', 'chemistry'], ['m1', 'physics']])('DTM noto‘g‘ri tanlovni rad etadi', (...args) => {
    const chosen = args as string[];
    expect(() => buildSubjectIds(product, chosen, mandatory)).toThrow();
  });
  it('uch majburiy fan belgilanmagan bo‘lsa rad etadi', () => {
    expect(() => buildSubjectIds(product, ['a', 'b'], mandatory.slice(0, 2))).toThrow('MANDATORY_SUBJECTS_NOT_CONFIGURED');
  });
  it('ONE aynan bitta fan oladi', () => {
    const one = { ...product, subjectRule: 'ONE' as const };
    expect(buildSubjectIds(one, ['a'], [])).toEqual(['a']);
    expect(() => buildSubjectIds(one, [], [])).toThrow('CHOOSE_ONE_SUBJECT');
    expect(() => buildSubjectIds(one, ['a', 'b'], [])).toThrow('CHOOSE_ONE_SUBJECT');
  });
  it.each([{ ...product, subjectRule: 'NONE' as const }, { ...product, kind: 'BUNDLE' as const, categoryId: null }])('NONE va BUNDLE fan tanlamaydi', (p) => {
    expect(buildSubjectIds(p, [], mandatory)).toEqual([]);
    expect(() => buildSubjectIds(p, ['a'], mandatory)).toThrow('UNEXPECTED_SUBJECTS');
  });
  it('fanlar tartibi uzaytirishda ahamiyatsiz, boshqa tarkib esa farq qiladi', () => {
    expect(sameSubjectIds(['a', 'b'], ['b', 'a'])).toBe(true);
    expect(sameSubjectIds(['a'], ['b'])).toBe(false);
    expect(sameSubjectIds(['a'], ['a', 'b'])).toBe(false);
  });
});

describe('test formasi eski qiymatni mutatsiyasiz ko‘rsatadi', () => {
  it.each(['premium', 'teacher', 'premium_teacher'])('%s → subscription', (value) => {
    const row = { accessType: value };
    expect(normalizeTestAccess(row.accessType)).toBe('subscription');
    expect(row.accessType).toBe(value);
  });
  it.each(['free', 'subscription', 'paid'] as const)('%s saqlanadi', (value) => expect(normalizeTestAccess(value)).toBe(value));
});
