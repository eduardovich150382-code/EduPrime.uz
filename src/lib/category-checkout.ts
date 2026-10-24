import { createHash } from 'crypto';
import type { Product, ProductOffer, Subscription } from '@prisma/client';
import { buildSubjectIds, computeEndDate, resolveStartDate, sameSubjectIds } from './product-offers';

type CurrentSubscription = Pick<Subscription, 'productId' | 'subjectIds' | 'isActive' | 'startDate' | 'endDate'>;

// Bir xil doirani uzaytirish boshqa faol fan mavjud bo'lsa ham chegirmasiz.
export function checkoutPrice(price: number, discountPct: number, productId: string, subjectIds: string[], subscriptions: CurrentSubscription[], now: Date): number {
  if (!Number.isSafeInteger(price) || price < 0 || price > 2147483647 || !Number.isInteger(discountPct) || discountPct < 0 || discountPct > 100) throw new Error('INVALID_PRICE');
  const active = subscriptions.filter((s) => s.productId === productId && s.isActive && s.startDate <= now && s.endDate > now);
  const renewal = active.some((s) => sameSubjectIds(s.subjectIds, subjectIds));
  const eligible = subjectIds.length > 0 && !renewal && active.some((s) => s.subjectIds.length > 0 && !sameSubjectIds(s.subjectIds, subjectIds));
  return eligible ? Math.round(price * (100 - discountPct) / 100) : price;
}

export function subscriptionFromPayment(product: Pick<Product, 'id' | 'kind' | 'categoryId' | 'subjectRule'>, offer: Pick<ProductOffer, 'id' | 'durationMonths' | 'untilDate'>,
  paidSubjectIds: string[], subjects: { id: string; categoryId: string; isMandatory: boolean }[], now: Date, current: { subjectIds: string[]; endDate: Date }[]) {
  const chosen = product.subjectRule === 'DTM_BLOCK' ? paidSubjectIds.filter((id) => !subjects.some((s) => s.id === id && s.isMandatory)) : paidSubjectIds;
  if (paidSubjectIds.some((id) => !subjects.some((s) => s.id === id && s.categoryId === product.categoryId))) throw new Error('INVALID_SUBJECT');
  const subjectIds = buildSubjectIds(product, chosen, subjects);
  // Chekdagi blok tasdiqlashda boshqa majburiy fanlar bilan almashib qolmasin.
  if (!sameSubjectIds(subjectIds, paidSubjectIds)) throw new Error('INVALID_SUBJECT');
  const currentEndDate = current.filter((s) => sameSubjectIds(s.subjectIds, subjectIds)).reduce<Date | null>((end, s) => !end || s.endDate > end ? s.endDate : end, null);
  return {
    plan: product.kind === 'BUNDLE' ? 'BUNDLE' as const : 'CATEGORY' as const, duration: 'CUSTOM' as const,
    productId: product.id, offerId: offer.id, categoryId: product.categoryId, subjectIds,
    startDate: resolveStartDate(offer, now, currentEndDate), endDate: computeEndDate(offer, now, currentEndDate),
  };
}

// To'liq cuid'lar DTM tanlovida Telegramning 64 bayt chegarasidan oshadi.
export function checkoutKey(id: string): string { return createHash('sha256').update(id).digest('hex').slice(0, 10); }

export function resolveCheckoutKey<T extends { id: string }>(rows: T[], key: string): T {
  const matches = rows.filter((row) => checkoutKey(row.id) === key);
  if (matches.length !== 1) throw new Error('INVALID_SELECTION');
  return matches[0];
}

export function checkoutCallback(step: 'p' | 's' | 'o', productId: string, subjectIds: string[] = [], offerId?: string): string {
  const value = ['co', step, checkoutKey(productId), subjectIds.map(checkoutKey).join(','), offerId ? checkoutKey(offerId) : ''].join(':');
  if (Buffer.byteLength(value, 'utf8') > 64) throw new Error('INVALID_SELECTION');
  return value;
}

// Id tarkibi va uzunligidan qat'i nazar start parametri 27 ta ruxsatli belgi.
export function checkoutStartParameter(productId: string, offerId: string): string {
  return `buy_p_${checkoutKey(productId)}_${checkoutKey(offerId)}`;
}

export function parseCheckoutStart(value: string): { productKey: string; offerKey: string } | null {
  const match = /^buy_p_([a-f0-9]{10})_([a-f0-9]{10})$/.exec(value);
  return match ? { productKey: match[1], offerKey: match[2] } : null;
}
