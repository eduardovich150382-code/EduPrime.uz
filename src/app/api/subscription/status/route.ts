import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { loadSubscriptionRows } from '@/lib/subscription-details';
import { currentSubscriptions, nearestExpiringSubscription, subscriptionView } from '@/lib/subscription-display';
import { hasAnyScope } from '@/lib/entitlements';
import { daysUntil, tashkentDateKey } from '@/lib/date';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const now = new Date();
    const [rows, permissions] = await Promise.all([
      loadSubscriptionRows([session.user.id], now, true),
      db.userPermission.findMany({ where: { userId: session.user.id, isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
        select: { categoryId: true, subjectId: true, isActive: true, expiresAt: true } }),
    ]);
    const subscriptions = currentSubscriptions(rows, now);
    const hasPremium = subscriptions.some((s) => s.plan === 'PREMIUM');
    const hasTeacher = subscriptions.some((s) => s.plan === 'TEACHER_PLAN');
    // Eski bayroqlar eski ma'nosini saqlaydi; CATEGORY umumiy Premium emas.
    const plan = hasPremium && hasTeacher ? 'PREMIUM_TEACHER' : hasPremium ? 'PREMIUM' : hasTeacher ? 'TEACHER_PLAN'
      : subscriptions.some((s) => s.plan === 'BUNDLE') ? 'BUNDLE' : subscriptions.length ? 'CATEGORY' : 'FREE';
    return NextResponse.json({
      plan, subscriptions: subscriptions.map(subscriptionView), hasPremium, hasTeacher,
      hasAnyScope: hasAnyScope({ now, subscriptions, permissions }),
      daysUntilExpiry: subscriptions[0] ? daysUntil(tashkentDateKey(subscriptions[0].endDate), now) : null,
      expiringSubscription: nearestExpiringSubscription(rows, now),
    });
  } catch (error) {
    logger.error('GET /api/subscription/status error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
