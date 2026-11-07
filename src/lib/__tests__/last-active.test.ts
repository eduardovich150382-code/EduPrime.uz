import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ updateMany: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../db', () => ({ db: { user: { updateMany: m.updateMany } } }));
import { LAST_ACTIVE_RESOLUTION_MS, PING_RESOLUTION_MS, touchLastActive } from '../last-active';

const now = new Date('2026-11-08T10:00:00.000Z');
const threshold = () => m.updateMany.mock.calls[0][0].where.OR[1].lastActiveAt.lt as Date;

beforeEach(() => { m.updateMany.mockReset(); m.updateMany.mockResolvedValue({ count: 0 }); });

describe('touchLastActive aniqligi', () => {
  it('default — 1 soat (mavjud chaqiruvlar o‘zgarmaydi)', async () => {
    await touchLastActive('u1', now);
    expect(LAST_ACTIVE_RESOLUTION_MS).toBe(3_600_000);
    expect(threshold()).toEqual(new Date('2026-11-08T09:00:00.000Z'));
  });

  it('berilgan aniqlik — ping uchun 2 daqiqa', async () => {
    await touchLastActive('u1', now, PING_RESOLUTION_MS);
    expect(threshold()).toEqual(new Date('2026-11-08T09:58:00.000Z'));
    expect(m.updateMany.mock.calls[0][0].where.id).toBe('u1');
    expect(m.updateMany.mock.calls[0][0].data).toEqual({ lastActiveAt: now });
  });

  it('ping oralig‘i onlayn oynasiga sig‘adi: eng eski yozuv 2×aniqlikdan yangi', () => {
    // Ping har 2 daqiqada; shart chegarasida bitta ping o'tkazib yuborilsa ham
    // yozuv ~4 daqiqadan eski bo'lmaydi — 5 daqiqalik "onlayn" oynasidan kichik.
    expect(2 * PING_RESOLUTION_MS).toBeLessThan(5 * 60_000);
  });
});
