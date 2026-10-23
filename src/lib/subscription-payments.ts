import { Prisma, type Payment } from '@prisma/client';
import { z } from 'zod';
import { db } from './db';
import { AdminInputError, hasPrismaCode } from './admin-products-api';
import { subscriptionFromPayment } from './category-checkout';

export async function paymentTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await db.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (error) {
      if (!hasPrismaCode(error, 'P2034') && !hasPrismaCode(error, 'P2002')) throw error;
      if (attempt === 2) throw new AdminInputError('RETRY_REQUIRED', 409);
    }
  }
  throw new AdminInputError('RETRY_REQUIRED', 409);
}

async function processPayment(tx: Prisma.TransactionClient, payment: Payment, action: 'confirm' | 'reject', adminId: string | null, replacementOfferId?: string) {
  if (replacementOfferId && action !== 'confirm') throw new AdminInputError('INVALID_REPLACEMENT');
  if (payment.status === 'CONFIRMED' && action === 'confirm') return { payment, alreadyProcessed: true };
  if (payment.status === 'REJECTED' && action === 'reject') return { payment, alreadyProcessed: true };
  if (payment.status !== 'PENDING') throw new AdminInputError('PAYMENT_ALREADY_PROCESSED', 409);
  const now = new Date();
  let subscription: Prisma.SubscriptionUncheckedCreateInput | undefined;
  if (action === 'confirm') {
    if (payment.productId) {
      const product = await tx.product.findUnique({ where: { id: payment.productId }, include: { category: { include: { subjects: true } } } });
      const offer = await tx.productOffer.findUnique({ where: { id: replacementOfferId ?? payment.offerId ?? '' } });
      if (!product || !offer || offer.productId !== product.id) throw new AdminInputError('INVALID_OFFER');
      // Sotuv to'xtatilishi ilgari qabul qilingan to'lov huquqini bekor qilmaydi.
      if (replacementOfferId && replacementOfferId !== payment.offerId) {
        const original = await tx.productOffer.findUnique({ where: { id: payment.offerId ?? '' } });
        if (!original?.untilDate || original.untilDate > now || !offer.isActive) throw new AdminInputError('INVALID_REPLACEMENT');
      }
      const current = await tx.subscription.findMany({ where: { userId: payment.userId, productId: product.id, isActive: true, endDate: { gt: now } }, select: { subjectIds: true, endDate: true } });
      subscription = { userId: payment.userId, paymentId: payment.id,
        ...subscriptionFromPayment(product, offer, payment.subjectIds, product.category?.subjects ?? [], now, current) };
    } else {
      if (replacementOfferId) throw new AdminInputError('INVALID_REPLACEMENT');
      const months = { ONE_MONTH: 1, THREE_MONTHS: 3, SIX_MONTHS: 6, ONE_YEAR: 12, CUSTOM: 1 }[payment.duration];
      const endDate = new Date(now); endDate.setMonth(endDate.getMonth() + months);
      subscription = { userId: payment.userId, paymentId: payment.id, plan: payment.plan, duration: payment.duration, startDate: now, endDate, isActive: true };
    }
  }
  const claimed = await tx.payment.updateMany({ where: { id: payment.id, status: 'PENDING' }, data: {
    status: action === 'confirm' ? 'CONFIRMED' : 'REJECTED', confirmedById: adminId, confirmedAt: now,
    ...(replacementOfferId ? { offerId: replacementOfferId } : {}),
  } });
  if (claimed.count !== 1) throw new AdminInputError('RETRY_REQUIRED', 409);
  if (subscription) await tx.subscription.create({ data: subscription });
  const updated = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
  return { payment: updated, alreadyProcessed: false };
}

export async function processSubscriptionPayment(paymentId: string, action: 'confirm' | 'reject', adminId: string | null, replacementOfferId?: string) {
  return paymentTransaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new AdminInputError('PAYMENT_NOT_FOUND', 404);
    return processPayment(tx, payment, action, adminId, replacementOfferId);
  });
}

const legacySchema = z.object({
  plan: z.enum(['premium', 'teacher']), duration: z.enum(['1_month', '3_months', '6_months', '1_year']), amount: z.number().int().nonnegative(),
  timestamp: z.number().optional(),
});

// Eski SystemSetting holatini bitta tranzaksiyada iste'mol qilish dublikatni to'sadi.
export async function processLegacySubscription(telegramId: string, action: 'confirm' | 'reject', adminId: string | null) {
  return paymentTransaction(async (tx) => {
    const key = `pending_payment_${telegramId}`;
    const setting = await tx.systemSetting.findUnique({ where: { key } });
    if (!setting) return null;
    const legacy = legacySchema.safeParse(JSON.parse(setting.value));
    if (!legacy.success) return null;
    const user = await tx.user.findUnique({ where: { telegramId } });
    if (!user) throw new AdminInputError('USER_NOT_FOUND', 404);
    const plan = legacy.data.plan === 'premium' ? 'PREMIUM' : 'TEACHER_PLAN';
    const duration = { '1_month': 'ONE_MONTH', '3_months': 'THREE_MONTHS', '6_months': 'SIX_MONTHS', '1_year': 'ONE_YEAR' } as const;
    // Eski INSERT'lar scalar massivga NULL yozgan bo'lishi mumkin; SQL isEmpty
    // ularni o'tkazib yuboradi. Prisma qaytargan massivni kodda tekshiramiz.
    const candidates = await tx.payment.findMany({ where: { userId: user.id, productId: null, plan, duration: duration[legacy.data.duration], amount: legacy.data.amount,
      ...(legacy.data.timestamp ? { createdAt: { gte: new Date(legacy.data.timestamp) } } : { status: 'PENDING' }),
    }, orderBy: { createdAt: 'desc' } });
    const existing = candidates.find((candidate) => (candidate.selectedSubjects?.length ?? 0) === 0);
    const payment = existing ?? await tx.payment.create({ data: { userId: user.id, plan, duration: duration[legacy.data.duration], amount: legacy.data.amount, selectedSubjects: [] } });
    const result = await processPayment(tx, payment, action, adminId);
    await tx.systemSetting.delete({ where: { key } });
    return result;
  });
}
