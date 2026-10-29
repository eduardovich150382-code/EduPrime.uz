import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const m = vi.hoisted(() => ({
  auth: vi.fn(), products: vi.fn(), product: vi.fn(), updateProduct: vi.fn(), counts: vi.fn(),
  createOffer: vi.fn(), findOffer: vi.fn(), updateOffer: vi.fn(), subjects: vi.fn(), subject: vi.fn(), updateSubject: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidateTag: m.revalidateTag }));
vi.mock('@/lib/api-auth', () => ({ requireAdmin: m.auth }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/lib/db', () => ({ db: {
  product: { findMany: m.products, findUnique: m.product, update: m.updateProduct },
  productOffer: { create: m.createOffer, findFirst: m.findOffer, update: m.updateOffer },
  test: { groupBy: m.counts }, subject: { findMany: m.subjects, findUnique: m.subject, update: m.updateSubject },
} }));

import { GET } from '../route';
import { PATCH } from '../[id]/route';
import { POST } from '../[id]/offers/route';
import { PATCH as editOffer, DELETE as deactivateOffer } from '../[id]/offers/[offerId]/route';
import { GET as getSubjects, PATCH as editSubject } from '../../subjects/route';

const ctx = { params: Promise.resolve({ id: 'obuna-attestation', offerId: 'offer1' }) };
const request = (body: unknown, method = 'PATCH') => new NextRequest('http://localhost/api/admin/products', { method, body: JSON.stringify(body) });
const offer = { labelUz: '1 oy', labelRu: '1 месяц', labelEn: '1 month', durationMonths: 1, untilDate: null, price: 10000, isActive: true, order: 0 };
const product = { nameUz: 'Attestatsiya', nameRu: 'Аттестация', nameEn: 'Attestation', isOnSale: true, secondSubjectDiscountPct: 20, order: 0 };

beforeEach(() => {
  vi.resetAllMocks();
  m.auth.mockResolvedValue({ user: { id: 'admin' }, error: null });
  m.product.mockResolvedValue({ id: 'obuna-attestation' });
  m.findOffer.mockResolvedValue({ id: 'offer1' });
  m.createOffer.mockResolvedValue({ id: 'offer1' });
  m.updateOffer.mockResolvedValue({ id: 'offer1', isActive: false });
  m.updateProduct.mockResolvedValue({ id: 'obuna-attestation', ...product });
});

describe('admin himoyasi', () => {
  for (const status of [401, 403]) it(`barcha mahsulot va fan endpointlari ${status} qaytaradi`, async () => {
    m.auth.mockResolvedValue({ error: NextResponse.json({ error: 'Forbidden' }, { status }) });
    const responses = [await GET(), await PATCH(request(product), ctx), await POST(request(offer, 'POST'), ctx),
      await editOffer(request(offer), ctx), await deactivateOffer(request({}, 'DELETE'), ctx), await getSubjects(), await editSubject(request({ id: 's', isMandatory: true }))];
    expect(responses.every((r) => r.status === status)).toBe(true);
    expect(m.products).not.toHaveBeenCalled(); expect(m.updateProduct).not.toHaveBeenCalled();
    expect(m.createOffer).not.toHaveBeenCalled(); expect(m.updateOffer).not.toHaveBeenCalled(); expect(m.updateSubject).not.toHaveBeenCalled();
    expect(m.revalidateTag).not.toHaveBeenCalled();
  });
});

