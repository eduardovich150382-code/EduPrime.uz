import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const m = vi.hoisted(() => ({ auth: vi.fn(), transaction: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), del: vi.fn(), info: vi.fn() }));
vi.mock('@/lib/api-auth', () => ({ requireAdmin: m.auth }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: m.info } }));
vi.mock('@/lib/db', () => ({ db: { $transaction: m.transaction } }));
import { PATCH } from '../[id]/route';

const now = new Date('2026-10-29T07:00:00Z');
const tx = { subscription: { findUnique: m.findUnique, findFirst: m.findFirst, update: m.update, delete: m.del } };
const base = { id: 's1', userId: 'u1', productId: 'obuna-attestation', plan: 'CATEGORY', paymentId: 'p1', endDate: new Date('2026-12-01T00:00:00Z') };
const call = (body: unknown, id = 's1') => PATCH(
  new NextRequest(`http://localhost/api/admin/subscriptions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  { params: Promise.resolve({ id }) },
);

beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(now);
  m.auth.mockResolvedValue({ user: { id: 'admin' }, error: null });
  m.transaction.mockImplementation((fn: (client: typeof tx) => Promise<unknown>) => fn(tx));
  m.findFirst.mockResolvedValue(null);
  m.update.mockImplementation(({ data }: { data: object }) => Promise.resolve({ ...base, ...data }));
});
afterEach(() => vi.useRealTimers());

describe('admin: obunani bekor qilish / qayta tiklash', () => {
  it.each([401, 403])('admin bo‘lmasa %i', async (status) => {
    m.auth.mockResolvedValue({ error: NextResponse.json({}, { status }) });
    expect((await call({ action: 'cancel' })).status).toBe(status);
    expect(m.transaction).not.toHaveBeenCalled();
  });
  it.each([{}, { action: 'delete' }, { action: 'cancel', extra: 1 }])('noto‘g‘ri body %j → 400', async (body) => {
    expect((await call(body)).status).toBe(400);
    expect(m.update).not.toHaveBeenCalled();
  });
  it('yo‘q obuna → 404', async () => {
    m.findUnique.mockResolvedValue(null);
    expect((await call({ action: 'cancel' })).status).toBe(404);
  });
  it('bekor qilish faqat isActive ni o‘chiradi, qator va to‘lov bog‘lanishi qoladi', async () => {
    m.findUnique.mockResolvedValue({ ...base, isActive: true });
    const response = await call({ action: 'cancel' });
    expect(response.status).toBe(200);
    expect(m.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: { isActive: false } });
    expect(m.del).not.toHaveBeenCalled();
    expect((await response.json()).subscription).toMatchObject({ isActive: false, paymentId: 'p1' });
    expect(m.info).toHaveBeenCalledWith('admin.subscription.cancel', { adminId: 'admin', subscriptionId: 's1', userId: 'u1' });
    expect(m.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
  });
  it('muddati o‘tmagan bekor qilingan obunani tiklaydi', async () => {
    m.findUnique.mockResolvedValue({ ...base, isActive: false });
    expect((await call({ action: 'restore' })).status).toBe(200);
    expect(m.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: { isActive: true } });
  });
  it('muddati o‘tgan obunani tiklamaydi — 400', async () => {
    m.findUnique.mockResolvedValue({ ...base, isActive: false, endDate: new Date('2026-10-28T00:00:00Z') });
    const response = await call({ action: 'restore' });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'SUBSCRIPTION_EXPIRED' });
    expect(m.update).not.toHaveBeenCalled();
  });
  it('shu mahsulot bo‘yicha boshqa faol obuna bo‘lsa — 409', async () => {
    m.findUnique.mockResolvedValue({ ...base, isActive: false });
    m.findFirst.mockResolvedValue({ id: 's2' });
    const response = await call({ action: 'restore' });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'ACTIVE_SUBSCRIPTION_EXISTS' });
    expect(m.findFirst).toHaveBeenCalledWith({
      where: { userId: 'u1', id: { not: 's1' }, isActive: true, endDate: { gte: now }, productId: 'obuna-attestation' },
      select: { id: true },
    });
    expect(m.update).not.toHaveBeenCalled();
  });
  it('eski tarifda to‘qnashuv plan bo‘yicha tekshiriladi', async () => {
    m.findUnique.mockResolvedValue({ ...base, productId: null, plan: 'PREMIUM', isActive: false });
    m.findFirst.mockResolvedValue({ id: 's2' });
    expect((await call({ action: 'restore' })).status).toBe(409);
    expect(m.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ plan: 'PREMIUM', productId: null }),
    }));
  });
  it('allaqachon faol obunani qayta yozmaydi', async () => {
    m.findUnique.mockResolvedValue({ ...base, isActive: true });
    expect((await call({ action: 'restore' })).status).toBe(200);
    expect(m.update).not.toHaveBeenCalled();
  });
  it('parallel o‘zgarishda qayta urinishni so‘raydi', async () => {
    m.transaction.mockRejectedValue({ code: 'P2034' });
    const response = await call({ action: 'restore' });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'RETRY_REQUIRED' });
  });
});
