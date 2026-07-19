import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// Helper to get a setting value from DB with fallback
async function getSetting(key: string, fallback: string): Promise<string> {
  const setting = await db.systemSetting.findUnique({ where: { key } });
  return setting?.value || fallback;
}

// POST /api/referral/check-reward - check and grant reward if eligible
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id as string;

    // Read dynamic settings
    const friendsRequired = parseInt(await getSetting('referral_friends_required', '3'));
    const rewardDays = parseInt(await getSetting('referral_reward_days', '5'));

    // Count referrals
    const referralCount = await db.referral.count({
      where: { referrerId: userId },
    });

    if (referralCount < friendsRequired) {
      return NextResponse.json({
        eligible: false,
        referralCount,
        remaining: friendsRequired - referralCount,
        message: `Sizga yana ${friendsRequired - referralCount} ta do'st taklif qilish kerak`,
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

    // Grant reward premium subscription
    const now = new Date();
    const endDate = new Date(now.getTime() + rewardDays * 24 * 60 * 60 * 1000);

    const subscription = await db.subscription.create({
      data: {
        userId,
        plan: 'PREMIUM',
        duration: 'ONE_MONTH', // Closest enum value, actual end date uses rewardDays
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
      message: `Tabriklaymiz! ${rewardDays} kunlik Premium tarif bepul berildi!`,
    });
  } catch (error) {
    console.error('POST /api/referral/check-reward error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
