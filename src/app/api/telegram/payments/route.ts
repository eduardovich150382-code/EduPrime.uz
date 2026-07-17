import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const BOT_SECRET = process.env.TELEGRAM_BOT_TOKEN || '';

/**
 * Bot Payment API — allows the Telegram bot to create and manage payments.
 * Protected by BOT_SECRET header verification.
 */

function verifyBotSecret(request: NextRequest): boolean {
  const secret = request.headers.get('x-bot-secret');
  return !!secret && secret === BOT_SECRET;
}

// POST /api/telegram/payments — create a pending payment from bot
export async function POST(request: NextRequest) {
  try {
    if (!verifyBotSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { telegramId, plan, duration, amount } = body;

    if (!telegramId || !plan || !duration || !amount) {
      return NextResponse.json(
        { error: 'telegramId, plan, duration, amount required' },
        { status: 400 }
      );
    }

    // Find user by telegram ID
    const user = await db.user.findUnique({
      where: { telegramId: telegramId.toString() },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Map bot plan/duration to DB enums
    const planMap: Record<string, 'PREMIUM' | 'TEACHER_PLAN'> = {
      premium: 'PREMIUM',
      teacher: 'TEACHER_PLAN',
    };

    const durationMap: Record<string, 'ONE_MONTH' | 'SIX_MONTHS' | 'ONE_YEAR'> = {
      '1_month': 'ONE_MONTH',
      '6_months': 'SIX_MONTHS',
      '1_year': 'ONE_YEAR',
    };

    const dbPlan = planMap[plan];
    const dbDuration = durationMap[duration];

    if (!dbPlan || !dbDuration) {
      return NextResponse.json({ error: 'Invalid plan or duration' }, { status: 400 });
    }

    // Check if user already has a pending payment
    const existingPending = await db.payment.findFirst({
      where: {
        userId: user.id,
        status: 'PENDING',
      },
    });

    if (existingPending) {
      // Update existing pending payment instead of creating new one
      const payment = await db.payment.update({
        where: { id: existingPending.id },
        data: {
          plan: dbPlan,
          duration: dbDuration,
          amount: parseInt(amount),
          createdAt: new Date(),
        },
      });

      return NextResponse.json({ payment, updated: true });
    }

    // Create new payment
    const payment = await db.payment.create({
      data: {
        userId: user.id,
        plan: dbPlan,
        duration: dbDuration,
        amount: parseInt(amount),
        status: 'PENDING',
      },
    });

    return NextResponse.json({ payment, created: true });
  } catch (error) {
    console.error('POST /api/telegram/payments error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH /api/telegram/payments — confirm or reject a payment (admin via bot)
export async function PATCH(request: NextRequest) {
  try {
    if (!verifyBotSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { telegramId, action, adminTelegramId, receiptPhoto } = body;

    if (!telegramId || !action) {
      return NextResponse.json(
        { error: 'telegramId and action required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await db.user.findUnique({
      where: { telegramId: telegramId.toString() },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find pending payment
    const payment = await db.payment.findFirst({
      where: {
        userId: user.id,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      return NextResponse.json({ error: 'No pending payment found' }, { status: 404 });
    }

    // If receipt photo is being attached
    if (receiptPhoto && action === 'receipt') {
      await db.payment.update({
        where: { id: payment.id },
        data: { receiptPhoto },
      });
      return NextResponse.json({ message: 'Receipt attached', paymentId: payment.id });
    }

    // Confirm or reject
    if (action === 'confirm') {
      // Find admin user
      let adminUser = null;
      if (adminTelegramId) {
        adminUser = await db.user.findUnique({
          where: { telegramId: adminTelegramId.toString() },
        });
      }

      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: 'CONFIRMED',
          confirmedById: adminUser?.id || null,
          confirmedAt: new Date(),
        },
      });

      // Create subscription
      const durationMonths: Record<string, number> = {
        ONE_MONTH: 1,
        SIX_MONTHS: 6,
        ONE_YEAR: 12,
      };

      const months = durationMonths[payment.duration] || 1;
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + months);

      const subscription = await db.subscription.create({
        data: {
          userId: user.id,
          plan: payment.plan,
          duration: payment.duration,
          startDate: new Date(),
          endDate,
          isActive: true,
          paymentId: payment.id,
        },
      });

      return NextResponse.json({
        message: 'Payment confirmed, subscription activated',
        subscription,
      });
    }

    if (action === 'reject') {
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: 'REJECTED',
          confirmedAt: new Date(),
        },
      });

      return NextResponse.json({ message: 'Payment rejected' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('PATCH /api/telegram/payments error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// GET /api/telegram/payments — get pending payment for a user (bot queries)
export async function GET(request: NextRequest) {
  try {
    if (!verifyBotSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const telegramId = request.nextUrl.searchParams.get('telegramId');
    if (!telegramId) {
      return NextResponse.json({ error: 'telegramId required' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const payment = await db.payment.findFirst({
      where: {
        userId: user.id,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ payment });
  } catch (error) {
    console.error('GET /api/telegram/payments error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
