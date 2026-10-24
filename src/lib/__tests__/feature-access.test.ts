import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SubscriptionPlan } from '@prisma/client';
import type { PermissionEntitlement, SubscriptionEntitlement } from '../entitlements';

const mocks = vi.hoisted(() => ({
  subscriptions: vi.fn(), permissions: vi.fn(), subjects: vi.fn(), subject: vi.fn(), user: vi.fn(),
  usage: vi.fn(), usageUpdate: vi.fn(), unlock: vi.fn(), unlockCreate: vi.fn(), purchase: vi.fn(), payment: vi.fn(),
  session: vi.fn(), imports: vi.fn(),
}));
vi.mock('../db', () => ({ db: {
  subscription: { findMany: mocks.subscriptions }, userPermission: { findMany: mocks.permissions },
  subject: { findMany: mocks.subjects, findUnique: mocks.subject }, user: { findUnique: mocks.user },
  dailyUsage: { upsert: mocks.usage, updateMany: mocks.usageUpdate },
  solutionUnlock: { findUnique: mocks.unlock, create: mocks.unlockCreate },
  purchase: { findUnique: mocks.purchase }, payment: { findFirst: mocks.payment },
  testSession: { findUnique: mocks.session }, importJob: { findMany: mocks.imports },
} }));

import { checkCourseAccess, loadFeatureEntitlements } from '../access';
import { consumeBuiltTest, consumeSolution, consumeTutorMessage, checkImportQuota, refundBuiltTest } from '../quota';

const future = new Date('2099-01-01');
const subjects = [
  { id: 'att-physics', categoryId: 'att', disciplineKey: 'fizika' },
  { id: 'att-math', categoryId: 'att', disciplineKey: 'matematika' },
];
function subscription(plan: SubscriptionPlan = 'CATEGORY', overrides: Partial<SubscriptionEntitlement> = {}) {
  return { plan, isActive: true, endDate: future, startDate: new Date('2020-01-01'), categoryId: 'att', subjectIds: ['att-physics'],
    subjectRule: 'ONE', ...overrides, product: { subjectRule: overrides.subjectRule ?? 'ONE' } };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.subscriptions.mockResolvedValue([subscription()]);
  mocks.permissions.mockResolvedValue([]);
  mocks.subjects.mockResolvedValue(subjects);
  mocks.subject.mockImplementation(async ({ where }: { where: { id: string } }) => {
    return [...subjects, { id: 'dtm-physics', categoryId: 'dtm', disciplineKey: 'fizika' }].find((s) => s.id === where.id) ?? null;
  });
  mocks.user.mockResolvedValue({ role: 'USER' });
  mocks.usage.mockResolvedValue({ builtTests: 1, solutionsUnlocked: 1, tutorMessages: 1 });
  mocks.unlock.mockResolvedValue(null);
  mocks.unlockCreate.mockResolvedValue({});
  mocks.purchase.mockResolvedValue(null);
  mocks.payment.mockResolvedValue(null);
  mocks.imports.mockResolvedValue([]);
});

