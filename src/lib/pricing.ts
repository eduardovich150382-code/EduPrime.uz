import type { ProductKind, SubjectRule, TestType } from '@prisma/client';
import { daysLeft, formatTashkentDate } from './date';
import type { LocalizedName } from './subscription-details';

export interface ContentCounts { topicTests: number; mockTests: number; questions: number }
export interface PricingOffer {
  id: string; label: string; price: number; durationMonths: number | null; untilDate: string | null; buyHref: string;
  // Aksiya o'tgan bo'lsa server null yuboradi; promoUntil — sahifa ochiq turganda tugashi uchun.
  compareAtPrice: number | null; promoUntil: string | null; badge: string | null; isFeatured: boolean;
  // Kirgan foydalanuvchiga ikkinchi fan chegirmasi bilan narx (checkoutPrice hisobidan).
  personalPrice: number | null;
}
export interface PricingSubject { id: string; name: string; testCount: number; isMandatory: boolean; counts: ContentCounts }
export interface PricingProduct {
  id: string; kind: ProductKind; goal: TestType | null; name: string; subjectRule: SubjectRule;
  secondSubjectDiscountPct: number; subjects: PricingSubject[]; offers: PricingOffer[];
  tagline: string | null; features: string[];
  // NONE va BUNDLE — butun doira yig'indisi; ONE/DTM_BLOCK da null, sonlar fan kesimida.
  counts: ContentCounts | null;
  // Shu mahsulot bo'yicha joriy obunalar (ONE da har fan alohida obuna).
  activeSubscriptions: { id: string; endDate: string; subjects: string[] }[];
}

export const EMPTY_COUNTS: ContentCounts = { topicTests: 0, mockTests: 0, questions: 0 };

export function localizedName(row: LocalizedName, locale: string): string {
  return row[locale === 'ru' ? 'nameRu' : locale === 'en' ? 'nameEn' : 'nameUz'];
}

export function selectPricingProduct(products: PricingProduct[], goal?: string): PricingProduct | undefined {
  const categories = products.filter((product) => product.kind === 'CATEGORY');
  return categories.find((product) => product.goal === goal) ?? categories[0];
}

export function formatPricingDate(value: string, locale: string): string {
  return formatTashkentDate(value, locale, true);
}

/** Eski narx narxdan katta bo'lsagina foiz; aks holda belgi chiqmaydi. */
export function discountPercent(price: number, compareAtPrice: number | null): number | null {
  if (compareAtPrice === null || !(compareAtPrice > price) || price < 0) return null;
  const percent = Math.round((1 - price / compareAtPrice) * 100);
  return percent > 0 ? percent : null;
}

export function savingsAmount(price: number, compareAtPrice: number | null): number | null {
  return discountPercent(price, compareAtPrice) === null ? null : compareAtPrice! - price;
}

// Aksiya muddati yo'q eski narx doimiy; muddat o'tgach eski narx yolg'on bo'lib qoladi.
export function promoActive(offer: { promoUntil: Date | string | null }, now: Date): boolean {
  return offer.promoUntil === null || new Date(offer.promoUntil).getTime() > now.getTime();
}

type OfferPeriod = { durationMonths: number | null; untilDate: Date | string | null };

/**
 * Variant necha kun xizmat qiladi: oylik — 30 kunlik oy, sanagacha —
 * bugungi Toshkent kunidan qolgan kunlar (oxirgi kun ham sanaladi, kamida 1).
 * Muddati o'tgan sanagacha variant — null, solishtiruvda qatnashmaydi.
 */
export function offerDays(offer: OfferPeriod, now: Date): number | null {
  if (offer.durationMonths !== null) return offer.durationMonths > 0 ? offer.durationMonths * 30 : null;
  if (offer.untilDate === null || new Date(offer.untilDate).getTime() <= now.getTime()) return null;
  return Math.max(daysLeft(offer.untilDate, now), 1);
}

/** Bir oydan uzun oylik variantda oyiga narx. */
export function monthlyPrice(offer: OfferPeriod & { price: number }): number | null {
  return offer.durationMonths !== null && offer.durationMonths > 1 ? Math.round(offer.price / offer.durationMonths) : null;
}

/** Sanagacha variantda kuniga narx (qolgan kunlar bo'yicha). */
export function dailyPrice(offer: OfferPeriod & { price: number }, now: Date): number | null {
  if (offer.untilDate === null) return null;
  const days = offerDays(offer, now);
  return days === null ? null : Math.round(offer.price / days);
}

/**
 * Eng uzun variant eng qisqasidan kunlik narx bo'yicha qanchaga arzon.
 * Oylik va sanagacha variantlar shu bitta o'lchovda solishtiriladi; arzon
 * bo'lmasa (yoki solishtiradigan ikkita variant bo'lmasa) — null.
 */
