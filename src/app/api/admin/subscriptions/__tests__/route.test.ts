import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const m = vi.hoisted(() => ({ auth: vi.fn(), transaction: vi.fn(), product: vi.fn(), offer: vi.fn(), user: vi.fn(), current: vi.fn(), create: vi.fn(), countUsers: vi.fn(), countSubscriptions: vi.fn(), users: vi.fn(), subjects: vi.fn(), details: vi.fn() }));
vi.mock('@/lib/api-auth', () => ({ requireAdmin: m.auth }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/lib/db', () => ({ db: {
  $transaction: m.transaction, $queryRaw: m.details, user: { count: m.countUsers, findMany: m.users },
  subscription: { count: m.countSubscriptions, findMany: m.current }, subject: { findMany: m.subjects },
} }));
import { GET, POST } from '../route';

const now = new Date('2026-10-23T07:00:00Z');
const subjects = ['physics', 'math', 'chemistry'].map((id) => ({ id, categoryId: 'att', isMandatory: false }));
const product = { id: 'obuna-attestation', kind: 'CATEGORY', categoryId: 'att', subjectRule: 'ONE', category: { subjects } };
const offer = { id: 'offer1', productId: product.id, durationMonths: 1, untilDate: null, isActive: true };
const input = { userId: 'u1', productId: product.id, offerId: offer.id, subjectIds: ['physics'] };
const request = (body: unknown) => new NextRequest('http://localhost/api/admin/subscriptions', { method: 'POST', body: JSON.stringify(body) });
const tx = { product: { findUnique: m.product }, productOffer: { findUnique: m.offer }, user: { findUnique: m.user }, subscription: { findMany: m.current, create: m.create } };

beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(now);
  m.auth.mockResolvedValue({ user: { id: 'admin' }, error: null });
  m.product.mockResolvedValue(product); m.offer.mockResolvedValue(offer); m.user.mockResolvedValue({ id: 'u1' });
  m.current.mockResolvedValue([]); m.create.mockResolvedValue({ id: 'new-subscription' });
  m.transaction.mockImplementation((fn: (client: typeof tx) => Promise<unknown>) => fn(tx));
  m.countUsers.mockResolvedValue(10); m.countSubscriptions.mockResolvedValue(2); m.users.mockResolvedValue([]); m.subjects.mockResolvedValue([]); m.details.mockResolvedValue([]);
});
afterEach(() => vi.useRealTimers());