describe('doirali kvota — haqiqiy loader va quota moduli', () => {
  it.each(['built', 'solution', 'tutor'] as const)('%s o‘z doirasida cheklovsiz, DTM kontekstida bepul', async (kind) => {
    const entitlements = await loadFeatureEntitlements('u', 'USER');
    const inside = { entitlements, scopes: [{ kind: 'discipline' as const, disciplineKey: 'fizika' }] };
    const outside = { entitlements, scopes: [{ kind: 'test' as const, categoryId: 'dtm', subjectId: 'dtm-physics' }] };
    const consume = kind === 'built' ? (ctx: typeof inside | typeof outside) => consumeBuiltTest('u', ctx)
      : kind === 'solution' ? (ctx: typeof inside | typeof outside) => consumeSolution('u', 'item', ctx)
      : (ctx: typeof inside | typeof outside) => consumeTutorMessage('u', ctx);
    expect((await consume(inside)).limit).toBeNull();
    expect(mocks.usage).not.toHaveBeenCalled();
    expect((await consume(outside)).limit).toBe(kind === 'solution' ? 10 : 3);
    expect(mocks.usage).toHaveBeenCalledTimes(1);
    expect(mocks.subscriptions).toHaveBeenCalledTimes(1);
    expect(mocks.permissions).toHaveBeenCalledTimes(1);
  });

  it('aralash /build bir bepul kvota sarflaydi; kontekstsiz yangi obuna cheksiz bo‘lmaydi', async () => {
    const entitlements = await loadFeatureEntitlements('u', 'USER');
    expect((await consumeBuiltTest('u', { entitlements, scopes: [
      { kind: 'discipline', disciplineKey: 'fizika' }, { kind: 'discipline', disciplineKey: 'kimyo' },
    ] })).limit).toBe(3);
    expect((await consumeBuiltTest('u')).limit).toBe(3);
  });

  it('doiradan tashqari bepul limit ham tugashi mumkin', async () => {
    mocks.usage.mockResolvedValue({ builtTests: 4 });
    mocks.usageUpdate.mockResolvedValue({ count: 1 });
    const entitlements = await loadFeatureEntitlements('u', 'USER');
    expect(await consumeBuiltTest('u', { entitlements, scopes: [{ kind: 'discipline', disciplineKey: 'kimyo' }] }))
      .toEqual({ allowed: false, limit: 3, usedToday: 3 });
    expect(mocks.usageUpdate).toHaveBeenCalledTimes(1);
  });

  it.each(['PREMIUM', 'TEACHER_PLAN', 'BUNDLE'] as const)('%s kalitsiz va DTM kvotalarida cheklovsiz', async (plan) => {
    mocks.subscriptions.mockResolvedValue([subscription(plan)]);
    expect((await consumeBuiltTest('u')).limit).toBeNull();
    expect((await consumeSolution('u', 'item')).limit).toBeNull();
    expect((await consumeTutorMessage('u')).limit).toBeNull();
    expect(mocks.usage).not.toHaveBeenCalled();
    expect(mocks.subjects).not.toHaveBeenCalled();
  });

  it('imports kontekstsiz bo‘lgani uchun fanli ruxsatning o‘zi yetarli', async () => {
    mocks.subscriptions.mockResolvedValue([]);
    const permission: PermissionEntitlement = { categoryId: 'att', subjectId: 'att-physics', isActive: true, expiresAt: future };
    mocks.permissions.mockResolvedValue([permission]);
    expect((await checkImportQuota('u', 'teacher', 'TEACHER')).limit).toBeNull();
    expect(mocks.imports).toHaveBeenCalledTimes(1);
  });

  it('ADMIN loader bazaga so‘rov yubormaydi', async () => {
    const entitlements = await loadFeatureEntitlements('u', 'ADMIN');
    expect((await consumeBuiltTest('u', { entitlements, scopes: [] })).limit).toBeNull();
    expect(mocks.subscriptions).not.toHaveBeenCalled();
    expect(mocks.permissions).not.toHaveBeenCalled();
    expect(mocks.subjects).not.toHaveBeenCalled();
    expect(mocks.user).not.toHaveBeenCalled();
  });

  it('100 obuna uchun ham bitta subscription, permission va Subject o‘qishi', async () => {
    mocks.subscriptions.mockResolvedValue(Array.from({ length: 100 }, () => subscription()));
    await loadFeatureEntitlements('u', 'USER');
    expect(mocks.subscriptions).toHaveBeenCalledTimes(1);
    expect(mocks.permissions).toHaveBeenCalledTimes(1);
    expect(mocks.subjects).toHaveBeenCalledTimes(1);
  });

  it('eski Teacher yonidagi yangi fan obunasi discipline metama’lumotini yo‘qotmaydi', async () => {
    mocks.subscriptions.mockResolvedValue([subscription('TEACHER_PLAN'), subscription()]);
    const entitlements = await loadFeatureEntitlements('u', 'USER');
    expect(entitlements.subjects).toEqual(subjects);
    expect(mocks.subjects).toHaveBeenCalledTimes(1);
  });

  it('kvota sarflamagan yangi sessiya boshqa sessiyaning sarfini qaytarmaydi', async () => {
    mocks.session.mockResolvedValue({ userId: 'u', startedAt: new Date(), spec: { builtQuotaCharged: false } });
    await refundBuiltTest('session');
    expect(mocks.usageUpdate).not.toHaveBeenCalled();
    mocks.session.mockResolvedValue({ userId: 'u', startedAt: new Date(), spec: { builtQuotaCharged: true } });
    await refundBuiltTest('session');
    expect(mocks.usageUpdate).toHaveBeenCalledTimes(1);
  });
});

describe('kurs doirasi', () => {
  it.each(['premium', 'teacher', 'premium_teacher', 'subscription'])('%s kurs o‘z fanida ochiq, boshqa kategoriyada yopiq', async (accessType) => {
    expect(await checkCourseAccess('u', { id: 'c', accessType, subjectId: 'att-physics' }, 'USER')).toBe(true);
    expect(await checkCourseAccess('u', { id: 'c', accessType, subjectId: 'dtm-physics' }, 'USER')).toBe(false);
    expect(await checkCourseAccess('u', { id: 'c', accessType, subjectId: 'att-math' }, 'USER')).toBe(false);
  });

  it('CATEGORY paid kursni ochmaydi; xarid va eski Payment zaxirasi ochadi', async () => {
    const course = { id: 'c', accessType: 'paid', subjectId: 'att-physics' };
    expect(await checkCourseAccess('u', course, 'USER')).toBe(false);
    mocks.purchase.mockResolvedValue({ id: 'purchase' });
    expect(await checkCourseAccess('u', course, 'USER')).toBe(true);
    mocks.purchase.mockResolvedValue(null);
    mocks.payment.mockResolvedValue({ id: 'legacy' });
    expect(await checkCourseAccess('u', course, 'USER')).toBe(true);
  });

  it('BUNDLE paid kursni xaridsiz ochadi', async () => {
    mocks.subscriptions.mockResolvedValue([subscription('BUNDLE')]);
    expect(await checkCourseAccess('u', { id: 'c', accessType: 'paid', subjectId: 'att-physics' }, 'USER')).toBe(true);
    expect(mocks.purchase).not.toHaveBeenCalled();
  });

  it.each([
    ['PREMIUM', [true, false, true, false, false]],
    ['TEACHER_PLAN', [false, true, true, false, false]],
  ] as const)('eski %s accessType matritsasi o‘zgarmagan', async (plan, expected) => {
    mocks.subscriptions.mockResolvedValue([subscription(plan)]);
    for (const [i, accessType] of ['premium', 'teacher', 'premium_teacher', 'subscription', 'paid'].entries()) {
      expect(await checkCourseAccess('u', { id: 'c', accessType, subjectId: 'dtm-physics' }, 'USER')).toBe(expected[i]);
    }
  });
});
