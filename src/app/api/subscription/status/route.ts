import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

/**
 * GET /api/subscription/status
 * Foydalanuvchining aktiv obuna(lar)ini qaytaradi.
 * Response: { subscriptions: [...], plan: 'FREE' | 'PREMIUM' | 'TEACHER_PLAN' | 'PREMIUM_TEACHER' }
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Get all active subscriptions
    const subscriptions = await db.subscription.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
        endDate: { gte: now },
      },
      orderBy: { endDate: 'desc' },
      select: {
        id: true,
        plan: true,
        duration: true,
        startDate: true,
        endDate: true,
        isActive: true,
      },
    });

    // Determine combined plan
    const hasPremium = subscriptions.some(s => s.plan === 'PREMIUM');
    const hasTeacher = subscriptions.some(s => s.plan === 'TEACHER_PLAN');

    let plan: string = 'FREE';
    if (hasPremium && hasTeacher) plan = 'PREMIUM_TEACHER';
    else if (hasPremium) plan = 'PREMIUM';
    else if (hasTeacher) plan = 'TEACHER_PLAN';

    // Calculate days until earliest expiry
    let daysUntilExpiry: number | null = null;
    if (subscriptions.length > 0) {
      const earliestEnd = subscriptions.reduce((min, s) =>
        s.endDate < min ? s.endDate : min, subscriptions[0].endDate
      );
      daysUntilExpiry = Math.ceil((earliestEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    return NextResponse.json({
      plan,
      subscriptions,
      daysUntilExpiry,
      hasPremium,
      hasTeacher,
    });
  } catch (error) {
    console.error('GET /api/subscription/status error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
