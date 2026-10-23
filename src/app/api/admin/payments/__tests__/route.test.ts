import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Payment, Prisma } from '@prisma/client';

const m = vi.hoisted(() => ({ auth: vi.fn(), transaction: vi.fn(), payment: vi.fn(), payments: vi.fn(), claim: vi.fn(), updated: vi.fn(), count: vi.fn(),
  product: vi.fn(), offer: vi.fn(), current: vi.fn(), create: vi.fn(), subjects: vi.fn(), setting: vi.fn(), deleteSetting: vi.fn(), user: vi.fn(), legacyPayment: vi.fn(), createPayment: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: m.auth }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/lib/purchases', () => ({ recordPurchase: vi.fn(), resolvePurchaseItemType: vi.fn().mockResolvedValue(null) }));
vi.mock('@/lib/db', () => ({ db: { $transaction: m.transaction, payment: { findUnique: m.payment, findMany: m.payments, count: m.count }, subject: { findMany: m.subjects } } }));
import { GET, PATCH } from '../route';
import { processLegacySubscription, processSubscriptionPayment } from '@/lib/subscription-payments';

const now = new Date('2026-10-24T07:00:00Z');
const subjects = ['physics', 'math'].map((id) => ({ id, categoryId: 'att', isMandatory: false, nameUz: id, nameRu: id, nameEn: id }));
const product = { id: 'p', kind: 'CATEGORY', subjectRule: 'ONE', categoryId: 'att', isOnSale: false, category: { subjects } };
const offer = { id: 'o', productId: 'p', durationMonths: 1, untilDate: null, price: 999999, isActive: false };
let payment: Payment;
let subscriptions: Prisma.SubscriptionUncheckedCreateInput[];
const request = (body: unknown) => new NextRequest('http://localhost/api/admin/payments', { method: 'PATCH', body: JSON.stringify(body) });
const confirm = (extra = {}) => PATCH(request({ paymentId: 'pay1', action: 'confirm', ...extra }));
const tx = { payment: { findUnique: m.payment, findUniqueOrThrow: m.updated, updateMany: m.claim, findMany: m.legacyPayment, create: m.createPayment },
  product: { findUnique: m.product }, productOffer: { findUnique: m.offer }, subscription: { findMany: m.current, create: m.create },
  systemSetting: { findUnique: m.setting, delete: m.deleteSetting }, user: { findUnique: m.user } };

beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(now);
  payment = { id: 'pay1', userId: 'u1', productId: 'p', offerId: 'o', subjectIds: ['physics'], plan: 'CATEGORY', duration: 'CUSTOM', amount: 7500,
    status: 'PENDING', receiptPhoto: 'receipt', telegramMsgId: null, confirmedById: null, confirmedAt: null, selectedSubjects: [], createdAt: new Date('2026-10-23') };
  subscriptions = [];
  m.auth.mockResolvedValue({ user: { id: 'admin', role: 'ADMIN' } });
  m.payment.mockImplementation(async () => structuredClone(payment));
  m.updated.mockImplementation(async () => structuredClone(payment));
  m.claim.mockImplementation(async ({ where, data }: { where: { id: string; status: string }; data: Partial<Payment> }) => {
    if (payment.id !== where.id || payment.status !== where.status) return { count: 0 };
    Object.assign(payment, data); return { count: 1 };
  });
  m.product.mockResolvedValue(product); m.offer.mockResolvedValue(offer); m.current.mockResolvedValue([]);
  m.create.mockImplementation(async ({ data }: { data: Prisma.SubscriptionUncheckedCreateInput }) => { subscriptions.push(data); return data; });
  // Tranzaksiya maketi rollbackni va parallel so'rovlar ketma-ket ko'rinishini saqlaydi.
  let queue = Promise.resolve();
  m.transaction.mockImplementation((fn: (client: typeof tx) => Promise<unknown>) => {
    const run = queue.then(async () => { const before = structuredClone(payment), count = subscriptions.length;
      try { return await fn(tx); } catch (error) { payment = before; subscriptions.splice(count); throw error; } });
    queue = run.then(() => undefined, () => undefined); return run;
  });
  m.payments.mockImplementation(async () => [{ ...payment, product: { ...product, offers: [offer] }, offer, user: {}, confirmedBy: null }]);
  m.count.mockResolvedValue(1); m.subjects.mockResolvedValue(subjects);
  m.user.mockResolvedValue({ id: 'u1' }); m.legacyPayment.mockImplementation(async () => [payment]);
});
afterEach(() => vi.useRealTimers());

