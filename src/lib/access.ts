import { db } from './db';

/**
 * Shared access-control helpers for test content. Question text/options and
 * correctAnswer are the paid product — every place that can reveal them
 * (serving the test, grading a submission, AI explanations) must go through
 * this same check, otherwise a paywall bypass leaks premium content for free.
 */
export async function checkTestAccess(
  userId: string,
  test: { id: string; accessType: string },
  role: string | undefined
): Promise<boolean> {
  if (role === 'ADMIN') return true;

  const { premium, teacher } = await hasActiveSubscription(userId);

  if (test.accessType === 'premium' && premium) return true;
  if (test.accessType === 'teacher' && teacher) return true;
  if (test.accessType === 'premium_teacher' && (premium || teacher)) return true;

  if (test.accessType === 'paid') {
    const purchase = await db.payment.findFirst({
      where: { userId, status: 'CONFIRMED', selectedSubjects: { has: test.id } },
    });
    if (purchase) return true;
  }

  return false;
}

export async function hasActiveSubscription(
  userId: string
): Promise<{ premium: boolean; teacher: boolean }> {
  const now = new Date();
  const subscriptions = await db.subscription.findMany({
    where: { userId, isActive: true, endDate: { gte: now } },
    select: { plan: true },
  });
  return {
    premium: subscriptions.some((s) => s.plan === 'PREMIUM'),
    teacher: subscriptions.some((s) => s.plan === 'TEACHER_PLAN'),
  };
}
