import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { subscriptionFixture as sub } from '@/lib/__tests__/fixtures/subscriptions';

const m = vi.hoisted(() => ({ auth: vi.fn(), user: vi.fn(), rows: vi.fn(), results: vi.fn() }));
vi.mock('@/lib/api-auth', () => ({ requireAdmin: m.auth }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/lib/db', () => ({ db: { $queryRaw: m.rows, user: { findUnique: m.user }, testResult: { findMany: m.results } } }));
import { GET } from '../route';
const get = () => GET(new NextRequest('http://localhost'), { params: Promise.resolve({ id: 'u1' }) });
beforeEach(() => { vi.resetAllMocks(); m.auth.mockResolvedValue({ error: null }); m.user.mockResolvedValue({ id: 'u1' }); m.rows.mockResolvedValue([sub()]); m.results.mockResolvedValue([]); });

describe('admin foydalanuvchi obunalari', () => {
  it('nomlar, fanlar va muddat yagona manbadan qaytadi', async () => {
    const data = await (await get()).json();
    expect(data.subscriptions[0]).toMatchObject({ name: sub().product, subjects: sub().subjects,
      startDate: sub().startDate.toISOString(), endDate: sub().endDate.toISOString(), isLegacy: false });
    expect(m.rows).toHaveBeenCalledOnce();
  });
  it('admin bo‘lmagan va topilmagan foydalanuvchida obuna yuklanmaydi', async () => {
    m.auth.mockResolvedValueOnce({ error: NextResponse.json({}, { status: 403 }) });
    expect((await get()).status).toBe(403);
    m.user.mockResolvedValue(null);
    expect((await get()).status).toBe(404); expect(m.rows).not.toHaveBeenCalled();
  });
});
