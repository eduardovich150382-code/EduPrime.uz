import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { processSubscriptionPayment } from '@/lib/subscription-payments';
import { adminApiError } from '@/lib/admin-products-api';
import { recordPurchase, resolvePurchaseItemType } from '@/lib/purchases';
import { logger } from '@/lib/logger';

// GET /api/admin/payments — all payments (ADMIN only)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = session.user?.role;
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const visible: Prisma.PaymentWhereInput = searchParams.get('includeUnreceipted') === '1' ? {} : {
      OR: [{ status: { not: 'PENDING' } }, { receiptPhoto: { not: null } }],
    };
    const where: Prisma.PaymentWhereInput = { ...visible };
    if (status && ['PENDING', 'CONFIRMED', 'REJECTED'].includes(status)) {
      where.status = z.enum(['PENDING', 'CONFIRMED', 'REJECTED']).parse(status);
    }

    const payments = await db.payment.findMany({
      where,
      include: {
        product: { include: { offers: { where: { isActive: true }, orderBy: { order: 'asc' } } } },
        offer: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            telegramUsername: true,
            image: true,
          },
        },
        confirmedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await db.payment.count({ where });

    // Get counts by status
    const [pendingCount, confirmedCount, rejectedCount] = await Promise.all([
      db.payment.count({ where: { ...visible, status: 'PENDING' } }),
      db.payment.count({ where: { ...visible, status: 'CONFIRMED' } }),
      db.payment.count({ where: { ...visible, status: 'REJECTED' } }),
    ]);

    const subjects = await db.subject.findMany({ where: { id: { in: payments.flatMap((p) => p.subjectIds) } }, select: { id: true, nameUz: true, nameRu: true, nameEn: true } });
    return NextResponse.json({
      payments: payments.map((p) => ({ ...p, subjects: subjects.filter((subject) => p.subjectIds.includes(subject.id)) })),
      total,
      page,
      limit,
      counts: { pending: pendingCount, confirmed: confirmedCount, rejected: rejectedCount },
    });
  } catch (error) {
    logger.error('GET /api/admin/payments error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH /api/admin/payments — confirm or reject a payment
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = session.user?.role;
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { paymentId, action, replacementOfferId } = z.object({
      paymentId: z.string().min(1).max(200), action: z.enum(['confirm', 'reject']), replacementOfferId: z.string().min(1).max(200).optional(),
    }).strict().parse(body);

    if (!paymentId || !action || !['confirm', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'paymentId and action (confirm/reject) required' }, { status: 400 });
    }

    const payment = await db.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const result = await processSubscriptionPayment(paymentId, action, session.user.id, replacementOfferId);
    const updated = result.payment;
    const newStatus = updated.status;

    if (action === 'confirm' && !payment.productId && !result.alreadyProcessed) {
      // `selectedSubjects` bitta-test/bitta-kurs xaridlarida ham ishlatiladi
      // (lib/purchases.ts) — shu maydondagi har bir id haqiqatan Test/Course
      // ekanini tekshirib, mos Purchase yozuvini yaratamiz. TEACHER_PLAN
      // uchun tanlangan fan id'lari ikkalasiga ham mos kelmaydi va tegilmay
      // qoladi.
      for (const subjectOrItemId of payment.selectedSubjects) {
        const itemType = await resolvePurchaseItemType(subjectOrItemId);
        if (itemType) {
          await recordPurchase(payment.userId, itemType, subjectOrItemId, payment.id);
        }
      }
    }

    return NextResponse.json({
      message: `Payment ${newStatus.toLowerCase()}`,
      payment: updated,
    });
  } catch (error) {
    return adminApiError(error);
  }
}
