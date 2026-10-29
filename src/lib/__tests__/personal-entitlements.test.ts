import { beforeEach, describe, expect, it, vi } from 'vitest';

// Bitta fake ma'lumot to'plami: `findMany` (eski access yo'li) va `$queryRaw`
// (pricing/timeline yo'li) ikkalasi ham shundan o'qiydi — shuning uchun yangi
// `loadPersonalEntitlements` eski ikki yuklovchi bilan bir xil to'plam
// berishini to'g'ridan-to'g'ri solishtirish mumkin.
type Row = { id: string; userId: string; plan: string; isActive: boolean; startDate: Date; endDate: Date };
const m = vi.hoisted(() => ({ rows: [] as Row[], findMany: vi.fn(), queryRaw: vi.fn(), testCategory: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../db', () => ({
  db: {
    subscription: { findMany: m.findMany },
    userPermission: { findMany: async () => [{ categoryId: 'att', subjectId: null, isActive: true, expiresAt: null }] },
    testCategory: { findMany: m.testCategory },
    $queryRaw: m.queryRaw,
  },
}));
import { loadPersonalEntitlements, loadTestAccessContext, loadUserEntitlements } from '../access';

const now = new Date('2026-10-29T07:00:00Z');
const day = 86400000;
const row = (id: string, plan: string, start: number, end: number, isActive = true): Row =>
  ({ id, userId: 'u1', plan, isActive, startDate: new Date(now.getTime() + start * day), endDate: new Date(now.getTime() + end * day) });
const extra = { categoryId: 'att', subjectIds: [], subjectRule: 'NONE', product: null };

beforeEach(() => {
  vi.resetAllMocks();
  m.rows = [
    row('current', 'CATEGORY', -10, 20),
    row('queued', 'CATEGORY', 20, 50), // uzaytirish — hali boshlanmagan
    row('legacy-future', 'PREMIUM', 5, 40), // eski tarif: startDate e'tiborsiz
    row('expired', 'CATEGORY', -40, -1), // cron hali yopmagan
    row('cancelled', 'BUNDLE', -5, 30, false),
  ];
  m.findMany.mockImplementation(async ({ where }: { where: { userId: string; isActive: boolean; endDate: { gte: Date } } }) => m.rows
    .filter((s) => s.userId === where.userId && s.isActive === where.isActive && s.endDate >= where.endDate.gte)
    .map((s) => ({ ...s, ...extra })));
  // loadSubscriptionRows SQL'i: isActive=true va (timeline YOKI startDate<=now<=endDate).
  m.queryRaw.mockImplementation(async (_sql: TemplateStringsArray, ...values: unknown[]) => {
    const timeline = values.includes(true);
    return m.rows.filter((s) => s.isActive && (timeline || (s.startDate <= now && s.endDate >= now))).map((s) => ({ ...s, ...extra }));
  });
});

// Kontekst turi id'ni bilmaydi, lekin qatorlar SQL'dan id bilan keladi.
const ids = (list: readonly object[]) => list.map((s) => ('id' in s ? s.id : undefined)).sort();

describe('loadPersonalEntitlements — bitta yuklash, ikki iste’molchi', () => {
  it('access to‘plami eski loadUserEntitlements bilan bir xil', async () => {
    const [personal, old] = await Promise.all([loadPersonalEntitlements('u1', now), loadUserEntitlements('u1', now)]);
    expect(ids(personal.access.subscriptions)).toEqual(ids(old.subscriptions));
    expect(ids(personal.access.subscriptions)).toEqual(['current', 'legacy-future', 'queued']);
    expect(personal.access.permissions).toEqual(old.permissions);
  });

  it('pricing to‘plami eski "pricing" rejimi bilan bir xil', async () => {
    const personal = await loadPersonalEntitlements('u1', now);
    const old = await loadUserEntitlements('u1', now, 'pricing');
    expect(ids(personal.pricing.subscriptions)).toEqual(ids(old.subscriptions));
    expect(ids(personal.pricing.subscriptions)).toEqual(['current']);
    expect(personal.pricing.permissions).toEqual([]);
  });

  it('subscription jadvaliga bitta so‘rov', async () => {
    await loadPersonalEntitlements('u1', now);
    expect(m.queryRaw).toHaveBeenCalledOnce();
    expect(m.findMany).not.toHaveBeenCalled();
  });
});

describe('loadTestAccessContext — tayyor entitlements', () => {
  const locked = [{ id: 't1', categoryId: 'att', subjectId: 's', isFree: false, accessType: 'subscription' }];
  const categoryTypes = new Map([['att', 'ATTESTATION' as const]]);

  it('berilsa obuna qayta so‘ralmaydi va kontekstga o‘tadi', async () => {
    const { access } = await loadPersonalEntitlements('u1', now);
    m.queryRaw.mockClear();
    const ctx = await loadTestAccessContext('u1', 'USER', locked, { categoryTypes, includePurchases: false, entitlements: access });
    expect(m.findMany).not.toHaveBeenCalled();
    expect(m.queryRaw).not.toHaveBeenCalled();
    expect(ids(ctx.subscriptions)).toEqual(ids(access.subscriptions));
  });

  it('berilmasa avvalgidek o‘zi yuklaydi', async () => {
    await loadTestAccessContext('u1', 'USER', locked, { categoryTypes, includePurchases: false });
    expect(m.findMany).toHaveBeenCalledOnce();
  });

  it('qulflangan test bo‘lmasa berilgan entitlements ham ishlatilmaydi (avvalgidek bo‘sh)', async () => {
    const { access } = await loadPersonalEntitlements('u1', now);
    const ctx = await loadTestAccessContext('u1', 'USER', [{ ...locked[0], isFree: true }], { categoryTypes, entitlements: access });
    expect(ctx.subscriptions).toEqual([]);
  });
});
