import { beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ products: vi.fn(), subscriptions: vi.fn(), permissions: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ db: { product: { findMany: m.products }, $queryRaw: m.subscriptions, userPermission: { findMany: m.permissions } } }));
import { loadPricingPage } from '../pricing-page';
import { checkoutStartParameter, parseCheckoutStart } from '../category-checkout';
import { formatPricingDate, selectPricingProduct, type PricingProduct } from '../pricing';

const now = new Date('2026-10-24T19:01:00Z');
const names = { nameUz: 'Attestatsiya', nameRu: 'Аттестация', nameEn: 'Attestation' };
const subject = { id: 'physics', nameUz: 'Fizika', nameRu: 'Физика', nameEn: 'Physics', _count: { tests: 12 } };
const product = { id: 'p', kind: 'CATEGORY', subjectRule: 'ONE', secondSubjectDiscountPct: 25, ...names,
  category: { type: 'ATTESTATION', subjects: [subject] }, offers: [
    { id: 'o', labelUz: 'Mavsum', labelRu: 'Сезон', labelEn: 'Season', durationMonths: null, untilDate: new Date('2026-11-25T18:59:59Z'), price: 49000 },
  ] };
beforeEach(() => { vi.resetAllMocks(); m.products.mockResolvedValue([product]); m.subscriptions.mockResolvedValue([]); });

describe('pricing server ma’lumotlari', () => {
  it('mehmon: sotuvdagi mahsulot va faol variantlar; obuna so‘rovi yo‘q', async () => {
    const result = await loadPricingPage(null, 'ru', now);
    expect(m.products).toHaveBeenCalledOnce();
    expect(m.products).toHaveBeenCalledWith(expect.objectContaining({
      where: { isOnSale: true }, orderBy: [{ order: 'asc' }, { id: 'asc' }],
      include: expect.objectContaining({ offers: {
        where: { isActive: true, OR: [{ untilDate: null }, { untilDate: { gt: now } }] }, orderBy: [{ order: 'asc' }, { id: 'asc' }],
      }, category: { include: { subjects: expect.objectContaining({
        where: { tests: { some: { isPublished: true } } }, include: { _count: { select: { tests: { where: { isPublished: true } } } } },
      }) } } }),
    }));
    expect(m.subscriptions).not.toHaveBeenCalled(); expect(m.permissions).not.toHaveBeenCalled();
    expect(result.subscriptions).toEqual([]);
    expect(result.products[0]).toMatchObject({ name: 'Аттестация', subjects: [{ id: 'physics', name: 'Физика', testCount: 12 }],
      offers: [{ price: 49000, label: 'Сезон', buyHref: `https://t.me/EduPrimeuzbot?start=${checkoutStartParameter('p', 'o')}` }] });
  });
  it('nomlar va fanlar mavjud entitlement yuklovchida bitta SQL orqali olinadi', async () => {
    m.subscriptions.mockResolvedValue([{ id: 's1', plan: 'CATEGORY', product: names, subjects: [subject], endDate: new Date('2026-11-24T19:30:00Z') }]);
    const result = await loadPricingPage('u1', 'en', now);
    expect(m.subscriptions).toHaveBeenCalledOnce(); expect(m.permissions).not.toHaveBeenCalled();
    const [sql, userId, startDate, endDate] = m.subscriptions.mock.calls[0];
    expect(sql.join('?')).toContain('LEFT JOIN "Product"'); expect(sql.join('?')).toContain('ANY(s."subjectIds")');
    expect(userId).toBe('u1'); expect(startDate).toBe(now); expect(endDate).toBe(now);
    expect(result.subscriptions[0]).toMatchObject({ name: 'Attestation', subjects: ['Physics'] });
  });
  it('har yuklashda yangi narx olinadi, 0 narx ham saqlanadi', async () => {
    expect((await loadPricingPage(null, 'uz', now)).products[0].offers[0].price).toBe(49000);
    m.products.mockResolvedValue([{ ...product, offers: [{ ...product.offers[0], price: 0 }] }]);
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
