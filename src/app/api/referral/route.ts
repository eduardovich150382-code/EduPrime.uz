import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

function generateReferralCode(name: string | null): string {
  const slug = (name || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 8);
  const random = Math.random().toString(36).substring(2, 8);
  return `${slug}-${random}`;
}

async function generateUniqueReferralCode(name: string | null): Promise<string> {
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const code = generateReferralCode(name);
    const existing = await db.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!existing) {
      return code;
    }
  }
  // Fallback: use longer random string to minimize collision chance
  const slug = (name || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 8);
  const random = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6);
  return `${slug}-${random}`;
}

// GET /api/referral - get user's referral info
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id as string;

    let user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, referralCode: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate referral code if not exists
    if (!user.referralCode) {
      const referralCode = await generateUniqueReferralCode(user.name);
      user = await db.user.update({
        where: { id: userId },
        data: { referralCode },
        select: { id: true, name: true, referralCode: true },
      });
    }

    // Count referrals
    const referralCount = await db.referral.count({
      where: { referrerId: userId },
    });

    // Read dynamic settings for reward threshold
    const friendsRequiredSetting = await db.systemSetting.findUnique({ where: { key: 'referral_friends_required' } });
    const friendsRequired = parseInt(friendsRequiredSetting?.value || '3');

    // Check reward status
    const hasReward = referralCount >= friendsRequired;
    
    // Check if reward subscription already granted (referral reward has no payment)
    let rewardGranted = false;
    if (hasReward) {
      const rewardSubscription = await db.subscription.findFirst({
        where: {
          userId,
          plan: 'PREMIUM',
          isActive: true,
          paymentId: null, // Referral reward has no payment
        },
      });
      rewardGranted = !!rewardSubscription;
    }

    return NextResponse.json({
      referralCode: user.referralCode,
      referralCount,
      hasReward,
      rewardGranted,
      remainingToReward: Math.max(0, friendsRequired - referralCount),
    });
  } catch (error) {
    console.error('GET /api/referral error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/referral - register a referral (called during signup)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { referralCode, newUserId } = body;

    if (!referralCode || !newUserId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Verify the caller is the newUserId
    if (session.user.id !== newUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find the referrer by code
    const referrer = await db.user.findUnique({
      where: { referralCode },
      select: { id: true },
    });

    if (!referrer) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
    }

    // Don't allow self-referral
    if (referrer.id === newUserId) {
      return NextResponse.json({ error: 'Self-referral not allowed' }, { status: 400 });
    }

    // Check if referral already exists
    const existing = await db.referral.findFirst({
      where: { referredUserId: newUserId },
    });

    if (existing) {
      return NextResponse.json({ error: 'Already referred' }, { status: 409 });
    }

    // Create referral record
    await db.referral.create({
      data: {
        referrerId: referrer.id,
        referredUserId: newUserId,
      },
    });

    // Update referredBy on new user
    await db.user.update({
      where: { id: newUserId },
      data: { referredBy: referralCode },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/referral error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