describe('qo‘lda obuna berish', () => {
  it.each([401, 403])('admin bo‘lmasa %i', async (status) => {
    m.auth.mockResolvedValue({ error: NextResponse.json({}, { status }) });
    expect((await POST(request(input))).status).toBe(status);
    expect((await GET(new NextRequest('http://localhost'))).status).toBe(status);
    expect(m.transaction).not.toHaveBeenCalled(); expect(m.users).not.toHaveBeenCalled();
  });
  it('ONE yangi ustunlar va CUSTOM bilan yoziladi', async () => {
    expect((await POST(request(input))).status).toBe(201);
    expect(m.create).toHaveBeenCalledWith({ data: {
      userId: 'u1', productId: product.id, offerId: 'offer1', categoryId: 'att', plan: 'CATEGORY', duration: 'CUSTOM',
      subjectIds: ['physics'], startDate: now, endDate: new Date('2026-11-23T07:00:00Z'),
    } });
    expect(m.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
  });
  it('bir xil mahsulot va fan faol muddatidan uzayadi', async () => {
    const currentEndDate = new Date('2026-12-31T07:00:00Z');
    m.current.mockResolvedValue([{ subjectIds: ['physics'], endDate: currentEndDate }]);
    expect((await POST(request(input))).status).toBe(201);
    expect(m.current).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u1', productId: product.id, isActive: true, endDate: { gt: now } }, orderBy: { endDate: 'desc' } }));
    expect(m.create).toHaveBeenCalledWith({ data: expect.objectContaining({ startDate: currentEndDate, endDate: new Date('2027-01-31T07:00:00Z') }) });
  });
  it('boshqa fanning muddati uzaytirish bazasi bo‘lmaydi', async () => {
    m.current.mockResolvedValue([{ subjectIds: ['math'], endDate: new Date('2027-01-01') }]);
    await POST(request(input));
    expect(m.create).toHaveBeenCalledWith({ data: expect.objectContaining({ startDate: now, endDate: new Date('2026-11-23T07:00:00Z') }) });
  });
  it('sanagacha varianti eski faol muddatga qaramaydi', async () => {
    m.offer.mockResolvedValue({ ...offer, durationMonths: null, untilDate: new Date('2026-11-01T18:59:59.999Z') });
    expect((await POST(request(input))).status).toBe(201);
    expect(m.current).not.toHaveBeenCalled();
    expect(m.create).toHaveBeenCalledWith({ data: expect.objectContaining({ startDate: now, endDate: new Date('2026-11-01T18:59:59.999Z') }) });
  });
  it('NONE butun kategoriyani bo‘sh subjectIds bilan yozadi', async () => {
    m.product.mockResolvedValue({ ...product, subjectRule: 'NONE' });
    expect((await POST(request({ ...input, subjectIds: [] }))).status).toBe(201);
    expect(m.create).toHaveBeenCalledWith({ data: expect.objectContaining({ plan: 'CATEGORY', subjectIds: [] }) });
  });
  it('BUNDLE kategoriya va fan tanlamaydi', async () => {
    m.product.mockResolvedValue({ ...product, kind: 'BUNDLE', categoryId: null, subjectRule: 'NONE', category: null });
    expect((await POST(request({ ...input, subjectIds: [] }))).status).toBe(201);
    expect(m.create).toHaveBeenCalledWith({ data: expect.objectContaining({ plan: 'BUNDLE', categoryId: null, subjectIds: [] }) });
  });
  it('DTM ikki asosiy fan va uch majburiyni saqlaydi, tartib uzaytirishga ta’sir qilmaydi', async () => {
    const mandatory = ['m1', 'm2', 'm3'].map((id) => ({ id, categoryId: 'att', isMandatory: true }));
    m.product.mockResolvedValue({ ...product, subjectRule: 'DTM_BLOCK', category: { subjects: [...subjects, ...mandatory] } });
    m.current.mockResolvedValue([{ subjectIds: ['physics', 'm3', 'math', 'm2', 'm1'], endDate: new Date('2026-12-01') }]);
    expect((await POST(request({ ...input, subjectIds: ['physics', 'math'] }))).status).toBe(201);
    expect(m.create).toHaveBeenCalledWith({ data: expect.objectContaining({ subjectIds: ['m1', 'm2', 'm3', 'math', 'physics'], startDate: new Date('2026-12-01') }) });
  });
  it.each([
    { ...input, subjectIds: [] }, { ...input, subjectIds: ['physics', 'math'] },
    { ...input, subjectIds: ['unknown'] }, { ...input, subjectIds: ['physics', 'physics'] }, { ...input, userId: '' },
  ])('noto‘g‘ri fan tanlovini yozmaydi', async (body) => {
    expect((await POST(request(body))).status).toBe(400); expect(m.create).not.toHaveBeenCalled();
  });
  it.each([{ ...offer, isActive: false }, { ...offer, productId: 'another' }])('nofaol yoki boshqa variantni rad etadi', async (value) => {
    m.offer.mockResolvedValue(value);
    expect((await POST(request(input))).status).toBe(400); expect(m.create).not.toHaveBeenCalled();
  });
  it('muddati tugagan qat’iy variantni yozmaydi', async () => {
    m.offer.mockResolvedValue({ ...offer, durationMonths: null, untilDate: new Date('2026-01-01') });
    expect((await POST(request(input))).status).toBe(400); expect(m.create).not.toHaveBeenCalled();
  });
  it('yo‘q foydalanuvchiga yozmaydi', async () => {
    m.user.mockResolvedValue(null);
    expect((await POST(request(input))).status).toBe(404); expect(m.create).not.toHaveBeenCalled();
  });
  it('parallel uzaytirishda serializatsiya xatosidan keyin qayta hisoblaydi', async () => {
    m.transaction.mockRejectedValueOnce({ code: 'P2034' });
    expect((await POST(request(input))).status).toBe(201);
    expect(m.transaction).toHaveBeenCalledTimes(2);
  });
  it('uchta parallel to‘qnashuvdan keyin qayta urinishni so‘raydi', async () => {
    m.transaction.mockRejectedValue({ code: 'P2034' });
    const response = await POST(request(input));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'RETRY_REQUIRED' });
    expect(m.transaction).toHaveBeenCalledTimes(3);
    expect(m.create).not.toHaveBeenCalled();
  });
});

