import { describe, expect, it } from 'vitest';
import {
  autoFeatures, bundleSavings, dailyPrice, discountPercent, longerOfferSaving, monthlyPrice, offerDays,
  productContentCounts, promoActive, roundDownCount, savingsAmount, type PricingOffer,
} from '../pricing';

const now = new Date('2026-10-26T07:00:00Z'); // Toshkentda 26-oktabr 12:00
const offer = (id: string, price: number, durationMonths: number | null, untilDate: string | null = null): PricingOffer => ({
  id, label: id, price, durationMonths, untilDate, buyHref: '', compareAtPrice: null, promoUntil: null, badge: null, isFeatured: false, personalPrice: null,
});

describe('chegirma va tejash', () => {
  it('foiz yaxlitlanadi; eski narx narxdan katta bo‘lmasa belgi yo‘q', () => {
    expect(discountPercent(70000, 100000)).toBe(30);
    expect(discountPercent(49000, 69000)).toBe(29);
    expect(savingsAmount(70000, 100000)).toBe(30000);
    for (const compareAt of [null, 70000, 69999]) {
      expect(discountPercent(70000, compareAt)).toBeNull(); expect(savingsAmount(70000, compareAt)).toBeNull();
    }
    // Bepul aksiya ham to'g'ri foiz oladi.
    expect(discountPercent(0, 1000)).toBe(100);
  });
  it('aksiya muddati: yo‘q — doimiy, o‘tgan — yashiriladi', () => {
    expect(promoActive({ promoUntil: null }, now)).toBe(true);
    expect(promoActive({ promoUntil: new Date(now.getTime() + 1) }, now)).toBe(true);
    expect(promoActive({ promoUntil: now.toISOString() }, now)).toBe(false);
  });
});

describe('oylik, kunlik narx va variantlar solishtiruvi', () => {
  it('oylik narx faqat bir oydan uzun variantda; kunlik — sanagacha variantda', () => {
    expect(monthlyPrice(offer('3m', 120000, 3))).toBe(40000);
    expect(monthlyPrice(offer('1m', 49000, 1))).toBeNull();
    // 26-oktabrdan 10-noyabrgacha: 15 kun.
    expect(offerDays(offer('s', 0, null, '2026-11-10T18:59:59.999Z'), now)).toBe(15);
    expect(dailyPrice(offer('s', 45000, null, '2026-11-10T18:59:59.999Z'), now)).toBe(3000);
    expect(dailyPrice(offer('1m', 49000, 1), now)).toBeNull();
  });
  it('bugun tugaydigan variant 1 kun; o‘tgani — null', () => {
    expect(offerDays(offer('s', 0, null, '2026-10-26T18:59:59.999Z'), now)).toBe(1);
    expect(offerDays(offer('s', 0, null, '2026-10-26T06:00:00Z'), now)).toBeNull();
  });
  it('"1 oy" + "11-noyabrgacha": kunlik narx bo‘yicha', () => {
    // 11-noyabrgacha 16 kun, 20 000 → 1 250/kun. 1 oy = 30 kun, 30 000 → 1 000/kun → 20% arzon.
    const season = offer('season', 20000, null, '2026-11-11T18:59:59.999Z');
    expect(longerOfferSaving([offer('1m', 30000, 1), season], now)).toEqual({ offerId: '1m', percent: 20, shorter: season });
    // 1 oy 50 000 → 1 667/kun: uzunrog'i qimmat — manfiy natija ko'rsatilmaydi.
    expect(longerOfferSaving([offer('1m', 50000, 1), season], now)).toBeNull();
  });
  it('ikki oylik variant: uzunining kunlik narxi arzon bo‘lsagina', () => {
    const one = offer('1m', 40000, 1);
    expect(longerOfferSaving([one, offer('3m', 90000, 3)], now)).toMatchObject({ offerId: '3m', percent: 25 });
    expect(longerOfferSaving([one, offer('3m', 120000, 3)], now)).toBeNull();
    expect(longerOfferSaving([one, offer('3m', 150000, 3)], now)).toBeNull();
  });
  it('muddati o‘tgan sanagacha variant solishtirilmaydi', () => {
    expect(longerOfferSaving([offer('1m', 40000, 1), offer('old', 10000, null, '2026-10-25T18:59:59.999Z')], now)).toBeNull();
    expect(longerOfferSaving([offer('1m', 40000, 1)], now)).toBeNull();
  });
});

