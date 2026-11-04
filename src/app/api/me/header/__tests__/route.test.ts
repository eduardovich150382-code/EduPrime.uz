import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { subscriptionFixture as sub, subscriptionNow as now } from '@/lib/__tests__/fixtures/subscriptions';

const m = vi.hoisted(() => ({
  auth: vi.fn(), count: vi.fn(), updateMany: vi.fn(), rows: vi.fn(), permissions: vi.fn(), warn: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth', () => ({ auth: m.auth }));
vi.mock('@/lib/db', () => ({
  db: {
    notification: { count: m.count },
    user: { updateMany: m.updateMany },
    $queryRaw: m.rows,
    userPermission: { findMany: m.permissions },
  },
}));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: m.warn } }));
import { GET } from '../route';

beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(now);
  m.auth.mockResolvedValue({ user: { id: 'u1' } });
  m.count.mockResolvedValue(3); m.updateMany.mockResolvedValue({ count: 1 });
  m.rows.mockResolvedValue([]); m.permissions.mockResolvedValue([]);
});
afterEach(() => vi.useRealTimers());

describe('GET /api/me/header', () => {
  it('mehmon: 401, son 0, bazaga murojaat yo‘q, keshlanmaydi', async () => {
    m.auth.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ unreadCount: 0, subscription: null });
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(m.count).not.toHaveBeenCalled(); expect(m.rows).not.toHaveBeenCalled(); expect(m.updateMany).not.toHaveBeenCalled();
  });

  it('kirgan: son va obuna holati bitta javobda, keshlanmaydi', async () => {
    m.rows.mockResolvedValue([sub()]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    const body = await response.json();
    expect(body.unreadCount).toBe(3);
    expect(body.subscription).toMatchObject({ plan: 'CATEGORY', hasAnyScope: true, daysUntilExpiry: 1 });
    expect(body.subscription.subscriptions).toHaveLength(1);
    expect(m.count).toHaveBeenCalledWith({ where: { userId: 'u1', isRead: false } });
  });

  it('obunasiz: eski /api/subscription/status bilan bir xil maydonlar', async () => {
    expect((await (await GET()).json()).subscription).toEqual({ plan: 'FREE', subscriptions: [], hasPremium: false, hasTeacher: false,
      daysUntilExpiry: null, hasAnyScope: false, expiringSubscription: null });
  });

  it('lastActiveAt soatiga bir marta sharti bilan yoziladi', async () => {
    await GET();
    expect(m.updateMany).toHaveBeenCalledWith({
      where: { id: 'u1', OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: new Date(now.getTime() - 60 * 60_000) } }] },
      data: { lastActiveAt: now },
    });
  });

  it('lastActiveAt yozuvi yiqilsa ham 200 va ikkala maydon', async () => {
    m.updateMany.mockRejectedValue(new Error('db timeout'));
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.unreadCount).toBe(3); expect(body.subscription).toMatchObject({ plan: 'FREE' });
    expect(m.warn).toHaveBeenCalled();
  });

  it('son yoki obuna yuklanmasa — 500 (klient keshlamaydi)', async () => {
    m.count.mockRejectedValue(new Error('db down'));
    const response = await GET();
    expect(response.status).toBe(500);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
});
