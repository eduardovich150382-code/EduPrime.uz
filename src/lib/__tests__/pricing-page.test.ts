import { beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ products: vi.fn(), subscriptions: vi.fn(), counts: vi.fn(), permissions: vi.fn() }));
vi.mock('server-only', () => ({}));
// Kesh o'zi `public-catalog.test.ts` da; bu yerda katalog har chaqiruvda o'qiladi.
vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T) => fn }));
// Ikkala agregat ham $queryRaw — SQL matniga qarab ajratiladi.
vi.mock('@/lib/db', () => ({ db: { product: { findMany: m.products }, userPermission: { findMany: m.permissions },
  $queryRaw: (sql: TemplateStringsArray, ...values: unknown[]) => (sql.join('?').includes('FROM "Test"') ? m.counts : m.subscriptions)(sql, ...values) } }));
import { loadPricingPage } from '../pricing-page';
import { checkoutStartParameter, parseCheckoutStart } from '../category-checkout';
import { formatPricingDate, selectPricingProduct, type PricingProduct } from '../pricing';

const now = new Date('2026-10-24T19:01:00Z');
const names = { nameUz: 'Attestatsiya', nameRu: 'Аттестация', nameEn: 'Attestation' };
const subject = { id: 'physics', nameUz: 'Fizika', nameRu: 'Физика', nameEn: 'Physics', isMandatory: false, _count: { tests: 12 } };
const math = { id: 'math', nameUz: 'Matematika', nameRu: 'Математика', nameEn: 'Maths', isMandatory: false, _count: { tests: 30 } };
const marketing = { taglineUz: 'Ishonch bilan', taglineRu: null, taglineEn: 'With confidence', featuresUz: ['Jonli tahlil'], featuresRu: [], featuresEn: ['Live review'] };
const offerMarketing = { compareAtPrice: 70000, badgeUz: 'Eng foydali', badgeRu: null, badgeEn: 'Best', isFeatured: true, promoUntil: null };
const product = { id: 'p', kind: 'CATEGORY', categoryId: 'att', subjectRule: 'ONE', secondSubjectDiscountPct: 25, ...names, ...marketing,
  category: { type: 'ATTESTATION', subjects: [subject] }, offers: [
    { id: 'o', labelUz: 'Mavsum', labelRu: 'Сезон', labelEn: 'Season', durationMonths: null, untilDate: new Date('2026-11-25T18:59:59Z'), price: 49000, ...offerMarketing },
  ] };
const countRows = [
  { categoryId: 'att', subjectId: 'physics', topicTests: 45, mockTests: 3, questions: 1650 },
  { categoryId: 'att', subjectId: 'math', topicTests: 20, mockTests: 2, questions: 700 },
  { categoryId: 'dtm', subjectId: 'physics-dtm', topicTests: 9, mockTests: 0, questions: 90 },
];
beforeEach(() => { vi.resetAllMocks(); m.products.mockResolvedValue([product]); m.subscriptions.mockResolvedValue([]); m.counts.mockResolvedValue(countRows); });

