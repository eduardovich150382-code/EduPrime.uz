import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSubscriptionStatusCache, loadSubscriptionStatus } from '../useSubscriptionStatus';

const ok = (plan: string) => ({ ok: true, json: async () => ({ plan }) }) as Response;
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => { clearSubscriptionStatusCache(); fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('obuna holati keshi', () => {
  it('bir foydalanuvchi uchun bir nechta komponent — bitta so‘rov', async () => {
    fetchMock.mockResolvedValue(ok('CATEGORY'));
    const [a, b] = await Promise.all([loadSubscriptionStatus('u1', 0), loadSubscriptionStatus('u1', 1000)]);
    expect(a).toEqual({ plan: 'CATEGORY' }); expect(b).toBe(a);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('boshqa foydalanuvchi, chiqish yoki 60 soniyadan keyin — yangi so‘rov', async () => {
    fetchMock.mockResolvedValueOnce(ok('CATEGORY')).mockResolvedValueOnce(ok('FREE'))
      .mockResolvedValueOnce(ok('BUNDLE')).mockResolvedValueOnce(ok('FREE'));
    await loadSubscriptionStatus('u1', 0);
    expect(await loadSubscriptionStatus('u2', 0)).toEqual({ plan: 'FREE' });
    expect(await loadSubscriptionStatus('u2', 61_000)).toEqual({ plan: 'BUNDLE' });
    clearSubscriptionStatusCache();
    expect(await loadSubscriptionStatus('u2', 61_500)).toEqual({ plan: 'FREE' });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
  it('401/500 va tarmoq xatosi keshlanmaydi', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 } as Response)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(ok('CATEGORY'));
    await expect(loadSubscriptionStatus('u1', 0)).rejects.toThrow('STATUS_UNAVAILABLE');
    await expect(loadSubscriptionStatus('u1', 0)).rejects.toThrow('offline');
    expect(await loadSubscriptionStatus('u1', 0)).toEqual({ plan: 'CATEGORY' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
