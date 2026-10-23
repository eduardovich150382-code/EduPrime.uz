import { describe, expect, it } from 'vitest';
import type { SubscriptionPlan, SubjectRule, TestType } from '@prisma/client';
import { canAccessByEntitlements, hasAnyActiveSubscription, type TestAccessContext, type TestAccessInfo, type SubscriptionEntitlement } from '../entitlements';
import { isValidOfferDuration } from '../product-offers';

const now = new Date('2026-10-23T07:00:00Z');
const future = new Date('2026-11-23T07:00:00Z');
const past = new Date('2026-10-22T07:00:00Z');
const baseTest: TestAccessInfo = { id: 't1', categoryId: 'att', subjectId: 'physics', isFree: false, accessType: 'subscription' };
const categoryTypes = new Map<string, TestType>([['att', 'ATTESTATION'], ['dtm', 'DTM']]);

function subscription(plan: SubscriptionPlan, subjectRule: SubjectRule | null = null): SubscriptionEntitlement {
  return { plan, subjectRule, categoryId: 'att', subjectIds: ['physics'], isActive: true, endDate: future };
}

function context(overrides: Partial<TestAccessContext> = {}): TestAccessContext {
  return { now, isAdmin: false, subscriptions: [], permissions: [], purchasedTestIds: new Set(), categoryTypes, ...overrides };
}

describe('eski tariflar — avvalgi accessType natijalari', () => {
  // Jadval avvalgi checkTestAccess natijasidan olingan; yangi yadroga
  // tayanmagani sababli ikkala yo'lda bir xil xato yashirinib qolmaydi.
  const expected = {
    none: [false, false, false, false],
    premium: [true, false, true, false],
    teacher: [false, true, true, false],
    both: [true, true, true, false],
  };
  const accessTypes = ['premium', 'teacher', 'premium_teacher', 'paid'];
  const plans: Record<keyof typeof expected, SubscriptionPlan[]> = {
    none: [], premium: ['PREMIUM'], teacher: ['TEACHER_PLAN'], both: ['PREMIUM', 'TEACHER_PLAN'],
  };
  for (const key of Object.keys(expected) as (keyof typeof expected)[]) {
    for (const categoryId of ['att', 'dtm']) {
      for (const purchased of [false, true]) {
        it(`${key}, ${categoryId}, xarid=${purchased}`, () => {
          const ctx = context({ subscriptions: plans[key].map((p) => subscription(p)), purchasedTestIds: new Set(purchased ? ['t1'] : []) });
          accessTypes.forEach((accessType, i) => {
            expect(canAccessByEntitlements({ ...baseTest, categoryId, accessType }, ctx)).toBe(accessType === 'paid' ? purchased : expected[key][i]);
          });
          expect(canAccessByEntitlements({ ...baseTest, accessType: 'free' }, ctx)).toBe(true);
          expect(canAccessByEntitlements({ ...baseTest, isFree: true, accessType: 'paid' }, ctx)).toBe(true);
        });
      }
    }
  }
});

describe('subscription — eski tarifning kategoriya chegarasi', () => {
  it.each([
    ['TEACHER_PLAN', 'att', true], ['TEACHER_PLAN', 'dtm', false],
    ['PREMIUM', 'att', false], ['PREMIUM', 'dtm', true],
  ] as const)('%s, %s → %s', (plan, categoryId, expected) => {
    expect(canAccessByEntitlements({ ...baseTest, categoryId }, context({ subscriptions: [subscription(plan)] }))).toBe(expected);
  });

  it('noma’lum kategoriya va alohida xarid subscription testini ochmaydi', () => {
    const ctx = context({ subscriptions: [subscription('PREMIUM')], purchasedTestIds: new Set(['t1']) });
    expect(canAccessByEntitlements({ ...baseTest, categoryId: 'missing' }, ctx)).toBe(false);
    expect(canAccessByEntitlements(baseTest, context({ purchasedTestIds: new Set(['t1']) }))).toBe(false);
  });
});

