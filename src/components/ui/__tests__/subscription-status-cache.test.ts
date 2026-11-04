import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSubscriptionStatusCache, loadSubscriptionStatus } from '../useSubscriptionStatus';
import { getUnread, loadMeHeader, markNotificationsRead, subscribeUnread } from '@/lib/me-header-store';

// Obuna holati endi `/api/me/header` ichida — son bilan bitta so'rov.
const ok = (plan: string, unreadCount = 0) => ({ ok: true, json: async () => ({ unreadCount, subscription: { plan } }) }) as Response;
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => { clearSubscriptionStatusCache(); fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('obuna holati keshi', () => {
  it('bir foydalanuvchi uchun bir nechta komponent — bitta so‘rov, /api/me/header', async () => {
    fetchMock.mockResolvedValue(ok('CATEGORY'));
    const [a, b] = await Promise.all([loadSubscriptionStatus('u1', 0), loadSubscriptionStatus('u1', 1000)]);
    expect(a).toEqual({ plan: 'CATEGORY' }); expect(b).toBe(a);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/me/header');
  });
  it('Header soni va obuna holati bitta so‘rovdan', async () => {
    fetchMock.mockResolvedValue(ok('CATEGORY', 4));
    const [header, status] = await Promise.all([loadMeHeader('u1', 0), loadSubscriptionStatus('u1', 0)]);
    expect(header.unreadCount).toBe(4); expect(status).toEqual({ plan: 'CATEGORY' });
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
  it('sotib olishdan keyin: clear → 60 soniya ichida ham yangi holat (BuyOfferButton oqimi)', async () => {
    fetchMock.mockResolvedValueOnce(ok('FREE')).mockResolvedValueOnce(ok('CATEGORY'));
    expect(await loadSubscriptionStatus('u1', 0)).toEqual({ plan: 'FREE' });
    clearSubscriptionStatusCache();
    expect(await loadSubscriptionStatus('u1', 5_000)).toEqual({ plan: 'CATEGORY' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('401/500 va tarmoq xatosi keshlanmaydi', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401 } as Response)
      .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(ok('CATEGORY'));
    await expect(loadSubscriptionStatus('u1', 0)).rejects.toThrow('STATUS_UNAVAILABLE');
    await expect(loadSubscriptionStatus('u1', 0)).rejects.toThrow('STATUS_UNAVAILABLE');
    await expect(loadSubscriptionStatus('u1', 0)).rejects.toThrow('offline');
    expect(await loadSubscriptionStatus('u1', 0)).toEqual({ plan: 'CATEGORY' });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

describe('o‘qilmaganlar soni', () => {
  it('faqat yangi javobda yoziladi; kesh hit o‘qilganini qaytarib qo‘ymaydi', async () => {
    fetchMock.mockResolvedValue(ok('FREE', 3));
    const listener = vi.fn();
    const stop = subscribeUnread(listener);
    await loadMeHeader('u1', 0);
    expect(getUnread('u1')).toBe(3); expect(listener).toHaveBeenCalledTimes(1);

    markNotificationsRead(1);
    expect(getUnread('u1')).toBe(2);
    await loadMeHeader('u1', 30_000); // kesh hit
    expect(getUnread('u1')).toBe(2);

    markNotificationsRead('all');
    expect(getUnread('u1')).toBe(0);
    markNotificationsRead(1);
    expect(getUnread('u1')).toBe(0);
    stop();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('boshqa foydalanuvchi yoki mehmon — 0', async () => {
    fetchMock.mockResolvedValue(ok('FREE', 5));
    await loadMeHeader('u1', 0);
    expect(getUnread('u2')).toBe(0); expect(getUnread(null)).toBe(0);
  });
});
