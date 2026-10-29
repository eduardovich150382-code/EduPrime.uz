import { beforeEach, describe, expect, it, vi } from 'vitest';
import { canAccessByEntitlements, checkCourseAccess, checkTestAccess, hasAnyActiveSubscription, loadFeatureEntitlements } from '../access';

// Admin bekor qilish faqat `isActive=false` qiladi (api/admin/subscriptions/[id]).
// Bu yerda o'sha qator keyingi so'rovdayoq kirish bermasligi tekshiriladi:
// fake `findMany` access.ts yuborgan `where`ni o'zi talqin qiladi, shuning
// uchun so'rovdan `isActive` sharti tushib qolsa test yiqiladi.
const m = vi.hoisted(() => ({ rows: [] as { userId: string; plan: string; isActive: boolean; endDate: Date }[] }));
vi.mock('../db', () => ({
  db: {
    subscription: {
      findMany: async ({ where }: { where: { userId: string; isActive?: boolean; endDate: { gte: Date } } }) => m.rows
        .filter((s) => s.userId === where.userId && (where.isActive === undefined || s.isActive === where.isActive) && s.endDate >= where.endDate.gte)
        .map((s) => ({ ...s, categoryId: null, subjectIds: [], startDate: new Date(0), product: null })),
    },
    userPermission: { findMany: async () => [] },
    subject: { findUnique: async () => ({ categoryId: 'cat' }) },
    payment: { findFirst: async () => null },
    purchase: { findUnique: async () => null },
  },
}));

const future = new Date(Date.now() + 30 * 86400000);
const premiumTest = { id: 't1', categoryId: 'cat', subjectId: 'sub', isFree: false, accessType: 'premium' };
const cancel = () => { for (const row of m.rows) row.isActive = false; };

beforeEach(() => { m.rows = []; });

describe('bekor qilingan obuna kirish huquqini darhol yopadi', () => {
  it('eski PREMIUM: test va kurs', async () => {
    m.rows = [{ userId: 'u1', plan: 'PREMIUM', isActive: true, endDate: future }];
    expect(await checkTestAccess('u1', premiumTest, 'STUDENT')).toBe(true);
    expect(await checkCourseAccess('u1', { id: 'c1', accessType: 'premium' }, 'STUDENT')).toBe(true);
    cancel();
    expect(await checkTestAccess('u1', premiumTest, 'STUDENT')).toBe(false);
    expect(await checkCourseAccess('u1', { id: 'c1', accessType: 'premium' }, 'STUDENT')).toBe(false);
  });

  it('BUNDLE: kurs va funksiyalar (yechim, AI)', async () => {
    m.rows = [{ userId: 'u1', plan: 'BUNDLE', isActive: true, endDate: future }];
    expect(await checkCourseAccess('u1', { id: 'c1', accessType: 'subscription', subjectId: 'sub' }, 'STUDENT')).toBe(true);
    expect(hasAnyActiveSubscription(await loadFeatureEntitlements('u1', 'STUDENT'))).toBe(true);
    cancel();
    expect(await checkCourseAccess('u1', { id: 'c1', accessType: 'subscription', subjectId: 'sub' }, 'STUDENT')).toBe(false);
    expect(hasAnyActiveSubscription(await loadFeatureEntitlements('u1', 'STUDENT'))).toBe(false);
  });

  it('kontekstga nofaol qator tushib qolsa ham qaror uni hisobga olmaydi', () => {
    const subscription = { plan: 'CATEGORY' as const, categoryId: 'cat', subjectIds: [], isActive: false, endDate: future, subjectRule: 'NONE' as const };
    const test = { ...premiumTest, accessType: 'subscription' };
    const ctx = { now: new Date(), permissions: [], isAdmin: false, categoryTypes: new Map(), purchasedTestIds: new Set<string>() };
    expect(canAccessByEntitlements(test, { ...ctx, subscriptions: [subscription] })).toBe(false);
    expect(canAccessByEntitlements(test, { ...ctx, subscriptions: [{ ...subscription, isActive: true }] })).toBe(true);
  });
});