describe('yangi obunalar', () => {
  it.each(['subscription', 'paid', 'premium', 'teacher', 'premium_teacher'])('ONE — %s faqat o‘z fan va kategoriyasida', (accessType) => {
    const ctx = context({ subscriptions: [subscription('CATEGORY', 'ONE')] });
    const test = { ...baseTest, accessType };
    expect(canAccessByEntitlements(test, ctx)).toBe(true);
    expect(canAccessByEntitlements({ ...test, subjectId: 'math' }, ctx)).toBe(false);
    expect(canAccessByEntitlements({ ...test, categoryId: 'dtm' }, ctx)).toBe(false);
  });

  it('DTM_BLOCK — saqlangan beshta fan ochiq, boshqa fan va kategoriya yopiq', () => {
    const subjectIds = ['major1', 'major2', 'mandatory1', 'mandatory2', 'mandatory3'];
    const ctx = context({ subscriptions: [{ ...subscription('CATEGORY', 'DTM_BLOCK'), categoryId: 'dtm', subjectIds }] });
    for (const subjectId of subjectIds) {
      expect(canAccessByEntitlements({ ...baseTest, categoryId: 'dtm', subjectId }, ctx)).toBe(true);
    }
    expect(canAccessByEntitlements({ ...baseTest, categoryId: 'dtm', subjectId: 'other' }, ctx)).toBe(false);
    expect(canAccessByEntitlements({ ...baseTest, subjectId: 'major1' }, ctx)).toBe(false);
  });

  it('NONE — butun kategoriya, boshqa kategoriya yopiq', () => {
    const ctx = context({ subscriptions: [subscription('CATEGORY', 'NONE')] });
    expect(canAccessByEntitlements({ ...baseTest, subjectId: 'math', accessType: 'paid' }, ctx)).toBe(true);
    expect(canAccessByEntitlements({ ...baseTest, categoryId: 'dtm', accessType: 'paid' }, ctx)).toBe(false);
  });

  it('bir nechta obunaning fanlari birlashadi, begona fan yopiq qoladi', () => {
    const ctx = context({ subscriptions: [
      subscription('CATEGORY', 'ONE'),
      { ...subscription('CATEGORY', 'ONE'), subjectIds: ['math'] },
    ] });
    expect(canAccessByEntitlements(baseTest, ctx)).toBe(true);
    expect(canAccessByEntitlements({ ...baseTest, subjectId: 'math' }, ctx)).toBe(true);
    expect(canAccessByEntitlements({ ...baseTest, subjectId: 'chemistry' }, ctx)).toBe(false);
  });

  it('BUNDLE — barcha kategoriyalar va paid testlar', () => {
    const ctx = context({ subscriptions: [subscription('BUNDLE')] });
    for (const categoryId of ['att', 'dtm', 'school']) {
      for (const accessType of ['subscription', 'paid', 'premium', 'teacher', 'premium_teacher']) {
        expect(canAccessByEntitlements({ ...baseTest, categoryId, accessType }, ctx)).toBe(true);
      }
    }
  });

  it.each(['CATEGORY', 'BUNDLE', 'PREMIUM', 'TEACHER_PLAN'] as const)('%s — tugagan va nofaol obuna huquq bermaydi', (plan) => {
    for (const change of [{ endDate: past }, { isActive: false }]) {
      const ctx = context({ subscriptions: [{ ...subscription(plan, 'ONE'), ...change }] });
      expect(canAccessByEntitlements(baseTest, ctx)).toBe(false);
      expect(hasAnyActiveSubscription(ctx)).toBe(false);
    }
  });

  it('muddat chegarasi eski gte qoidasini saqlaydi; mahsulotsiz CATEGORY yopiq', () => {
    expect(canAccessByEntitlements(baseTest, context({ subscriptions: [{ ...subscription('CATEGORY', 'ONE'), endDate: now }] }))).toBe(true);
    expect(canAccessByEntitlements(baseTest, context({ subscriptions: [subscription('CATEGORY')] }))).toBe(false);
    expect(hasAnyActiveSubscription(context({ subscriptions: [subscription('BUNDLE')] }))).toBe(true);
  });
});

describe('admin ruxsati', () => {
  const permission = { categoryId: 'att', subjectId: 'physics', isActive: true, expiresAt: future };
  it('fanli ruxsat paid testni ham ochadi, boshqa fan va kategoriyani ochmaydi', () => {
    const ctx = context({ permissions: [permission] });
    expect(canAccessByEntitlements({ ...baseTest, accessType: 'paid' }, ctx)).toBe(true);
    expect(canAccessByEntitlements({ ...baseTest, subjectId: 'math' }, ctx)).toBe(false);
    expect(canAccessByEntitlements({ ...baseTest, categoryId: 'dtm' }, ctx)).toBe(false);
  });
  it('fansiz, muddatsiz va muddat chegarasidagi ruxsat', () => {
    for (const expiresAt of [null, now]) {
      const ctx = context({ permissions: [{ ...permission, subjectId: null, expiresAt }] });
      expect(canAccessByEntitlements({ ...baseTest, subjectId: 'math' }, ctx)).toBe(true);
    }
  });
  it('muddati tugagan va nofaol ruxsat yopiq', () => {
    for (const change of [{ expiresAt: past }, { isActive: false }]) {
      expect(canAccessByEntitlements(baseTest, context({ permissions: [{ ...permission, ...change }] }))).toBe(false);
    }
  });
  it('mehmon faqat bepul testga, admin barcha testga kiradi', () => {
    expect(canAccessByEntitlements(baseTest, null)).toBe(false);
    expect(canAccessByEntitlements({ ...baseTest, isFree: true }, null)).toBe(true);
    expect(canAccessByEntitlements(baseTest, context({ isAdmin: true }))).toBe(true);
  });
});

describe('ProductOffer muddati', () => {
  it.each([
    [1, null, true], [3, null, true], [null, future, true],
    [null, null, false], [1, future, false], [0, null, false], [-1, null, false],
    [1.5, null, false], [NaN, null, false], [Infinity, null, false], [null, new Date('invalid'), false],
  ] as const)('oy=%s, sana=%s → %s', (durationMonths, untilDate, expected) => {
    expect(isValidOfferDuration({ durationMonths, untilDate })).toBe(expected);
  });
});