describe('pricing server ma’lumotlari', () => {
  it('mehmon: sotuvdagi mahsulot va faol variantlar; obuna so‘rovi yo‘q', async () => {
    const result = await loadPricingPage(null, 'ru', now);
    expect(m.products).toHaveBeenCalledOnce();
    expect(m.products).toHaveBeenCalledWith(expect.objectContaining({
      where: { isOnSale: true }, orderBy: [{ order: 'asc' }, { id: 'asc' }],
      // `untilDate` so'rovda emas — kesh `now` ga bog'lanmasin, filtr JS'da.
      include: expect.objectContaining({ offers: {
        where: { isActive: true }, orderBy: [{ order: 'asc' }, { id: 'asc' }],
      }, category: { select: { type: true, subjects: expect.objectContaining({
        where: { tests: { some: { isPublished: true } } },
        select: expect.objectContaining({ _count: { select: { tests: { where: { isPublished: true } } } } }),
      }) } } }),
    }));
    expect(m.subscriptions).not.toHaveBeenCalled(); expect(m.permissions).not.toHaveBeenCalled();
    expect(result.subscriptions).toEqual([]);
    expect(result.products[0]).toMatchObject({ name: 'Аттестация', subjects: [{ id: 'physics', name: 'Физика', testCount: 12 }],
      offers: [{ price: 49000, label: 'Сезон' }] });
    expect(result.products[0].offers[0]).not.toHaveProperty('buyHref');
  });
  it('nomlar va fanlar mavjud entitlement yuklovchida bitta SQL orqali olinadi', async () => {
    m.subscriptions.mockResolvedValue([{ id: 's1', plan: 'CATEGORY', product: names, subjects: [subject], startDate: new Date('2026-10-01T00:00:00Z'), endDate: new Date('2026-11-24T19:30:00Z') }]);
    const result = await loadPricingPage('u1', 'en', now);
    expect(m.subscriptions).toHaveBeenCalledOnce(); expect(m.permissions).not.toHaveBeenCalled();
    const [sql, userIds, sameIds, timeline, startDate, endDate] = m.subscriptions.mock.calls[0];
    expect(sql.join('?')).toContain('LEFT JOIN "Product"'); expect(sql.join('?')).toContain('ANY(s."subjectIds")');
    expect(userIds).toEqual(['u1']); expect(sameIds).toEqual(['u1']); expect(timeline).toBe(false);
    expect(startDate).toBe(now); expect(endDate).toBe(now);
    // Kartochka bilan bir xil ko'rinish — nomlar joriy tilga kartochkada o'giriladi.
    expect(result.subscriptions[0]).toMatchObject({ id: 's1', name: names, subjects: [subject], isLegacy: false, endDate: '2026-11-24T19:30:00.000Z' });
  });
  it('tayyor entitlements berilsa obunalar qayta so‘ralmaydi (/api/attestation/me)', async () => {
    const sub = { id: 's1', plan: 'CATEGORY', productId: 'p', subjectIds: [], product: names, subjects: [subject], startDate: new Date('2026-10-01T00:00:00Z'), endDate: new Date('2026-11-24T19:30:00Z') };
    const result = await loadPricingPage('u1', 'en', now, { now, permissions: [], subscriptions: [sub] } as unknown as Parameters<typeof loadPricingPage>[3]);
    expect(m.subscriptions).not.toHaveBeenCalled();
    expect(result.subscriptions[0]).toMatchObject({ id: 's1', name: names });
    expect(result.products[0].activeSubscriptions).toEqual([{ id: 's1', endDate: '2026-11-24T19:30:00.000Z', subjects: ['Physics'] }]);
  });
  it('kontent sonlari bitta agregat so‘rovda, sotiladigan fan kesimida', async () => {
    m.products.mockResolvedValue([{ ...product, category: { type: 'ATTESTATION', subjects: [subject, math] } }]);
    const [result] = (await loadPricingPage(null, 'uz', now)).products;
    expect(m.counts).toHaveBeenCalledOnce();
    expect(m.counts.mock.calls[0][0].join('?')).toContain('"isPublished" = true');
    // ONE: Matematika testlari Fizika soniga qo'shilmaydi, kartada yig'indi yo'q.
    expect(result.counts).toBeNull();
    expect(result.subjects.map((s) => s.counts)).toEqual([
      { topicTests: 45, mockTests: 3, questions: 1650 }, { topicTests: 20, mockTests: 2, questions: 700 },
    ]);
  });
  it('NONE — butun kategoriya, BUNDLE — barcha sotuvdagi kategoriyalar', async () => {
    m.products.mockResolvedValue([
      { ...product, subjectRule: 'NONE' },
      { ...product, id: 'dtm', categoryId: 'dtm', subjectRule: 'DTM_BLOCK', category: { type: 'DTM', subjects: [] } },
      { ...product, id: 'all', kind: 'BUNDLE', categoryId: null, subjectRule: 'NONE', category: null },
    ]);
    const [none, , bundle] = (await loadPricingPage(null, 'uz', now)).products;
    expect(none.counts).toEqual({ topicTests: 65, mockTests: 5, questions: 2350 });
    expect(bundle.counts).toEqual({ topicTests: 74, mockTests: 5, questions: 2440 });
  });
  it('marketing maydonlari joriy tilda, bo‘sh bo‘lsa o‘zbekchasi', async () => {
    const [ru] = (await loadPricingPage(null, 'ru', now)).products;
    expect(ru).toMatchObject({ tagline: 'Ishonch bilan', features: ['Jonli tahlil'] });
    expect(ru.offers[0]).toMatchObject({ compareAtPrice: 70000, badge: 'Eng foydali', isFeatured: true, promoUntil: null, personalPrice: null });
    const [en] = (await loadPricingPage(null, 'en', now)).products;
    expect(en).toMatchObject({ tagline: 'With confidence', features: ['Live review'] }); expect(en.offers[0].badge).toBe('Best');
  });
  it('aksiya o‘tgach eski narx va muddat yuborilmaydi; narxdan kichik eski narx ham', async () => {
    const withOffer = (extra: object) => [{ ...product, offers: [{ ...product.offers[0], ...extra }] }];
    m.products.mockResolvedValue(withOffer({ promoUntil: new Date(now.getTime() - 1) }));
    expect((await loadPricingPage(null, 'uz', now)).products[0].offers[0]).toMatchObject({ compareAtPrice: null, promoUntil: null });
    m.products.mockResolvedValue(withOffer({ promoUntil: new Date(now.getTime() + 60_000) }));
    expect((await loadPricingPage(null, 'uz', now)).products[0].offers[0]).toMatchObject({ compareAtPrice: 70000, promoUntil: new Date(now.getTime() + 60_000).toISOString() });
    m.products.mockResolvedValue(withOffer({ compareAtPrice: 49000 }));
    expect((await loadPricingPage(null, 'uz', now)).products[0].offers[0].compareAtPrice).toBeNull();
  });
  it('faol obunachiga ikkinchi fan narxi va shu mahsulotdagi obunasi', async () => {
    m.subscriptions.mockResolvedValue([{ id: 's1', userId: 'u1', productId: 'p', plan: 'CATEGORY', isActive: true, subjectIds: ['physics'], product: names, subjects: [subject],
      startDate: new Date('2026-10-01T00:00:00Z'), endDate: new Date('2026-11-24T19:30:00Z') }]);
    const [result] = (await loadPricingPage('u1', 'uz', now)).products;
    expect(result.offers[0].personalPrice).toBe(36750);
    expect(result.activeSubscriptions).toEqual([{ id: 's1', endDate: '2026-11-24T19:30:00.000Z', subjects: ['Fizika'] }]);
    m.subscriptions.mockResolvedValue([]);
    expect((await loadPricingPage('u1', 'uz', now)).products[0].offers[0].personalPrice).toBeNull();
  });
  it('muddati o‘tgan variant joriy vaqt bilan chiqarib tashlanadi', async () => {
    const until = (date: Date | null) => ({ ...product.offers[0], id: `o-${date?.getTime() ?? 'none'}`, untilDate: date });
    m.products.mockResolvedValue([{ ...product, offers: [until(new Date(now.getTime() - 1)), until(now), until(new Date(now.getTime() + 1)), until(null)] }]);
    const [result] = (await loadPricingPage(null, 'uz', now)).products;
    expect(result.offers.map((o) => o.untilDate)).toEqual([new Date(now.getTime() + 1).toISOString(), null]);
  });
  it('katalog qayta o‘qilganda yangi narx olinadi, 0 narx ham saqlanadi', async () => {
    expect((await loadPricingPage(null, 'uz', now)).products[0].offers[0].price).toBe(49000);
    m.products.mockResolvedValue([{ ...product, offers: [{ ...product.offers[0], price: 0, compareAtPrice: null }] }]);
    expect((await loadPricingPage(null, 'uz', now)).products[0].offers[0].price).toBe(0);
  });
  it('bo‘sh katalog xato emas', async () => {
    m.products.mockResolvedValue([]); expect(await loadPricingPage(null, 'uz', now)).toEqual({ products: [], subscriptions: [] });
  });
});
describe('pricing tanlovi, sana va Telegram kalitlari', () => {
  const products = [{ id: 'att', kind: 'CATEGORY', goal: 'ATTESTATION' }, { id: 'dtm', kind: 'CATEGORY', goal: 'DTM' }, { id: 'all', kind: 'BUNDLE', goal: null }] as PricingProduct[];
  it('TestType tanlanadi; noma’lum va sotuvda yo‘q maqsad birinchi kategoriyaga qaytadi', () => {
    expect(selectPricingProduct(products, 'DTM')?.id).toBe('dtm');
    for (const goal of [undefined, 'unknown', 'SAT']) expect(selectPricingProduct(products, goal)?.id).toBe('att');
    expect(selectPricingProduct([products[2]], 'DTM')).toBeUndefined();
  });
  it.each(['uz', 'ru', 'en'])('%s: UTC kun chegarasida Toshkent kuni ko‘rsatiladi', (locale) => {
    expect(formatPricingDate('2026-11-24T19:30:00Z', locale)).toContain('25');
    expect(formatPricingDate('2026-11-24T18:59:00Z', locale)).toContain('24');
  });
  it('uzun yoki Telegramga mos bo‘lmagan id ham 27 belgilik parametr beradi', () => {
    const value = checkoutStartParameter('mahsulot/uzun id'.repeat(10), 'variant:№1');
    expect(value).toHaveLength(27); expect(value).toMatch(/^[A-Za-z0-9_-]+$/); expect(parseCheckoutStart(value)).not.toBeNull();
    expect(parseCheckoutStart(`${value}_extra`)).toBeNull();
  });
});
