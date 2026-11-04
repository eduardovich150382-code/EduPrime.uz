import 'server-only';
import { db } from './db';
import { loadSubscriptionRows } from './subscription-details';
import { currentSubscriptions, nearestExpiringSubscription, subscriptionView, type SubscriptionStatus } from './subscription-display';
import { hasAnyScope } from './entitlements';
import { daysUntil, tashkentDateKey } from './date';

// Header, Sidebar, bannerlar va CTA ko'radigan obuna holati. Bitta joyda:
// `/api/me/header` (yangi klientlar) va eski `/api/subscription/status`
// (o'chirilguncha ochiq tablar uchun) aynan bir xil javob bersin.
export async function loadSubscriptionStatusFor(userId: string, now: Date): Promise<SubscriptionStatus> {
  const [rows, permissions] = await Promise.all([
    loadSubscriptionRows([userId], now, true),
    db.userPermission.findMany({ where: { userId, isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
      select: { categoryId: true, subjectId: true, isActive: true, expiresAt: true } }),
  ]);
  const subscriptions = currentSubscriptions(rows, now);
  const hasPremium = subscriptions.some((s) => s.plan === 'PREMIUM');
  const hasTeacher = subscriptions.some((s) => s.plan === 'TEACHER_PLAN');
  // Eski bayroqlar eski ma'nosini saqlaydi; CATEGORY umumiy Premium emas.
  const plan = hasPremium && hasTeacher ? 'PREMIUM_TEACHER' : hasPremium ? 'PREMIUM' : hasTeacher ? 'TEACHER_PLAN'
    : subscriptions.some((s) => s.plan === 'BUNDLE') ? 'BUNDLE' : subscriptions.length ? 'CATEGORY' : 'FREE';
  return {
    plan, subscriptions: subscriptions.map(subscriptionView), hasPremium, hasTeacher,
    hasAnyScope: hasAnyScope({ now, subscriptions, permissions }),
    daysUntilExpiry: subscriptions[0] ? daysUntil(tashkentDateKey(subscriptions[0].endDate), now) : null,
    expiringSubscription: nearestExpiringSubscription(rows, now),
  };
}
