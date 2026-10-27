import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ settings: vi.fn(), payments: vi.fn(), remove: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { systemSetting: { findMany: m.settings, deleteMany: m.remove }, payment: { findMany: m.payments } } }));
import { cleanupCheckoutSettings, staleCheckoutSettings } from '../checkout-cleanup';

const now = new Date('2026-10-27T08:00:00Z');
const HOUR = 60 * 60 * 1000, DAY = 24 * HOUR;
const intent = (ageMs: number) => JSON.stringify({ userId: 'u1', productId: 'p1', offerId: 'o1', subjectIds: [], createdAt: now.getTime() - ageMs });
const payment = (id: string, status: 'PENDING' | 'CONFIRMED' | 'REJECTED', ageMs = HOUR) => ({ id, status, createdAt: new Date(now.getTime() - ageMs) });

describe('eskirgan checkout kalitlari', () => {
  it('niyat: 24 soatdan eskisi va buzilgani o‘chadi, yangisi qoladi', () => {
    const rows = [
      { key: 'checkout_intent_fresh', value: intent(2 * HOUR) },
      { key: 'checkout_intent_old', value: intent(25 * HOUR) },
      { key: 'checkout_intent_broken', value: '{not json' },
    ];
    expect(staleCheckoutSettings(rows, [], now).map((r) => r.key)).toEqual(['checkout_intent_old', 'checkout_intent_broken']);
  });
  it('yo‘naltirgich: faqat yaqindagi PENDING to‘lovniki qoladi', () => {
    const payments = [payment('pending', 'PENDING'), payment('confirmed', 'CONFIRMED'), payment('rejected', 'REJECTED'), payment('ancient', 'PENDING', 31 * DAY)];
    const rows = [
      { key: 'checkout_tg_1', value: JSON.stringify({ paymentId: 'pending' }) },
      { key: 'checkout_tg_2', value: JSON.stringify({ paymentId: 'confirmed' }) },
      { key: 'checkout_tg_3', value: JSON.stringify({ paymentId: 'missing' }) },
      { key: 'checkout_tg_4', value: 'null' },
      { key: 'checkout_chat_pending', value: JSON.stringify({ telegramId: '1' }) },
      { key: 'checkout_chat_rejected', value: JSON.stringify({ telegramId: '1' }) },
      { key: 'checkout_chat_ancient', value: JSON.stringify({ telegramId: '1' }) },
    ];
    expect(staleCheckoutSettings(rows, payments, now).map((r) => r.key))
      .toEqual(['checkout_tg_2', 'checkout_tg_3', 'checkout_tg_4', 'checkout_chat_rejected', 'checkout_chat_ancient']);
  });
  it('boshqa kalitlarga tegmaydi', () => {
    expect(staleCheckoutSettings([{ key: 'pending_payment_1', value: '' }, { key: 'checkout_other', value: '' }], [], now)).toEqual([]);
  });
});

describe('cleanupCheckoutSettings', () => {
  beforeEach(() => { vi.resetAllMocks(); m.remove.mockResolvedValue({ count: 2 }); });
  it('uchta so‘rov: kalitlar, to‘lovlar bitta IN bilan, bitta deleteMany kalit+qiymat bo‘yicha', async () => {
    const tg = { key: 'checkout_tg_1', value: JSON.stringify({ paymentId: 'pay1' }) };
    m.settings.mockResolvedValue([{ key: 'checkout_intent_old', value: intent(2 * DAY) }, tg, { key: 'checkout_chat_pay1', value: '{}' }]);
    m.payments.mockResolvedValue([payment('pay1', 'CONFIRMED')]);
    expect(await cleanupCheckoutSettings(now)).toBe(2);
    expect(m.payments).toHaveBeenCalledOnce();
    expect(m.payments.mock.calls[0][0].where).toEqual({ id: { in: ['pay1'] } });
    expect(m.remove).toHaveBeenCalledOnce();
    expect(m.remove.mock.calls[0][0].where.OR).toEqual([
      { key: 'checkout_intent_old', value: intent(2 * DAY) }, tg, { key: 'checkout_chat_pay1', value: '{}' },
    ]);
  });
  it('eskirgan kalit bo‘lmasa o‘chirish chaqirilmaydi', async () => {
    m.settings.mockResolvedValue([{ key: 'checkout_intent_new', value: intent(HOUR) }]);
    expect(await cleanupCheckoutSettings(now)).toBe(0);
    expect(m.payments).not.toHaveBeenCalled(); expect(m.remove).not.toHaveBeenCalled();
  });
});