describe('obunalar ro‘yxati', () => {
  it.each(['-1', '0', 'x'])('noto‘g‘ri sahifa %s rad etiladi', async (page) => {
    expect((await GET(new NextRequest(`http://localhost/?page=${page}`))).status).toBe(400);
  });
  it('bepul hisob foydalanuvchilarni noyob sanaydi, obunalarni emas', async () => {
    m.current.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]);
    const response = await GET(new NextRequest('http://localhost/?filter=free'));
    expect(response.status).toBe(200);
    expect((await response.json()).stats.freeCount).toBe(8);
    expect(m.current).toHaveBeenCalledWith(expect.objectContaining({ distinct: ['userId'] }));
  });
  it('yangi mahsulot, variant va fanlarni qaytaradi', async () => {
    m.users.mockResolvedValue([{ id: 'u1', subscriptions: [{ id: 's1', plan: 'CATEGORY', subjectIds: ['physics'], endDate: new Date('2026-12-01'), product: { nameUz: 'Attestatsiya' }, offer: { labelUz: '1 oy' } }] }]);
    m.subjects.mockResolvedValue([{ id: 'physics', nameUz: 'Fizika' }, { id: 'math', nameUz: 'Matematika' }]);
    const data = await (await GET(new NextRequest('http://localhost/?filter=category'))).json();
    expect(data.users[0].subscriptions[0].subjects).toEqual([{ id: 'physics', nameUz: 'Fizika' }]);
    expect(data.users[0].subscriptions[0].product.nameUz).toBe('Attestatsiya');
  });
  it('bekor qilingan filtri muddatidan oldin yopilganlarni oladi, statistika faollarda qoladi', async () => {
    expect((await GET(new NextRequest('http://localhost/?filter=cancelled'))).status).toBe(200);
    const cancelled = { isActive: false, endDate: { gte: now } };
    expect(m.users).toHaveBeenCalledWith(expect.objectContaining({ where: { subscriptions: { some: cancelled } } }));
    expect(m.users.mock.calls[0][0].select.subscriptions.where).toEqual(cancelled);
    expect(m.countSubscriptions).toHaveBeenCalledWith({ where: { isActive: true, startDate: { lte: now }, endDate: { gte: now }, plan: 'PREMIUM' } });
  });
  it('eski tarif filtri PREMIUM va TEACHER_PLAN ni birga oladi', async () => {
    await GET(new NextRequest('http://localhost/?filter=legacy'));
    const active = { isActive: true, startDate: { lte: now }, endDate: { gte: now } };
    expect(m.users).toHaveBeenCalledWith(expect.objectContaining({ where: { subscriptions: { some: { ...active, plan: { in: ['PREMIUM', 'TEACHER_PLAN'] } } } } }));
    expect(m.users.mock.calls[0][0].select.subscriptions.where).toEqual(active);
  });
  it('standart ko‘rinish faqat faol obunalarni ko‘rsatadi', async () => {
    await GET(new NextRequest('http://localhost/'));
    expect(m.users.mock.calls[0][0].select.subscriptions.where).toEqual({ isActive: true, startDate: { lte: now }, endDate: { gte: now } });
  });
});
