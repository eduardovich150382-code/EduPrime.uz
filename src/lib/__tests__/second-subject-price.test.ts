import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/db', () => ({ db: {} }));
import type { Prisma } from '@prisma/client';
import { checkoutPrice, secondSubjectOfferPrice } from '../category-checkout';
import { createCheckoutPayment } from '../checkout-selection';

const now = new Date();
const active = [{ productId: 'p', subjectIds: ['physics'], isActive: true, startDate: new Date(now.getTime() - 86_400_000), endDate: new Date(now.getTime() + 30 * 86_400_000) }];
const product = { id: 'p', kind: 'CATEGORY', subjectRule: 'ONE', isOnSale: true, secondSubjectDiscountPct: 25 };
const offer = { id: 'o', productId: 'p', isActive: true, price: 49001, durationMonths: 1, untilDate: null };

// To'lovni bot yaratadigan yo'l — createCheckoutPayment — bilan bir xil summa.
function tx(subscriptions: typeof active) {
  return {
    product: { findUniqueOrThrow: vi.fn().mockResolvedValue(product) },
    productOffer: { findUniqueOrThrow: vi.fn().mockResolvedValue(offer) },
    payment: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn(({ data }) => Promise.resolve(data)) },
    subscription: { findMany: vi.fn().mockResolvedValue(subscriptions) },
  } as unknown as Prisma.TransactionClient;
}

describe('sahifadagi ikkinchi fan narxi', () => {
  it('bot yozadigan to‘lov summasi bilan aynan bir xil', async () => {
    const shown = secondSubjectOfferPrice(offer.price, product.secondSubjectDiscountPct, 'p', active, now);
    expect(shown).toBe(checkoutPrice(offer.price, 25, 'p', ['math'], active, now));
    const payment = await createCheckoutPayment(tx(active), { userId: 'u1', productId: 'p', offerId: 'o', subjectIds: ['math'] });
    expect(payment.amount).toBe(shown);
    expect(shown).toBe(36751);
  });
  it('shu fanni uzaytirish chegirmasiz; obunasiz — shaxsiy narx yo‘q', async () => {
    const renewal = await createCheckoutPayment(tx(active), { userId: 'u1', productId: 'p', offerId: 'o', subjectIds: ['physics'] });
    expect(renewal.amount).toBe(offer.price);
    expect(secondSubjectOfferPrice(offer.price, 25, 'p', [], now)).toBeNull();
    expect(secondSubjectOfferPrice(offer.price, 0, 'p', active, now)).toBeNull();
    expect(secondSubjectOfferPrice(offer.price, 25, 'other-product', active, now)).toBeNull();
  });
});
