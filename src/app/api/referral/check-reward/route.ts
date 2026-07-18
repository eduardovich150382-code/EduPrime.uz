import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// POST /api/referral/check-reward - check and grant reward if eligible
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id as string;

    // Count referrals
    const referralCount = await db.referral.count({
      where: { referrerId: userId },
    });

    if (referralCount < 3) {
      return NextResponse.json({
        eligible: false,
        referralCount,
        remaining: 3 - referralCount,
        message: `Sizga yana ${3 - referralCount} ta do'st taklif qilish kerak`,
      });
    }

    // Check if reward already granted (look for referral-based subscription)
    const existingReward = await db.subscription.findFirst({
      where: {
        userId,
        plan: 'PREMIUM',
        isActive: true,
        paymentId: null, // Referral reward has no payment
      },
    });

    if (existingReward) {
      return NextResponse.json({
        eligible: true,
        alreadyGranted: true,
        subscription: existingReward,
        message: 'Siz allaqachon mukofotingizni oldingiz!',
      });
    }

    // Grant 5-day premium subscription
    const now = new Date();
    const endDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days

    const subscription = await db.subscription.create({
      data: {
        userId,
        plan: 'PREMIUM',
        duration: 'ONE_MONTH', // Closest enum value, actual end date is 5 days
        startDate: now,
        endDate,
        isActive: true,
        paymentId: null,
      },
    });

    return NextResponse.json({
      eligible: true,
      alreadyGranted: false,
      subscription,
      message: 'Tabriklaymiz! 5 kunlik Premium tarif bepul berildi!',
    });
  } catch (error) {
    console.error('POST /api/referral/check-reward error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