describe('mahsulotlar', () => {
  it('kategoriya va ONE fanlari uchun faqat nashr etilgan testlar sanaladi', async () => {
    m.products.mockResolvedValue([
      { id: 'a', kind: 'CATEGORY', categoryId: 'att', offers: [], category: { subjects: [{ id: 'physics' }, { id: 'math' }] } },
      { id: 'b', kind: 'BUNDLE', categoryId: null, offers: [], category: null },
    ]);
    m.counts.mockResolvedValue([{ categoryId: 'att', subjectId: 'physics', _count: { _all: 4 } }, { categoryId: 'dtm', subjectId: 'other', _count: { _all: 2 } }]);
    const data = await (await GET()).json();
    expect(data.products[0].publishedTestCount).toBe(4);
    expect(data.products[0].subjects.map((s: { publishedTestCount: number }) => s.publishedTestCount)).toEqual([4, 0]);
    expect(data.products[1].publishedTestCount).toBe(6);
    expect(m.counts).toHaveBeenCalledWith(expect.objectContaining({ where: { isPublished: true } }));
  });
  it('mahsulotning tahrirlanadigan maydonlarini saqlaydi', async () => {
    expect((await PATCH(request(product), ctx)).status).toBe(200);
    expect(m.updateProduct).toHaveBeenCalledWith({ where: { id: 'obuna-attestation' }, data: product });
    // Pricing katalogi keshlangan — yangi narx/matn darhol ko'rinsin.
    expect(m.revalidateTag.mock.calls).toEqual([['pricing']]);
  });
  it('shior va afzalliklar: bo‘sh qatorlar tashlanadi, bo‘sh shior tozalanadi', async () => {
    const body = { ...product, taglineUz: '  Ishonch bilan ', taglineRu: '', taglineEn: null, featuresUz: ['Jonli tahlil', ' ', 'Guruh'], featuresRu: [], featuresEn: [] };
    expect((await PATCH(request(body), ctx)).status).toBe(200);
    expect(m.updateProduct).toHaveBeenCalledWith({ where: { id: 'obuna-attestation' }, data: { ...product,
      taglineUz: 'Ishonch bilan', taglineRu: null, taglineEn: null, featuresUz: ['Jonli tahlil', 'Guruh'], featuresRu: [], featuresEn: [] } });
  });
  it('9 ta afzallik — aniq xato kodi', async () => {
    const response = await PATCH(request({ ...product, featuresUz: Array.from({ length: 9 }, (_, i) => `band ${i}`) }), ctx);
    expect(response.status).toBe(400); expect((await response.json()).error).toBe('TOO_MANY_FEATURES');
  });
  it.each([{ ...product, secondSubjectDiscountPct: 101 }, { ...product, order: 0.5 }, { ...product, nameRu: '' }, { ...product, categoryId: 'change' }])('noto‘g‘ri mahsulotni yozmaydi', async (body) => {
    expect((await PATCH(request(body), ctx)).status).toBe(400); expect(m.updateProduct).not.toHaveBeenCalled();
    expect(m.revalidateTag).not.toHaveBeenCalled();
  });
});

