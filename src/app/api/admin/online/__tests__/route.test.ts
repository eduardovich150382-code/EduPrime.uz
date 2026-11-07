import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const m = vi.hoisted(() => ({ auth: vi.fn(), count: vi.fn(), findMany: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/api-auth', () => ({ requireAdmin: m.auth }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/lib/db', () => ({ db: { user: { count: m.count, findMany: m.findMany } } }));
import { GET } from '../route';

// 19:30 UTC = Toshkentda 00:30 (9-noyabr) — UTC kuni hali 8-noyabr.
const now = new Date('2026-11-08T19:30:00.000Z');

beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(now);
  m.auth.mockResolvedValue({ error: null });
  m.count.mockResolvedValueOnce(3).mockResolvedValueOnce(40).mockResolvedValueOnce(250);
  m.findMany.mockResolvedValue([]);
});
afterEach(() => vi.useRealTimers());

const gte = (call: number) => m.count.mock.calls[call][0].where.lastActiveAt.gte as Date;

describe('GET /api/admin/online', () => {
  it('admin bo‘lmasa 403 va bazaga murojaat yo‘q', async () => {
    m.auth.mockResolvedValue({ error: NextResponse.json({}, { status: 403 }) });
    expect((await GET()).status).toBe(403);
    expect(m.count).not.toHaveBeenCalled();
    expect(m.findMany).not.toHaveBeenCalled();
  });

  it('sanash chegaralari: 5 daqiqa, Toshkent "bugun", 7 kun', async () => {
    const data = await (await GET()).json();
    expect(data.counts).toEqual({ onlineNow: 3, activeToday: 40, active7d: 250 });
    expect(gte(0)).toEqual(new Date('2026-11-08T19:25:00.000Z'));
    // Toshkent yarim tuni 9-noyabr 00:00 = 8-noyabr 19:00 UTC (UTC 00:00 emas).
    expect(gte(1)).toEqual(new Date('2026-11-08T19:00:00.000Z'));
    expect(gte(2)).toEqual(new Date('2026-11-01T19:30:00.000Z'));
  });

  it('ro‘yxat: bitta findMany, ko‘pi bilan 200, filtrlangan _count → boolean, telegramId chiqmaydi', async () => {
    m.findMany.mockResolvedValue([
      { id: 'u1', name: 'Ali', telegramUsername: 'ali', email: null, role: 'USER', lastActiveAt: now, telegramId: '777', _count: { subscriptions: 1, testSessions: 0 } },
      { id: 'u2', name: null, telegramUsername: null, email: 'b@x.uz', role: 'ADMIN', lastActiveAt: now, telegramId: null, _count: { subscriptions: 0, testSessions: 2 } },
    ]);
    const data = await (await GET()).json();
    expect(m.findMany).toHaveBeenCalledTimes(1);
    const args = m.findMany.mock.calls[0][0];
    expect(args.take).toBe(200);
    expect(args.orderBy).toEqual({ lastActiveAt: 'desc' });
    expect(args.where.lastActiveAt.gte).toEqual(new Date('2026-11-08T19:25:00.000Z'));
    expect(args.select._count.select.subscriptions.where).toEqual({ isActive: true, startDate: { lte: now }, endDate: { gte: now } });
    expect(args.select._count.select.testSessions.where).toEqual({ submittedAt: null, expiresAt: { gt: now } });
    expect(data.users.map((u: { id: string; hasSubscription: boolean; inTest: boolean; hasTelegram: boolean }) => [u.id, u.hasSubscription, u.inTest, u.hasTelegram]))
      .toEqual([['u1', true, false, true], ['u2', false, true, false]]);
    expect(JSON.stringify(data)).not.toContain('777');
  });
});
