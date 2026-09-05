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
    const purchase = await db.purchase.findUnique({
      where: { userId_itemType_itemId: { userId, itemType: 'test', itemId: test.id } },
    });
    if (purchase) return true;

    // Zaxira: Purchase backfill prod'da bajarilmaguncha, backfill'dan oldingi
    // xaridlar hali `Payment.selectedSubjects`da yotibdi — shu yerda ham
    // tekshiramiz, ikkalasidan biri topilsa ruxsat beriladi.
    const legacyPurchase = await db.payment.findFirst({
      where: { userId, status: 'CONFIRMED', selectedSubjects: { has: test.id } },
    });
    if (legacyPurchase) return true;
  }

  return false;
}

/**
 * Same shape as checkTestAccess, for Course. Kept as a separate function
 * (rather than a generic helper) because Test and Course are different
 * Prisma models — duplicating this ~10-line check is cheaper than forcing a
 * shared generic type through two unrelated tables.
 */
export async function checkCourseAccess(
  userId: string,
  course: { id: string; accessType: string },
  role: string | undefined
): Promise<boolean> {
  if (role === 'ADMIN') return true;

  const { premium, teacher } = await hasActiveSubscription(userId);

  if (course.accessType === 'premium' && premium) return true;
  if (course.accessType === 'teacher' && teacher) return true;
  if (course.accessType === 'premium_teacher' && (premium || teacher)) return true;

  if (course.accessType === 'paid') {
    const purchase = await db.purchase.findUnique({
      where: { userId_itemType_itemId: { userId, itemType: 'course', itemId: course.id } },
    });
    if (purchase) return true;

    // Zaxira: checkTestAccess bilan bir xil sabab — yuqoridagi izohga qarang.
    const legacyPurchase = await db.payment.findFirst({
      where: { userId, status: 'CONFIRMED', selectedSubjects: { has: course.id } },
    });
    if (legacyPurchase) return true;
  }

  return false;
}

/**
 * S25 — kurs sotuv sahifasida ishonch hosil qilish uchun: har bir kursning
 * BIRINCHI darsi (bo'limlar tartibi bo'yicha global birinchi) sotib olmasdan
 * to'liq ochiq bo'lishi kerak — o'qituvchi uni alohida isPreviewable qilib
 * belgilamagan bo'lsa ham. Ikkinchi va undan keyingi darslar faqat
 * isPreviewable=true bo'lsagina ochiladi. `checkCourseAccess`dan FARQLI —
 * bu yerda "kursga umuman kirish huquqi bormi" emas, balki "sotib olmasdan
 * qaysi bitta dars ko'rinadi" hal qilinadi (GET /api/courses/[id] ochiq
 * preview endpointida ishlatiladi). course-lock.ts dagi sequentialUnlock
 * (yozilgandan KEYINGI qulflash) bilan aralashtirilmasin — bu butunlay
 * boshqa, oldindan ko'rish bosqichi.
 */
export function isLessonFreelyPreviewable(
  lesson: { id: string; isPreviewable: boolean },
  firstLessonId: string | undefined
): boolean {
  return lesson.isPreviewable || (firstLessonId !== undefined && lesson.id === firstLessonId);
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
