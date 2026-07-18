import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const BOT_SECRET = process.env.TELEGRAM_BOT_TOKEN || '';

function verifyBotSecret(request: NextRequest): boolean {
  const secret = request.headers.get('x-bot-secret');
  return !!secret && secret === BOT_SECRET;
}

/**
 * POST /api/telegram/test-purchase — pullik test sotib olishni tasdiqlash
 * Admin botda tasdiqlashni bosganda chaqiriladi.
 * Foydalanuvchi uchun testga ruxsat beradi.
 */
export async function POST(request: NextRequest) {
  try {
    if (!verifyBotSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { telegramId, testId, action } = body;

    if (!telegramId || !testId || !action) {
      return NextResponse.json(
        { error: 'telegramId, testId, action required' },
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

    if (action === 'confirm') {
      // Grant access: store testId in a confirmed payment's selectedSubjects
      // Find the pending payment for this user
      const payment = await db.payment.findFirst({
        where: {
          userId: user.id,
          status: 'PENDING',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (payment) {
        await db.payment.update({
          where: { id: payment.id },
          data: {
            status: 'CONFIRMED',
            confirmedAt: new Date(),
            selectedSubjects: [testId], // Store purchased test ID
          },
        });
      } else {
        // Create confirmed payment if none exists
        await db.payment.create({
          data: {
            userId: user.id,
            plan: 'PREMIUM',
            duration: 'ONE_MONTH',
            amount: 0,
            status: 'CONFIRMED',
            confirmedAt: new Date(),
            selectedSubjects: [testId],
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Test access granted',
        userId: user.id,
        testId,
      });
    }

    if (action === 'reject') {
      // Just update payment status
      const payment = await db.payment.findFirst({
        where: { userId: user.id, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      });

      if (payment) {
        await db.payment.update({
          where: { id: payment.id },
          data: { status: 'REJECTED', confirmedAt: new Date() },
        });
      }

      return NextResponse.json({ success: true, message: 'Payment rejected' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/telegram/test-purchase error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * GET /api/telegram/test-purchase?userId=X&testId=Y
 * Check if user has purchased a specific test
 */
export async function GET(request: NextRequest) {
  try {
    if (!verifyBotSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = request.nextUrl.searchParams.get('userId');
    const testId = request.nextUrl.searchParams.get('testId');

    if (!userId || !testId) {
      return NextResponse.json({ error: 'userId and testId required' }, { status: 400 });
    }

    const purchase = await db.payment.findFirst({
      where: {
        userId,
        status: 'CONFIRMED',
        selectedSubjects: { has: testId },
      },
    });

    return NextResponse.json({ hasPurchased: !!purchase });
  } catch (error) {
    console.error('GET /api/telegram/test-purchase error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
