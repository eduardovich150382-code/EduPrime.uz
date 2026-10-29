import { describe, expect, it } from 'vitest';
import { attestationSubscription, buildAttestationView, liveOffers, pickAttestationProduct, recommendedOfferId } from '../attestation-offer';
import type { PricingOffer, PricingProduct } from '../pricing';
import { subscriptionView } from '../subscription-display';
import { subscriptionFixture as sub, subscriptionNow as now } from './fixtures/subscriptions';

const counts = { topicTests: 10, mockTests: 3, questions: 500 };
const marketing = { compareAtPrice: null, promoUntil: null, badge: null, isFeatured: false, personalPrice: null };
const monthly: PricingOffer = { id: 'month', label: '1 oy', price: 49000, durationMonths: 1, untilDate: null, ...marketing };
const season: PricingOffer = { id: 'season', label: 'Mavsum davomida', price: 99000, durationMonths: null, untilDate: '2026-12-25T00:00:00+05:00', ...marketing };
const physics = { id: 'physics', name: 'Fizika', testCount: 12, isMandatory: false, counts };
const math = { id: 'math', name: 'Matematika', testCount: 4, isMandatory: false, counts };
const product: PricingProduct = {
  id: 'att', kind: 'CATEGORY', goal: 'ATTESTATION', name: 'Attestatsiya', subjectRule: 'ONE', secondSubjectDiscountPct: 25,
  tagline: null, features: [], counts: null, activeSubscriptions: [], subjects: [physics], offers: [monthly, season],
};
// subscriptionNow — Toshkentda 25-oktabr 00:30; fixture obunasi 26-oktabrda tugaydi.
const views = (...rows: Parameters<typeof sub>[0][]) => rows.map((row) => subscriptionView(sub(row)));

describe('pickAttestationProduct', () => {
  it('faqat ATTESTATION kategoriyasi; bo‘lmasa null', () => {
    const dtm = { ...product, id: 'dtm', goal: 'DTM' as const };
    expect(pickAttestationProduct([dtm, product])?.id).toBe('att');
    expect(pickAttestationProduct([dtm, { ...product, kind: 'BUNDLE', goal: null }])).toBeNull();
  });
});

describe('recommendedOfferId', () => {
  it('admin ajratmagan bo‘lsa — eng uzun muddat, nomga qaramaydi', () => {
    expect(recommendedOfferId([monthly, season], now)).toBe('season');
    const swapped = [{ ...monthly, label: 'Mavsum davomida' }, { ...season, label: '1 oy' }];
    expect(recommendedOfferId(swapped, now)).toBe('season');
    expect(recommendedOfferId([{ ...monthly, durationMonths: 3 }, season], now)).toBe('month');
  });
  it('admin isFeatured qo‘ygan qisqa variant — /pricing bilan bir xil tavsiya', () => {
    expect(recommendedOfferId([{ ...monthly, isFeatured: true }, season], now)).toBe('month');
    expect(recommendedOfferId([{ ...monthly, isFeatured: true }, { ...season, isFeatured: true }], now)).toBe('month');
  });
  it('muddati o‘tgan sanagacha variant hisobga olinmaydi; bitta variant yoki teng muddat — null', () => {
    const past = { ...season, untilDate: '2026-10-20T00:00:00+05:00' };
    expect(liveOffers([monthly, past], now).map((o) => o.id)).toEqual(['month']);
    expect(recommendedOfferId([monthly, { ...past, isFeatured: true }], now)).toBeNull();
    expect(recommendedOfferId([monthly, { ...monthly, id: 'm2' }], now)).toBeNull();
  });
});

describe('attestationSubscription', () => {
  it('fizika obunasi, sotuvda Fizika va Matematika — obunachi, Matematika qamralmagan', () => {
    const result = attestationSubscription(views({}), { ...product, subjects: [physics, math] }, now);
    expect(result?.subscription.id).toBe('s1');
    expect(result?.uncoveredSubjects.map((s) => s.id)).toEqual(['math']);
  });
  it('faqat Fizika sotuvda — qamralmagan fan yo‘q', () => {
    expect(attestationSubscription(views({}), product, now)?.uncoveredSubjects).toEqual([]);
  });
  it('bir nechta obuna — eng kech tugaydigani; ikkala fan qamralgan', () => {
    const rows = views({}, { id: 's2', subjectIds: ['math'], endDate: new Date('2026-11-10T12:00:00+05:00') });
    const result = attestationSubscription(rows, { ...product, subjects: [physics, math] }, now);
    expect(result?.subscription.id).toBe('s2'); expect(result?.uncoveredSubjects).toEqual([]);
  });
  it('BUNDLE va NONE — hamma fan', () => {
    const bundle = views({ plan: 'BUNDLE', goal: null, categoryId: null, subjectIds: [], subjectRule: null });
    expect(attestationSubscription(bundle, { ...product, subjects: [physics, math] }, now)?.uncoveredSubjects).toEqual([]);
    expect(attestationSubscription(views({ subjectRule: 'NONE', subjectIds: [] }), { ...product, subjects: [physics, math] }, now)?.uncoveredSubjects).toEqual([]);
  });
  it('boshqa fan, boshqa maqsad, eski tarif, tugagan yoki hali boshlanmagan — obunachi emas', () => {
    expect(attestationSubscription(views({ subjectIds: ['math'] }), product, now)).toBeNull();
    expect(attestationSubscription(views({ goal: 'DTM' }), product, now)).toBeNull();
    expect(attestationSubscription(views({ plan: 'TEACHER_PLAN', productId: null, goal: null, subjectIds: [] }), product, now)).toBeNull();
    expect(attestationSubscription(views({ endDate: new Date('2026-10-20T00:00:00+05:00') }), product, now)).toBeNull();
    expect(attestationSubscription(views({ startDate: new Date('2026-10-30T00:00:00+05:00') }), product, now)).toBeNull();
    expect(attestationSubscription(views({ isActive: false }), product, now)).toBeNull();
  });
});

// Statik mehmon render'i va /api/attestation/me bitta qoidadan foydalanadi.
describe('buildAttestationView', () => {
  const login = '/login?callbackUrl=%2Fattestation';
  it('mehmon: karta ko‘rinadi, tugma kirishga olib boradi', () => {
    expect(buildAttestationView({ products: [product], subscriptions: [] }, { userId: null, loginHref: login }, now)).toEqual({
      product, owned: null, showOffer: true, buy: { userId: null, loginHref: login, knownSubscriptionIds: [] },
    });
  });
  it('obunachi: karta o‘rniga faol obuna, ma’lum obunalar tugmaga beriladi', () => {
    const view = buildAttestationView({ products: [product], subscriptions: views({}) }, { userId: 'u1', loginHref: login }, now);
    expect(view.showOffer).toBe(false);
    expect(view.owned?.subscription.id).toBe('s1');
    expect(view.buy).toEqual({ userId: 'u1', loginHref: login, knownSubscriptionIds: ['s1'] });
  });
  it('variant yoki mahsulot yo‘q — karta yo‘q', () => {
    expect(buildAttestationView({ products: [{ ...product, offers: [] }], subscriptions: [] }, { userId: null, loginHref: login }, now).showOffer).toBe(false);
    expect(buildAttestationView({ products: [], subscriptions: [] }, { userId: null, loginHref: login }, now)).toMatchObject({ product: null, showOffer: false });
  });
});
