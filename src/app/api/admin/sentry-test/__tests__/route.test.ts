import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const m = vi.hoisted(() => ({ auth: vi.fn(), error: vi.fn(), flush: vi.fn() }));
// requireAdmin haqiqiysi ishlatiladi — rol tekshiruvi aynan shu yerda sinaladi.
vi.mock('@/lib/auth', () => ({ auth: m.auth }));
vi.mock('@/lib/logger', () => ({ logger: { error: m.error }, flushSentry: m.flush }));
import { GET } from '../route';

const call = (query = '') => GET(new NextRequest(`https://eduprime.uz/api/admin/sentry-test${query}`));

beforeEach(() => {
  vi.resetAllMocks();
  m.flush.mockResolvedValue(true);
});

describe('GET /api/admin/sentry-test', () => {
  it.each(['', '?throw=1'])('mehmon (%s) → 401, hech narsa yuborilmaydi', async (query) => {
    m.auth.mockResolvedValue(null);
    expect((await call(query)).status).toBe(401);
    expect(m.error).not.toHaveBeenCalled();
  });

  it.each(['USER', 'TEACHER'])('%s (oddiy va ?throw=1) → 403, xato tashlanmaydi', async (role) => {
    m.auth.mockResolvedValue({ user: { id: 'u1', role } });
    for (const query of ['', '?throw=1']) {
      expect((await call(query)).status).toBe(403);
    }
    expect(m.error).not.toHaveBeenCalled();
    expect(m.flush).not.toHaveBeenCalled();
  });

  it('admin → logger.error Error va source tegi bilan, flush natijasi qaytadi', async () => {
    m.auth.mockResolvedValue({ user: { id: 'a1', role: 'ADMIN' } });
    const response = await call();
    expect(response.status).toBe(200);
    expect((await response.json()).sent).toBe(true);
    const [, context] = m.error.mock.calls[0] as [string, { error: Error; tags: Record<string, string> }];
    expect(context.error).toBeInstanceOf(Error);
    expect(context.tags).toEqual({ source: 'sentry-test' });
  });

  it('admin ?throw=1 → tutilmagan xato (onRequestError uchun)', async () => {
    m.auth.mockResolvedValue({ user: { id: 'a1', role: 'ADMIN' } });
    await expect(call('?throw=1')).rejects.toThrow(/sentry-test onRequestError/);
    expect(m.error).not.toHaveBeenCalled();
  });
});
