import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { AdminInputError, adminApiError, grantSchema, hasPrismaCode, readAdminJson } from '@/lib/admin-products-api';
import { buildSubjectIds, computeEndDate, resolveStartDate, sameSubjectIds } from '@/lib/product-offers';
import { loadSubscriptionRows } from '@/lib/subscription-details';
import { subscriptionProductStats } from '@/lib/subscription-display';

const querySchema = z.object({
  filter: z.enum(['all', 'premium', 'teacher', 'free', 'expiring', 'category', 'bundle']).default('all'),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const { filter, page, limit } = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const now = new Date();
    const active: Prisma.SubscriptionWhereInput = { isActive: true, startDate: { lte: now }, endDate: { gte: now } };
    const expiring = { ...active, endDate: { gte: now, lte: new Date(now.getTime() + 7 * 86400000) } };
    const [totalUsers, premiumCount, teacherCount, subscribedUsers, expiringCount, details] = await Promise.all([
      db.user.count(), db.subscription.count({ where: { ...active, plan: 'PREMIUM' } }),
      db.subscription.count({ where: { ...active, plan: 'TEACHER_PLAN' } }),
      db.subscription.findMany({ where: active, select: { userId: true }, distinct: ['userId'] }),
      db.subscription.count({ where: expiring }),
      loadSubscriptionRows(null, now),
    ]);
    const plans = { premium: 'PREMIUM', teacher: 'TEACHER_PLAN', category: 'CATEGORY', bundle: 'BUNDLE' } as const;
    const subscriptionWhere: Prisma.SubscriptionWhereInput = filter === 'expiring' ? expiring : {
      ...active, ...(filter in plans ? { plan: plans[filter as keyof typeof plans] } : {}),
    };
    const where: Prisma.UserWhereInput = filter === 'all' ? {} : filter === 'free'
      ? { id: { notIn: subscribedUsers.map((s) => s.userId) } }
      : { subscriptions: { some: subscriptionWhere } };
    const [total, users, subjects] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' }, select: {
        id: true, name: true, image: true, email: true, telegramUsername: true,
        subscriptions: { where: active, include: { product: { select: { nameUz: true, nameRu: true, nameEn: true } }, offer: { select: { labelUz: true, labelRu: true, labelEn: true } } }, orderBy: { endDate: 'desc' } },
      } }),
      db.subject.findMany({ select: { id: true, nameUz: true, nameRu: true, nameEn: true } }),
    ]);
    return NextResponse.json({ stats: { totalUsers, premiumCount, teacherCount, freeCount: totalUsers - subscribedUsers.length, expiringCount,
      products: subscriptionProductStats(details) },
      users: users.map((u) => ({ ...u, plan: u.subscriptions.map((s) => s.plan).join('+') || 'FREE', endDate: u.subscriptions[0]?.endDate ?? null,
        subscriptions: u.subscriptions.map((s) => ({ ...s, subjects: subjects.filter((subject) => s.subjectIds.includes(subject.id)) })),
      })), total, page, limit });
  } catch (error) { return adminApiError(error); }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const input = grantSchema.parse(await readAdminJson(request));
    // Takroriy parallel uzaytirishlar bir xil endDate'dan boshlanib qolmasin.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const subscription = await db.$transaction(async (tx) => {
          const [product, offer, user] = await Promise.all([
            tx.product.findUnique({ where: { id: input.productId }, include: { category: { include: { subjects: true } } } }),
            tx.productOffer.findUnique({ where: { id: input.offerId } }),
            tx.user.findUnique({ where: { id: input.userId }, select: { id: true } }),
          ]);
          if (!product || !offer || !user) throw new AdminInputError('NOT_FOUND', 404);
          if (offer.productId !== product.id || !offer.isActive) throw new AdminInputError('INVALID_OFFER');
          const subjects = product.category?.subjects ?? [];
          if (input.subjectIds.some((id) => !subjects.some((s) => s.id === id))) throw new AdminInputError('INVALID_SUBJECT');
          const subjectIds = buildSubjectIds(product, input.subjectIds, subjects);
          const now = new Date();
          const current = offer.durationMonths !== null ? await tx.subscription.findMany({
            where: { userId: input.userId, productId: product.id, isActive: true, endDate: { gt: now } },
            select: { subjectIds: true, endDate: true }, orderBy: { endDate: 'desc' },
          }) : [];
          const currentEndDate = current.find((s) => sameSubjectIds(s.subjectIds, subjectIds))?.endDate;
          return tx.subscription.create({ data: {
            userId: input.userId, plan: product.kind === 'BUNDLE' ? 'BUNDLE' : 'CATEGORY', duration: 'CUSTOM',
            productId: product.id, offerId: offer.id, categoryId: product.categoryId, subjectIds,
            startDate: resolveStartDate(offer, now, currentEndDate), endDate: computeEndDate(offer, now, currentEndDate),
          } });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        return NextResponse.json({ subscription }, { status: 201 });
      } catch (error) {
        if (!hasPrismaCode(error, 'P2034')) throw error;
        if (attempt === 2) throw new AdminInputError('RETRY_REQUIRED', 409);
      }
    }
    throw new AdminInputError('RETRY_REQUIRED', 409);
  } catch (error) { return adminApiError(error); }
}