describe('variantlar', () => {
  it('oylik variant yaratadi', async () => {
    expect((await POST(request(offer, 'POST'), ctx)).status).toBe(201);
    expect(m.createOffer).toHaveBeenCalledWith({ data: { ...offer, productId: 'obuna-attestation' } });
    expect(m.revalidateTag.mock.calls).toEqual([['pricing']]);
  });
  it('qat’iy sana Toshkent kunining oxiri sifatida saqlanadi', async () => {
    expect((await editOffer(request({ ...offer, durationMonths: null, untilDate: '2027-01-10' }), ctx)).status).toBe(200);
    expect(m.updateOffer).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ durationMonths: null, untilDate: new Date('2027-01-10T18:59:59.999Z') }) }));
    expect(m.revalidateTag.mock.calls).toEqual([['pricing']]);
  });
  it('eski narx, belgi, ajratish va aksiya muddati (Toshkent vaqti) saqlanadi', async () => {
    const body = { ...offer, compareAtPrice: 15000, badgeUz: ' Eng foydali ', badgeRu: '', badgeEn: 'Best value', isFeatured: true, promoUntil: '2026-11-11T23:59' };
    expect((await editOffer(request(body), ctx)).status).toBe(200);
    expect(m.updateOffer).toHaveBeenCalledWith({ where: { id: 'offer1', productId: 'obuna-attestation' }, data: { ...offer,
      compareAtPrice: 15000, badgeUz: 'Eng foydali', badgeRu: null, badgeEn: 'Best value', isFeatured: true, promoUntil: new Date('2026-11-11T18:59:00.000Z') } });
  });
  it('maydonlarni tozalash: null yuborilsa null yoziladi', async () => {
    expect((await editOffer(request({ ...offer, compareAtPrice: null, promoUntil: null, isFeatured: false }), ctx)).status).toBe(200);
    expect(m.updateOffer).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ compareAtPrice: null, promoUntil: null, isFeatured: false }) }));
  });
  it.each([
    [{ ...offer, compareAtPrice: 10000 }, 'COMPARE_AT_NOT_ABOVE_PRICE'],
    [{ ...offer, compareAtPrice: 9000 }, 'COMPARE_AT_NOT_ABOVE_PRICE'],
    [{ ...offer, promoUntil: '2026-11-11T23:59' }, 'PROMO_NEEDS_COMPARE_AT'],
    [{ ...offer, compareAtPrice: 15000, promoUntil: '2026-11-11' }, 'INVALID_INPUT'],
    [{ ...offer, compareAtPrice: 15000, promoUntil: '2026-02-30T10:00' }, 'INVALID_DATE'],
    [{ ...offer, badgeUz: 'x'.repeat(41) }, 'INVALID_INPUT'],
  ])('noto‘g‘ri marketing maydonlarini rad etadi: %j', async (body, code) => {
    const response = await editOffer(request(body), ctx);
    expect(response.status).toBe(400); expect((await response.json()).error).toBe(code);
    expect(m.updateOffer).not.toHaveBeenCalled();
    expect(m.revalidateTag).not.toHaveBeenCalled();
  });
  it.each([
    { ...offer, durationMonths: null }, { ...offer, untilDate: '2027-01-01' }, { ...offer, durationMonths: 0 },
    { ...offer, price: 1.5 }, { ...offer, price: -1 }, { ...offer, price: '10000' }, { ...offer, durationMonths: 1.5 },
    { ...offer, durationMonths: null, untilDate: '2027-02-30' },
  ])('noto‘g‘ri muddat yoki narxni rad etadi', async (body) => {
    expect((await POST(request(body, 'POST'), ctx)).status).toBe(400);
    expect(m.createOffer).not.toHaveBeenCalled();
  });
  it('0 narx va uchinchi faol variant taqiqlanmaydi', async () => {
    expect((await POST(request({ ...offer, price: 0, order: 3 }, 'POST'), ctx)).status).toBe(201);
  });
  it('mavjud bo‘lmagan mahsulotga variant yaratmaydi', async () => {
    m.product.mockResolvedValue(null);
    expect((await POST(request(offer, 'POST'), ctx)).status).toBe(404);
    expect(m.revalidateTag).not.toHaveBeenCalled();
  });
  it('boshqa mahsulotning variantini o‘zgartirmaydi', async () => {
    m.findOffer.mockResolvedValue(null);
    expect((await editOffer(request(offer), ctx)).status).toBe(404);
    expect(m.updateOffer).not.toHaveBeenCalled();
  });
  it('DELETE qatorni o‘chirmay, nofaol qiladi', async () => {
    expect((await deactivateOffer(request({}, 'DELETE'), ctx)).status).toBe(200);
    expect(m.updateOffer).toHaveBeenCalledWith({ where: { id: 'offer1', productId: 'obuna-attestation' }, data: { isActive: false } });
    expect(m.revalidateTag.mock.calls).toEqual([['pricing']]);
  });
  it('noto‘g‘ri JSON 400 qaytaradi', async () => {
    const response = await POST(new NextRequest('http://localhost', { method: 'POST', body: '{' }), ctx);
    expect(response.status).toBe(400);
  });
});

describe('majburiy fanlar', () => {
  it('fanlar ro‘yxatini qaytaradi', async () => {
    m.subjects.mockResolvedValue([{ id: 'math', isMandatory: true }]);
    expect((await (await getSubjects()).json()).subjects).toEqual([{ id: 'math', isMandatory: true }]);
  });
  it('DTM fanini belgilaydi', async () => {
    m.subject.mockResolvedValue({ category: { type: 'DTM' } });
    expect((await editSubject(request({ id: 'math', isMandatory: true }))).status).toBe(200);
    expect(m.updateSubject).toHaveBeenCalledWith({ where: { id: 'math' }, data: { isMandatory: true } });
    // Fanlar ro'yxati va pricing (majburiy fanlar sonlardan chiqariladi) keshlangan.
    expect(m.revalidateTag.mock.calls).toEqual([['taxonomy'], ['pricing']]);
  });
  it('DTM bo‘lmagan fanni belgilamaydi', async () => {
    m.subject.mockResolvedValue({ category: { type: 'ATTESTATION' } });
    expect((await editSubject(request({ id: 'physics', isMandatory: true }))).status).toBe(400);
    expect(m.updateSubject).not.toHaveBeenCalled();
    expect(m.revalidateTag).not.toHaveBeenCalled();
  });
  it('boolean o‘rniga satr yuborilsa rad etadi', async () => expect((await editSubject(request({ id: 'math', isMandatory: 'true' }))).status).toBe(400));
});
