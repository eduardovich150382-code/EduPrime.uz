import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ auth: vi.fn(), updateMany: vi.fn(), warn: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth', () => ({ auth: m.auth }));
vi.mock('@/lib/db', () => ({ db: { user: { updateMany: m.updateMany } } }));
vi.mock('@/lib/logger', () => ({ logger: { warn: m.warn, error: vi.fn() } }));
import { POST } from '../route';

const now = new Date('2026-11-08T10:00:00.000Z');

beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(now);
  m.updateMany.mockResolvedValue({ count: 1 });
});
afterEach(() => vi.useRealTimers());

describe('POST /api/me/ping', () => {
  it('mehmon: 204, body yo‘q, bazaga yozuv yo‘q (401 log shovqini bo‘lmasin)', async () => {
    m.auth.mockResolvedValue(null);
    const res = await POST();
    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expect(m.updateMany).not.toHaveBeenCalled();
  });

  it('kirgan foydalanuvchi: bitta shartli updateMany, 2 daqiqalik aniqlik', async () => {
    m.auth.mockResolvedValue({ user: { id: 'u1' } });
    const res = await POST();
    expect(res.status).toBe(204);
    expect(m.updateMany).toHaveBeenCalledTimes(1);
    expect(m.updateMany).toHaveBeenCalledWith({
      where: { id: 'u1', OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: new Date('2026-11-08T09:58:00.000Z') } }] },
      data: { lastActiveAt: now },
    });
  });

  it('baza xatosi javobni buzmaydi — 204 va warn log', async () => {
    m.auth.mockResolvedValue({ user: { id: 'u1' } });
    m.updateMany.mockRejectedValue(new Error('db down'));
    expect((await POST()).status).toBe(204);
    expect(m.warn).toHaveBeenCalledTimes(1);
  });
});
