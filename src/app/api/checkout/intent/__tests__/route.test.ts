import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const m = vi.hoisted(() => ({ auth: vi.fn(), product: vi.fn(), subjects: vi.fn(), create: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: m.auth }));
vi.mock('@/lib/db', () => ({ db: { product: { findUnique: m.product }, subject: { findMany: m.subjects }, systemSetting: { create: m.create } } }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
import { POST } from '../route';
import { parseIntentStart } from '@/lib/checkout-intent';

const now = new Date('2026-10-24T07:00:00Z');
const offer = { id: 'o', productId: 'p', price: 10000, durationMonths: 1 as number | null, untilDate: null as Date | null, isActive: true };
const product = { id: 'p', kind: 'CATEGORY', subjectRule: 'ONE', categoryId: 'att', isOnSale: true };
const subject = (id: string, count = 1, isMandatory = false, categoryId = 'att') => ({ id, categoryId, isMandatory, _count: { tests: count } });
let userSeq = 0;
let offers: typeof offer[];
let catalogProduct: typeof product | null;

const post = (body: unknown) => POST(new NextRequest('http://localhost/api/checkout/intent', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) }));
function saved() { return JSON.parse(m.create.mock.calls.at(-1)![0].data.value); }

beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(now);
  // Rate limit xotirada — har test o'z foydalanuvchisi bilan.
  m.auth.mockResolvedValue({ user: { id: `user-${++userSeq}`, role: 'USER' } });
  offers = [offer]; catalogProduct = product;
  m.product.mockImplementation(async ({ where, include }: { where: { id: string }; include: { offers: { where: { id: string } } } }) =>
    catalogProduct && where.id === catalogProduct.id ? { ...catalogProduct, offers: offers.filter((o) => o.id === include.offers.where.id) } : null);
  m.subjects.mockResolvedValue([subject('physics'), subject('draft', 0)]);
  m.create.mockResolvedValue({});
});

describe('POST /api/checkout/intent', () => {
  it('mehmonga 401, bazaga tegmaydi', async () => {
    m.auth.mockResolvedValue(null);
    expect((await post({ productId: 'p', offerId: 'o' })).status).toBe(401);
    expect(m.product).not.toHaveBeenCalled(); expect(m.create).not.toHaveBeenCalled();
  });
  it('yagona fan avtomatik tanlanadi; niyat sayt userId bilan saqlanadi', async () => {
    const response = await post({ productId: 'p', offerId: 'o' });
    expect(response.status).toBe(200);
    const { url } = await response.json();
    const parameter = new URL(url).searchParams.get('start')!;
    expect(url.startsWith('https://t.me/EduPrimeuzbot?start=ci_')).toBe(true);
    expect(parameter.length).toBeLessThanOrEqual(64); expect(parameter).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(m.create.mock.calls[0][0].data.key).toBe(`checkout_intent_${parseIntentStart(parameter)}`);
    expect(saved()).toEqual({ userId: `user-${userSeq}`, productId: 'p', offerId: 'o', subjectIds: ['physics'], createdAt: now.getTime() });
    expect(m.subjects).toHaveBeenCalledWith(expect.objectContaining({ include: { _count: { select: { tests: { where: { isPublished: true, categoryId: 'att' } } } } } }));
  });
  it('fan bir nechta bo‘lsa tanlov talab qilinadi, tanlangani saqlanadi', async () => {
    m.subjects.mockResolvedValue([subject('physics'), subject('math')]);
    expect(await (await post({ productId: 'p', offerId: 'o' })).json()).toMatchObject({ code: 'CHOOSE_SUBJECT' });
    expect((await post({ productId: 'p', offerId: 'o', subjectIds: ['math'] })).status).toBe(200);
    expect(saved().subjectIds).toEqual(['math']);
    expect((await post({ productId: 'p', offerId: 'o', subjectIds: ['math', 'physics'] })).status).toBe(400);
  });
  it.each([
    ['nashr etilmagan fan', ['draft']], ['boshqa kategoriya fani', ['bio']], ['noma’lum fan', ['nope']], ['takror fan', ['physics', 'physics']],
  ])('%s rad etiladi', async (_name, subjectIds) => {
    m.subjects.mockResolvedValue([subject('physics'), subject('math'), subject('draft', 0)]);
    const response = await post({ productId: 'p', offerId: 'o', subjectIds });
    expect(response.status).toBe(400); expect(m.create).not.toHaveBeenCalled();
  });
  it.each(['unknown-product', 'other-offer', 'off-sale', 'bad-body', 'too-many-subjects'])('%s → 400', async (state) => {
    if (state === 'off-sale') catalogProduct = { ...product, isOnSale: false };
    const body = state === 'bad-body' ? '{' : { productId: state === 'unknown-product' ? 'x' : 'p', offerId: state === 'other-offer' ? 'o2' : 'o',
      ...(state === 'too-many-subjects' ? { subjectIds: ['a', 'b', 'c'] } : {}) };
    const response = await post(body);
    expect(response.status).toBe(400); expect((await response.json()).code).toBe('INVALID_SELECTION'); expect(m.create).not.toHaveBeenCalled();
  });
  it.each([{ isActive: false }, { durationMonths: null, untilDate: now }])('nofaol yoki muddati o‘tgan variant → 409 %j', async (patch) => {
    offers = [{ ...offer, ...patch }];
    const response = await post({ productId: 'p', offerId: 'o' });
    expect(response.status).toBe(409); expect((await response.json()).code).toBe('EXPIRED_OFFER'); expect(m.create).not.toHaveBeenCalled();
  });
  it('DTM: ikkita asosiy fan + uchta majburiy (buildSubjectIds), majburiyni tanlab bo‘lmaydi', async () => {
    catalogProduct = { ...product, subjectRule: 'DTM_BLOCK' };
    m.subjects.mockResolvedValue([subject('physics'), subject('math'), subject('m1', 1, true), subject('m2', 0, true), subject('m3', 1, true)]);
    expect((await post({ productId: 'p', offerId: 'o', subjectIds: ['physics', 'm1'] })).status).toBe(400);
    expect((await post({ productId: 'p', offerId: 'o', subjectIds: ['physics'] })).status).toBe(400);
    expect((await post({ productId: 'p', offerId: 'o', subjectIds: ['physics', 'math'] })).status).toBe(200);
    expect(saved().subjectIds).toEqual(['m1', 'm2', 'm3', 'math', 'physics']);
  });
  it('sotish uchun fan yetarli bo‘lmasa 422', async () => {
    m.subjects.mockResolvedValue([subject('draft', 0)]);
    expect((await post({ productId: 'p', offerId: 'o' })).status).toBe(422);
  });
  it('NONE va BUNDLE fan so‘ramaydi', async () => {
    catalogProduct = { ...product, kind: 'BUNDLE', subjectRule: 'NONE', categoryId: null as unknown as string };
    expect((await post({ productId: 'p', offerId: 'o' })).status).toBe(200); expect(saved().subjectIds).toEqual([]);
    expect((await post({ productId: 'p', offerId: 'o', subjectIds: ['physics'] })).status).toBe(400);
  });
  it('bir daqiqada 10 tadan ortiq so‘rov 429', async () => {
    for (let i = 0; i < 10; i++) expect((await post({ productId: 'p', offerId: 'o' })).status).toBe(200);
    const limited = await post({ productId: 'p', offerId: 'o' });
    expect(limited.status).toBe(429); expect(m.create).toHaveBeenCalledTimes(10);
    vi.setSystemTime(new Date(now.getTime() + 60_001));
    expect((await post({ productId: 'p', offerId: 'o' })).status).toBe(200);
  });
});
