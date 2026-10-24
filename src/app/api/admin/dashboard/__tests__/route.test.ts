import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { subscriptionFixture as sub, subscriptionNow as now } from '@/lib/__tests__/fixtures/subscriptions';

const m = vi.hoisted(() => ({ auth: vi.fn(), rows: vi.fn(), count: vi.fn(), payments: vi.fn(), tests: vi.fn() }));
vi.mock('@/lib/api-auth', () => ({ requireAdmin: m.auth }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/lib/db', () => ({ db: { $queryRaw: m.rows, user: { count: m.count }, testResult: { count: m.count },
  payment: { count: m.count, findMany: m.payments }, test: { count: m.count, findMany: m.tests }, item: { count: m.count } } }));
import { GET } from '../route';

beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(now);
  m.auth.mockResolvedValue({ error: null }); m.rows.mockResolvedValue([]); m.count.mockResolvedValue(1);
  m.payments.mockResolvedValue([]); m.tests.mockResolvedValue([]);
});
afterEach(() => vi.useRealTimers());

describe('admin bosh sahifa obunalari', () => {
  it('admin tekshiruvi saqlanadi', async () => {
    m.auth.mockResolvedValue({ error: NextResponse.json({}, { status: 403 }) });
    expect((await GET()).status).toBe(403); expect(m.rows).not.toHaveBeenCalled();
  });
  it('CATEGORY, BUNDLE va legacy mahsulot bo‘yicha sanaladi, to‘lov noto‘g‘ri nomlanmaydi', async () => {
    const bundle = sub({ id: 'bundle', plan: 'BUNDLE', productId: 'all', product: { nameUz: 'Hammasi', nameRu: 'Всё', nameEn: 'All' } });
    m.rows.mockResolvedValue([sub(), sub({ id: 's2' }), bundle, sub({ id: 'legacy', plan: 'PREMIUM', productId: null, product: null })]);
    m.payments.mockResolvedValue([{ ...sub(), amount: 49000, createdAt: now, status: 'CONFIRMED', user: { name: 'User', telegramUsername: null, image: null } }]);
    const data = await (await GET()).json();
    expect(data.stats.activeSubscriptions).toBe(4);
    expect(data.subscriptionProducts.map((p: { id: string; count: number }) => [p.id, p.count])).toEqual([['att', 2], ['all', 1], ['PREMIUM', 1]]);
    expect(data.recentPayments[0].name.nameUz).toBe('Attestatsiya');
    const [sql, ids, , timeline] = m.rows.mock.calls[0];
    expect(ids).toBeNull(); expect(timeline).toBe(false); expect(sql.join('?')).toContain('s."startDate" <=');
  });
});
