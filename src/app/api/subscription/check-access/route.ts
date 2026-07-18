import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

/**
 * GET /api/subscription/check-access?testId=xxx
 * Testga foydalanuvchining ruxsati borligini tekshiradi.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const testId = request.nextUrl.searchParams.get('testId');
    if (!testId) {
      return NextResponse.json({ error: 'testId required' }, { status: 400 });
    }

    const userId = session.user.id;
    const now = new Date();

    // Get test info
    const test = await db.test.findUnique({
      where: { id: testId },
      select: { id: true, isFree: true, accessType: true, price: true, titleUz: true },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Free tests — always accessible
    if (test.isFree || test.accessType === 'free') {
      return NextResponse.json({ hasAccess: true, reason: 'free' });
    }

    // Get user's active subscriptions
    const subscriptions = await db.subscription.findMany({
      where: { userId, isActive: true, endDate: { gte: now } },
      select: { plan: true },
    });

    const hasPremium = subscriptions.some(s => s.plan === 'PREMIUM');
    const hasTeacher = subscriptions.some(s => s.plan === 'TEACHER_PLAN');

    // Check based on accessType
    if (test.accessType === 'premium' && hasPremium) {
      return NextResponse.json({ hasAccess: true, reason: 'premium_subscription' });
    }
    if (test.accessType === 'teacher' && hasTeacher) {
      return NextResponse.json({ hasAccess: true, reason: 'teacher_subscription' });
    }
    if (test.accessType === 'premium_teacher' && (hasPremium || hasTeacher)) {
      return NextResponse.json({ hasAccess: true, reason: 'subscription' });
    }

    // For paid tests — check if user purchased this specific test
    if (test.accessType === 'paid') {
      const purchase = await db.payment.findFirst({
        where: {
          userId,
          status: 'CONFIRMED',
          selectedSubjects: { has: testId }, // We'll use selectedSubjects to track purchased test IDs
        },
      });
      if (purchase) {
        return NextResponse.json({ hasAccess: true, reason: 'purchased' });
      }
    }

    // Admin always has access
    const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === 'ADMIN') {
      return NextResponse.json({ hasAccess: true, reason: 'admin' });
    }

    // No access
    return NextResponse.json({
      hasAccess: false,
      accessType: test.accessType,
      price: test.price,
      testTitle: test.titleUz,
    });
  } catch (error) {
    console.error('GET /api/subscription/check-access error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