describe('kontent sonlari', () => {
  it('pastga yaxlitlanadi va "+" qo‘yiladi', () => {
    expect([7, 99, 100, 145, 999, 1000, 1600, 1689].map(roundDownCount)).toEqual([
      { value: 7, plus: false }, { value: 99, plus: false }, { value: 100, plus: false }, { value: 140, plus: true },
      { value: 990, plus: true }, { value: 1000, plus: false }, { value: 1600, plus: false }, { value: 1600, plus: true },
    ]);
  });
  const rows = [
    { categoryId: 'att', subjectId: 'physics', topicTests: 45, mockTests: 3, questions: 1650 },
    { categoryId: 'att', subjectId: 'math', topicTests: 20, mockTests: 2, questions: 700 },
    { categoryId: 'dtm', subjectId: 'physics', topicTests: 9, mockTests: 1, questions: 90 },
  ];
  it('ONE: fan kesimida, boshqa fan va kategoriya qo‘shilmaydi', () => {
    const result = productContentCounts({ kind: 'CATEGORY', subjectRule: 'ONE', categoryId: 'att', subjectIds: ['physics', 'math'] }, rows, []);
    expect(result.counts).toBeNull();
    expect(result.bySubject.get('physics')).toEqual({ topicTests: 45, mockTests: 3, questions: 1650 });
    expect(result.bySubject.get('math')).toEqual({ topicTests: 20, mockTests: 2, questions: 700 });
  });
  it('DTM_BLOCK: faqat tanlanadigan fanlar', () => {
    const result = productContentCounts({ kind: 'CATEGORY', subjectRule: 'DTM_BLOCK', categoryId: 'dtm', subjectIds: ['physics'] }, rows, []);
    expect([...result.bySubject.keys()]).toEqual(['physics']);
    expect(result.bySubject.get('physics')).toEqual({ topicTests: 9, mockTests: 1, questions: 90 });
  });
  it('NONE — butun kategoriya; BUNDLE — sotuvdagi kategoriyalar', () => {
    expect(productContentCounts({ kind: 'CATEGORY', subjectRule: 'NONE', categoryId: 'att', subjectIds: [] }, rows, []).counts)
      .toEqual({ topicTests: 65, mockTests: 5, questions: 2350 });
    expect(productContentCounts({ kind: 'BUNDLE', subjectRule: 'NONE', categoryId: null, subjectIds: [] }, rows, ['dtm']).counts)
      .toEqual({ topicTests: 9, mockTests: 1, questions: 90 });
  });
});

describe('paket va avtomatik afzalliklar', () => {
  const category = (price: number) => ({ kind: 'CATEGORY' as const, offers: [offer('a', price, 1), offer('b', price * 3, 3)] });
  it('alohida eng arzon variantlar yig‘indisi paketdan qimmat bo‘lsagina', () => {
    const bundle = { offers: [offer('all', 90000, 1)] };
    expect(bundleSavings(bundle, [category(49000), category(59000), { kind: 'BUNDLE', offers: bundle.offers }])).toEqual({ separate: 108000, bundle: 90000 });
    expect(bundleSavings(bundle, [category(40000), category(45000)])).toBeNull();
    expect(bundleSavings(bundle, [category(149000)])).toBeNull();
    expect(bundleSavings({ offers: [] }, [category(49000), category(59000)])).toBeNull();
  });
  it('faqat haqiqatda ochiladiganlar: kontent bo‘lmasa test bandi yo‘q', () => {
    expect(autoFeatures({ kind: 'CATEGORY' }, { topicTests: 4, mockTests: 0, questions: 40 })).toEqual(['topicTests', 'solutions', 'aiExplain']);
    expect(autoFeatures({ kind: 'BUNDLE' }, { topicTests: 4, mockTests: 2, questions: 40 })).toEqual(['allCategories', 'topicTests', 'mockTests', 'solutions', 'aiExplain']);
  });
});