describe('admin atomik tasdiqlash', () => {
  it.each([null, { user: { id: 'u1', role: 'USER' } }])('admin bo‘lmasa rad etadi', async (session) => {
    m.auth.mockResolvedValue(session);
    expect((await confirm()).status).toBe(session ? 403 : 401);
    expect((await GET(new NextRequest('http://localhost'))).status).toBe(session ? 403 : 401);
    expect(m.transaction).not.toHaveBeenCalled();
  });
  it('nofaol mahsulot/variant tasdiqlanadi va summa qayta hisoblanmaydi', async () => {
    expect((await confirm()).status).toBe(200);
    expect(payment.amount).toBe(7500);
    expect(subscriptions).toEqual([expect.objectContaining({ productId: 'p', offerId: 'o', plan: 'CATEGORY', duration: 'CUSTOM', subjectIds: ['physics'], startDate: now, endDate: new Date('2026-11-24T07:00:00Z') })]);
    expect(m.claim).toHaveBeenCalledWith({ where: { id: 'pay1', status: 'PENDING' }, data: { status: 'CONFIRMED', confirmedById: 'admin', confirmedAt: now } });
    expect(m.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
  });
  it('oylik uzaytirish tasdiqlash paytidagi endDate dan boshlanadi', async () => {
    m.current.mockResolvedValue([{ subjectIds: ['physics'], endDate: new Date('2026-12-01') }]);
    await confirm(); expect(subscriptions[0].startDate).toEqual(new Date('2026-12-01'));
  });
  it('muddati o‘tgan variant aniq xato beradi va PENDING qoladi', async () => {
    m.offer.mockResolvedValue({ ...offer, durationMonths: null, untilDate: now });
    const response = await confirm(); expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'EXPIRED_OFFER' });
    expect(payment.status).toBe('PENDING'); expect(subscriptions).toHaveLength(0); expect(m.claim).not.toHaveBeenCalled();
  });
  it('muddati o‘tgan variantni boshqa faol variantga almashtiradi, summa saqlanadi', async () => {
    m.offer.mockImplementation(async ({ where }: { where: { id: string } }) => where.id === 'replacement' ? { ...offer, id: 'replacement', isActive: true } : { ...offer, durationMonths: null, untilDate: now });
    expect((await confirm({ replacementOfferId: 'replacement' })).status).toBe(200);
    expect(payment.offerId).toBe('replacement'); expect(payment.amount).toBe(7500); expect(subscriptions[0].offerId).toBe('replacement');
  });
  it.each([{ ...offer, id: 'replacement', productId: 'other', isActive: true }, { ...offer, id: 'replacement', isActive: false }])('noto‘g‘ri almashtirishni yozmaydi', async (replacement) => {
    m.offer.mockImplementation(async ({ where }: { where: { id: string } }) => where.id === 'replacement' ? replacement : { ...offer, durationMonths: null, untilDate: now });
    expect((await confirm({ replacementOfferId: 'replacement' })).status).toBe(400);
    expect(payment.status).toBe('PENDING'); expect(subscriptions).toHaveLength(0);
  });
  it('muddati o‘tmagan variantni almashtirmaydi', async () => {
    m.offer.mockResolvedValue({ ...offer, isActive: true });
    expect((await confirm({ replacementOfferId: 'replacement' })).status).toBe(400);
    expect(subscriptions).toHaveLength(0);
  });
  it('ikki ketma-ket yoki parallel tasdiqlash faqat bitta obuna beradi', async () => {
    const responses = await Promise.all([confirm(), confirm()]);
    expect(responses.map((r) => r.status)).toEqual([200, 200]);
    expect((await confirm()).status).toBe(200);
    expect(subscriptions).toHaveLength(1);
  });
  it('admin va webhook bir vaqtda tasdiqlasa bitta obuna beradi', async () => {
    await Promise.all([confirm(), processSubscriptionPayment('pay1', 'confirm', 'bot-admin')]);
    expect(subscriptions).toHaveLength(1);
  });
  it('obuna yaratish xatosi Payment holatini ham rollback qiladi', async () => {
    m.create.mockRejectedValueOnce(new Error('write failure'));
    expect((await confirm()).status).toBe(500); expect(payment.status).toBe('PENDING');
    expect((await confirm()).status).toBe(200); expect(subscriptions).toHaveLength(1);
  });
  it.each(['P2034', 'P2002'])('parallel to‘qnashuv %s qayta uriniladi', async (code) => {
    m.transaction.mockRejectedValueOnce({ code });
    expect((await confirm()).status).toBe(200); expect(m.transaction).toHaveBeenCalledTimes(2);
  });
  it('rad etish obuna yaratmaydi', async () => {
    expect((await PATCH(request({ paymentId: 'pay1', action: 'reject' }))).status).toBe(200);
    expect(payment.status).toBe('REJECTED'); expect(subscriptions).toHaveLength(0);
    expect((await confirm()).status).toBe(409);
  });
  it('eski PREMIUM PENDING avvalgi muddat bilan tasdiqlanadi', async () => {
    Object.assign(payment, { productId: null, offerId: null, subjectIds: [], plan: 'PREMIUM', duration: 'THREE_MONTHS' });
    expect((await confirm()).status).toBe(200);
    expect(subscriptions[0]).toMatchObject({ plan: 'PREMIUM', duration: 'THREE_MONTHS', startDate: now, endDate: new Date('2027-01-24T07:00:00Z') });
  });
  it('eski webhook holati bir marta iste’mol qilinadi, admin tasdiqlagan Payment qayta yaratilmaydi', async () => {
    Object.assign(payment, { productId: null, offerId: null, subjectIds: [], plan: 'TEACHER_PLAN', duration: 'ONE_MONTH' });
    let setting: { value: string } | null = { value: JSON.stringify({ plan: 'teacher', duration: '1_month', amount: 7500, timestamp: payment.createdAt.getTime() }) };
    m.setting.mockImplementation(async () => setting); m.deleteSetting.mockImplementation(async () => { setting = null; });
    await confirm(); await processLegacySubscription('123', 'confirm', 'admin'); await processLegacySubscription('123', 'confirm', 'admin');
    expect(subscriptions).toHaveLength(1); expect(m.createPayment).not.toHaveBeenCalled(); expect(setting).toBeNull();
  });
});

describe('admin to‘lovlar ro‘yxati', () => {
  it('standart ro‘yxat va hisoblar cheksiz PENDINGni yashiradi', async () => {
    const response = await GET(new NextRequest('http://localhost/?status=PENDING'));
    const data = await response.json(); expect(response.status).toBe(200);
    expect(m.payments).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'PENDING', OR: [{ status: { not: 'PENDING' } }, { receiptPhoto: { not: null } }] } }));
    expect(m.count).toHaveBeenCalledWith({ where: { status: 'PENDING', OR: [{ status: { not: 'PENDING' } }, { receiptPhoto: { not: null } }] } });
    expect(data.payments[0].subjects).toEqual([subjects[0]]); expect(data.payments[0].amount).toBe(7500);
  });
  it('filtr cheksiz to‘lovlarni o‘chirmay ko‘rsatadi', async () => {
    await GET(new NextRequest('http://localhost/?includeUnreceipted=1'));
    expect(m.payments).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });
});
