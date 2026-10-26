import type { Prisma, Product, ProductOffer } from '@prisma/client';
import { db } from './db';
import { checkoutPrice } from './category-checkout';
import { computeEndDate, requiredSubjectCount } from './product-offers';

type SubjectProduct = Pick<Product, 'kind' | 'categoryId' | 'subjectRule'>;

// Bot tanlovi ham, saytdagi niyat ham aynan shu qoidadan o'tadi — biri
// kengaysa ikkinchisi sotib bo'lmaydigan fanni sotib qo'ymasin.
export async function checkoutSubjects(product: SubjectProduct) {
  const subjects = product.categoryId ? await db.subject.findMany({ where: { categoryId: product.categoryId },
    include: { _count: { select: { tests: { where: { isPublished: true, categoryId: product.categoryId } } } } }, orderBy: [{ order: 'asc' }, { id: 'asc' }] }) : [];
  const available = subjects.filter((s) => s._count.tests > 0 && (product.subjectRule !== 'DTM_BLOCK' || !s.isMandatory));
  const mandatory = subjects.filter((s) => s.isMandatory);
  return { subjects, available, mandatory };
}

export function hasEnoughSubjects(product: SubjectProduct, available: unknown[], mandatory: unknown[]): boolean {
  return available.length >= requiredSubjectCount(product) && (product.subjectRule !== 'DTM_BLOCK' || mandatory.length === 3);
}

export function assertOfferOnSale(offer: Pick<ProductOffer, 'isActive' | 'untilDate'>, now = new Date()) {
  if (!offer.isActive || (offer.untilDate && offer.untilDate <= now)) throw new Error('EXPIRED_OFFER');
}

// paymentTransaction ichida chaqiriladi: narx ham, chegirma huquqi ham aynan
// Payment yaratilgan paytda olinadi. Foydalanuvchini chaqiruvchi aniqlaydi —
// sayt niyatida telegramId bo'yicha upsert boshqa akkauntga yozib yuboradi.
export async function createCheckoutPayment(tx: Prisma.TransactionClient, input: { userId: string; productId: string; offerId: string; subjectIds: string[] }) {
  const { userId, productId, offerId, subjectIds } = input;
  const [freshProduct, freshOffer] = await Promise.all([
    tx.product.findUniqueOrThrow({ where: { id: productId } }), tx.productOffer.findUniqueOrThrow({ where: { id: offerId } }),
  ]);
  if (!freshProduct.isOnSale || !freshOffer.isActive || freshOffer.productId !== productId) throw new Error('INVALID_SELECTION');
  const existing = await tx.payment.findFirst({ where: { userId, productId, offerId, subjectIds: { equals: subjectIds }, status: 'PENDING', receiptPhoto: null }, orderBy: { createdAt: 'desc' } });
  if (existing) return existing;
  const now = new Date(); computeEndDate(freshOffer, now);
  const active = await tx.subscription.findMany({ where: { userId, productId, isActive: true, endDate: { gt: now } } });
  const amount = checkoutPrice(freshOffer.price, freshProduct.secondSubjectDiscountPct, productId, subjectIds, active, now);
  return tx.payment.create({ data: { userId, productId, offerId, subjectIds, amount, plan: freshProduct.kind === 'BUNDLE' ? 'BUNDLE' : 'CATEGORY', duration: 'CUSTOM' } });
}
