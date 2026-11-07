import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const m = vi.hoisted(() => ({ auth: vi.fn(), findMany: vi.fn(), count: vi.fn(), raw: vi.fn() }));
vi.mock('@/lib/api-auth', () => ({ requireAdmin: m.auth }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/lib/cache-tags', () => ({ revalidateTestCatalog: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { test: { findMany: m.findMany, count: m.count }, $queryRaw: m.raw } }));
import { GET } from '../route';

const test = (id: string) => ({
  id, titleUz: `Test ${id}`, subject: { nameUz: 'Fizika', icon: null }, teacher: null, isPublished: true, isFree: false,
  accessType: 'free', questionCount: 30, duration: 60, difficulty: 2, _count: { results: 9 }, createdAt: new Date('2026-11-01T00:00:00Z'),
});
const req = (query = '') => new NextRequest(`http://localhost/api/admin/tests${query}`);
const isStats = (sql: { text: string }) => sql.text.includes('GROUP BY r."testId"') && !sql.text.includes('FROM "Test" t');

beforeEach(() => {
  vi.resetAllMocks();
  m.auth.mockResolvedValue({ error: null });
  m.count.mockResolvedValue(95);
});

describe('GET /api/admin/tests', () => {
  it('403 admin bo‘lmasa', async () => {
    m.auth.mockResolvedValue({ error: NextResponse.json({}, { status: 403 }) });
    expect((await GET(req())).status).toBe(403);
  });

  it('default: yangilari, 30 tadan; ishlaganlar va o‘rtacha bitta guruhlangan so‘rovda (N+1 yo‘q)', async () => {
    m.findMany.mockResolvedValue([test('a'), test('b'), test('c')]);
    m.raw.mockResolvedValue([{ testId: 'a', participants: 4, avgScore: 61.6 }, { testId: 'c', participants: 1, avgScore: 20 }]);
    const data = await (await GET(req('?page=2'))).json();
    expect(m.findMany.mock.calls[0][0]).toMatchObject({ orderBy: { createdAt: 'desc' }, skip: 30, take: 30 });
    expect(m.raw).toHaveBeenCalledTimes(1);
    expect(isStats(m.raw.mock.calls[0][0])).toBe(true);
    expect(m.raw.mock.calls[0][0].values).toEqual([['a', 'b', 'c']]);
    expect(data.tests.map((t: { id: string; participants: number; avgScore: number; attempts: number }) => [t.id, t.participants, t.avgScore, t.attempts]))
      .toEqual([['a', 4, 62, 9], ['b', 0, 0, 9], ['c', 1, 20, 9]]);
    expect(data).toMatchObject({ total: 95, page: 2, limit: 30, sort: 'new' });
  });

  it('sort=participants: raw tartib saqlanadi, sahifalash offset bilan', async () => {
    m.raw.mockImplementation(async (sql: { text: string }) => (isStats(sql)
      ? [{ testId: 'c', participants: 50, avgScore: 70 }, { testId: 'a', participants: 10, avgScore: 40 }]
      : [{ id: 'c' }, { id: 'a' }, { id: 'b' }]));
    // `in` so'rovi boshqa tartibda qaytaradi — javob baribir raw tartibda bo'lishi kerak.
    m.findMany.mockResolvedValue([test('a'), test('b'), test('c')]);
    const data = await (await GET(req('?sort=participants&page=2&status=draft&search=50%25_x'))).json();
    const order = m.raw.mock.calls.map(([sql]) => sql).find((sql: { text: string }) => !isStats(sql));
    expect(order.text).toContain('ORDER BY COALESCE(p."n", 0) DESC, t."createdAt" DESC, t."id" ASC');
    expect(order.values).toEqual(['50%_x', '%50\\%\\_x%', false, false, 30, 30]);
    expect(m.findMany.mock.calls[0][0].where).toEqual({ id: { in: ['c', 'a', 'b'] } });
    expect(data.tests.map((t: { id: string }) => t.id)).toEqual(['c', 'a', 'b']);
    expect(data.tests.map((t: { participants: number }) => t.participants)).toEqual([50, 10, 0]);
    expect(m.count.mock.calls[0][0].where).toEqual({ titleUz: { contains: '50%_x', mode: 'insensitive' }, isPublished: false });
  });

  it('bo‘sh sahifada statistika so‘rovi yuborilmaydi', async () => {
    m.findMany.mockResolvedValue([]);
    const data = await (await GET(req())).json();
    expect(m.raw).not.toHaveBeenCalled();
    expect(data.tests).toEqual([]);
  });
});
