import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET /api/admin/payments — all payments (ADMIN only)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    if (status && ['PENDING', 'CONFIRMED', 'REJECTED'].includes(status)) {
      where.status = status;
    }

    const payments = await db.payment.findMany({
      where,
      include: {
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
      db.payment.count({ where: { status: 'PENDING' } }),
      db.payment.count({ where: { status: 'CONFIRMED' } }),
      db.payment.count({ where: { status: 'REJECTED' } }),
    ]);

    return NextResponse.json({
      payments,
      total,
      page,
      limit,
      counts: { pending: pendingCount, confirmed: confirmedCount, rejected: rejectedCount },
    });
  } catch (error) {
    console.error('GET /api/admin/payments error:', error);
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

    const role = (session.user as any)?.role;
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { paymentId, action } = body;

    if (!paymentId || !action || !['confirm', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'paymentId and action (confirm/reject) required' }, { status: 400 });
    }

    const payment = await db.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status !== 'PENDING') {
      return NextResponse.json({ error: 'Payment already processed' }, { status: 400 });
    }

    const newStatus = action === 'confirm' ? 'CONFIRMED' : 'REJECTED';

    const updated = await db.payment.update({
      where: { id: paymentId },
      data: {
        status: newStatus,
        confirmedById: session.user.id,
        confirmedAt: new Date(),
      },
    });

    // If confirmed, create subscription
    if (action === 'confirm') {
      const durationMonths: Record<string, number> = {
        ONE_MONTH: 1,
        THREE_MONTHS: 3,
        SIX_MONTHS: 6,
        ONE_YEAR: 12,
      };

      const months = durationMonths[payment.duration] || 1;
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + months);

      await db.subscription.create({
        data: {
          userId: payment.userId,
          plan: payment.plan,
          duration: payment.duration,
          startDate: new Date(),
          endDate,
          isActive: true,
          paymentId: payment.id,
        },
      });
    }

    return NextResponse.json({
      message: `Payment ${newStatus.toLowerCase()}`,
      payment: updated,
    });
  } catch (error) {
    console.error('PATCH /api/admin/payments error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
