import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const m = vi.hoisted(() => {
  process.env.TELEGRAM_BOT_TOKEN = 'test-bot-secret';
  return { user: vi.fn(), payment: vi.fn(), update: vi.fn(), create: vi.fn() };
});
vi.mock('@/lib/db', () => ({ db: { user: { findUnique: m.user }, payment: { findFirst: m.payment, update: m.update }, subscription: { create: m.create } } }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
import { PATCH, POST } from '../route';

const request = (body = {}, secret = 'test-bot-secret') => new NextRequest('http://localhost/api/telegram/payments', {
  method: 'PATCH', headers: { 'x-bot-secret': secret }, body: JSON.stringify({ telegramId: 123, action: 'confirm', adminTelegramId: 456, ...body }),
});
beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-24T07:00:00Z'));
  m.user.mockResolvedValue({ id: 'u1' }); m.payment.mockResolvedValue({ id: 'pay1', productId: 'p', plan: 'CATEGORY', duration: 'CUSTOM' });
  m.create.mockResolvedValue({ id: 's1' });
});
afterEach(() => vi.useRealTimers());

describe('ishlatilmaydigan bot API himoyasi', () => {
  it.each(['confirm', 'reject', 'receipt'])('yangi mahsulot to‘lovini %s orqali o‘zgartirmaydi', async (action) => {
    expect((await PATCH(request({ action, receiptPhoto: 'receipt' }))).status).toBe(400);
    expect(m.update).not.toHaveBeenCalled(); expect(m.create).not.toHaveBeenCalled();
  });
  it('eski POST yangi Payment summasini ham o‘zgartira olmaydi', async () => {
    const response = await POST(new NextRequest('http://localhost/api/telegram/payments', { method: 'POST', headers: { 'x-bot-secret': 'test-bot-secret' }, body: JSON.stringify({ telegramId: 123, plan: 'premium', duration: '1_month', amount: 1 }) }));
    expect(response.status).toBe(400); expect(m.update).not.toHaveBeenCalled();
  });
  it('eski to‘lovning tasdiqlanishi saqlanadi', async () => {
    m.payment.mockResolvedValue({ id: 'old', productId: null, plan: 'TEACHER_PLAN', duration: 'THREE_MONTHS' });
    expect((await PATCH(request())).status).toBe(200);
    expect(m.create).toHaveBeenCalledWith({ data: expect.objectContaining({ plan: 'TEACHER_PLAN', duration: 'THREE_MONTHS', paymentId: 'old', endDate: new Date('2027-01-24T07:00:00Z') }) });
  });
  it('bot siri bo‘lmasa rad etadi', async () => {
    expect((await PATCH(request({}, 'wrong'))).status).toBe(401); expect(m.user).not.toHaveBeenCalled();
  });
});