export function longerOfferSaving<T extends OfferPeriod & { id: string; price: number }>(offers: T[], now: Date): { offerId: string; percent: number; shorter: T } | null {
  const rows = offers.map((offer) => ({ offer, days: offerDays(offer, now) }))
    .filter((row): row is { offer: T; days: number } => row.days !== null && row.offer.price > 0);
  if (rows.length < 2) return null;
  const sorted = [...rows].sort((a, b) => a.days - b.days);
  const shorter = sorted[0];
  const longer = sorted[sorted.length - 1];
  if (longer.days === shorter.days) return null;
  const percent = Math.round((1 - (longer.offer.price / longer.days) / (shorter.offer.price / shorter.days)) * 100);
  return percent > 0 ? { offerId: longer.offer.id, percent, shorter: shorter.offer } : null;
}

/** "1 600+" — katta sonlar pastga yaxlitlanadi, aniq son va'da qilinmaydi. */
export function roundDownCount(n: number): { value: number; plus: boolean } {
  const step = n < 100 ? 1 : n < 1000 ? 10 : 100;
  const value = Math.floor(n / step) * step;
  return { value, plus: value < n };
}

export function sumCounts(rows: ContentCounts[]): ContentCounts {
  return rows.reduce((sum, row) => ({ topicTests: sum.topicTests + row.topicTests, mockTests: sum.mockTests + row.mockTests, questions: sum.questions + row.questions }), EMPTY_COUNTS);
}

export interface ContentCountRow extends ContentCounts { categoryId: string; subjectId: string }

/**
 * Kartadagi sonlar aynan sotiladigan doira bo'yicha: ONE va DTM_BLOCK da
 * fan kesimida (Matematika testlari Fizika kartasiga qo'shilmasin), NONE —
 * butun kategoriya, BUNDLE — barcha sotuvdagi kategoriyalar.
 */
export function productContentCounts(
  product: { kind: ProductKind; subjectRule: SubjectRule; categoryId: string | null; subjectIds: string[] },
  rows: ContentCountRow[], bundleCategoryIds: string[],
): { counts: ContentCounts | null; bySubject: Map<string, ContentCounts> } {
  const bySubject = new Map<string, ContentCounts>();
  for (const row of rows) {
    if (row.categoryId !== product.categoryId) continue;
    bySubject.set(row.subjectId, sumCounts([bySubject.get(row.subjectId) ?? EMPTY_COUNTS, row]));
  }
  if (product.kind === 'BUNDLE') return { counts: sumCounts(rows.filter((row) => bundleCategoryIds.includes(row.categoryId))), bySubject };
  if (product.subjectRule === 'NONE') return { counts: sumCounts(rows.filter((row) => row.categoryId === product.categoryId)), bySubject };
  return { counts: null, bySubject: new Map(product.subjectIds.map((id) => [id, bySubject.get(id) ?? EMPTY_COUNTS])) };
}

/**
 * Paket tejamkorligi: faol kategoriya mahsulotlarining eng arzon variantlari
 * yig'indisi paketning eng arzon variantidan qimmat bo'lsagina ko'rsatiladi.
 */
export function bundleSavings(bundle: Pick<PricingProduct, 'offers'>, products: Pick<PricingProduct, 'kind' | 'offers'>[]): { separate: number; bundle: number } | null {
  const cheapest = (offers: PricingOffer[]) => offers.length ? Math.min(...offers.map((offer) => offer.price)) : null;
  const bundlePrice = cheapest(bundle.offers);
  const categoryPrices = products.filter((p) => p.kind === 'CATEGORY').map((p) => cheapest(p.offers)).filter((price): price is number => price !== null);
  if (bundlePrice === null || categoryPrices.length < 2) return null;
  const separate = categoryPrices.reduce((sum, price) => sum + price, 0);
  return separate > bundlePrice ? { separate, bundle: bundlePrice } : null;
}

export type AutoFeature = 'allCategories' | 'topicTests' | 'mockTests' | 'solutions' | 'aiExplain';

/**
 * Obuna haqiqatda ochadigan narsalar: doiradagi pullik mavzu testlari va
 * mocklar (canAccessByEntitlements), batafsil yechim va AI tushuntirish
 * kunlik limitisiz (quota.ts — coversAllFeatureScopes). Qayta ishlash hech
 * kimga cheklanmagan, shuning uchun "cheksiz urinish" afzallik emas.
 */
export function autoFeatures(product: { kind: ProductKind }, counts: ContentCounts): AutoFeature[] {
  return [
    ...(product.kind === 'BUNDLE' ? ['allCategories' as const] : []),
    ...(counts.topicTests > 0 ? ['topicTests' as const] : []),
    ...(counts.mockTests > 0 ? ['mockTests' as const] : []),
    'solutions', 'aiExplain',
  ];
}
