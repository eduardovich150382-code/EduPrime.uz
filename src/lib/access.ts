import { db } from './db';
import { canAccessByEntitlements, isFreeTest, type TestAccessContext, type TestAccessInfo, type UserEntitlements } from './entitlements';

export { canAccessByEntitlements, hasAnyActiveSubscription } from './entitlements';
export type { TestAccessContext, TestAccessInfo, UserEntitlements } from './entitlements';

// Obunalar va ruxsatlar foydalanuvchi uchun bir martadan olinadi. Mahsulot
// sotuvdan olinsa ham oldin sotib olingan obuna huquqi saqlanadi.
export async function loadUserEntitlements(userId: string, now = new Date()): Promise<UserEntitlements> {
  const [subscriptions, permissions] = await Promise.all([
    db.subscription.findMany({
      where: { userId, isActive: true, endDate: { gte: now } },
      select: {
        plan: true, categoryId: true, subjectIds: true, isActive: true, endDate: true,
        product: { select: { subjectRule: true } },
      },
    }),
    db.userPermission.findMany({
      where: { userId, isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
      select: { categoryId: true, subjectId: true, isActive: true, expiresAt: true },
    }),
  ]);
  return {
    now,
    subscriptions: subscriptions.map(({ product, ...s }) => ({ ...s, subjectRule: product?.subjectRule ?? null })),
    permissions,
  };
}

export async function checkTestAccess(
  userId: string,
  test: TestAccessInfo,
  role: string | undefined,
): Promise<boolean> {
  const ctx = await loadTestAccessContext(userId, role, [test], { includePurchases: false });
  if (canAccessByEntitlements(test, ctx)) return true;
  if (test.accessType !== 'paid') return false;

  const purchase = await db.purchase.findUnique({
    where: { userId_itemType_itemId: { userId, itemType: 'test', itemId: test.id } },
  });
  if (!purchase) {
    // Backfill'dan oldingi xaridlar uchun mavjud zaxira yo'li saqlanadi.
    const legacy = await db.payment.findFirst({
      where: { userId, status: 'CONFIRMED', selectedSubjects: { has: test.id } },
    });
    if (!legacy) return false;
  }
  return canAccessByEntitlements(test, { ...ctx, purchasedTestIds: new Set([test.id]) });
}

export function resolveTestAccess(test: TestAccessInfo, ctx: TestAccessContext | null): boolean {
  return canAccessByEntitlements(test, ctx);
}

interface TestAccessOptions {
  includePurchases?: boolean;
  categoryTypes?: TestAccessContext['categoryTypes'] | Promise<TestAccessContext['categoryTypes']>;
}

// Testlar sonidan qat'i nazar ko'pi bilan beshta so'rov: obuna, ruxsat,
// kategoriya turlari, Purchase va eski Payment. Bepul/ADMIN uchun so'rov yo'q.
export async function loadTestAccessContext(
  userId: string,
  role: string | undefined,
  tests: TestAccessInfo[],
  options: TestAccessOptions = {},
): Promise<TestAccessContext> {
  const { includePurchases = true, categoryTypes: knownCategoryTypes } = options;
  const isAdmin = role === 'ADMIN';
  const locked = isAdmin ? [] : tests.filter((t) => !isFreeTest(t));
  const categoryIds = [...new Set(locked.filter((t) => t.accessType === 'subscription').map((t) => t.categoryId))];
  const paidIds = includePurchases ? locked.filter((t) => t.accessType === 'paid').map((t) => t.id) : [];
  const now = new Date();
  const [ent, categoryTypes, purchases, legacyPayments] = await Promise.all([
    locked.length ? loadUserEntitlements(userId, now) : { now, subscriptions: [], permissions: [] },
    knownCategoryTypes ?? (categoryIds.length
      ? db.testCategory.findMany({ where: { id: { in: categoryIds } }, select: { id: true, type: true } })
        .then((categories) => new Map(categories.map((c) => [c.id, c.type])))
      : new Map()),
    paidIds.length ? db.purchase.findMany({
      where: { userId, itemType: 'test', itemId: { in: paidIds } }, select: { itemId: true },
    }) : [],
    paidIds.length ? db.payment.findMany({
      where: { userId, status: 'CONFIRMED', selectedSubjects: { hasSome: paidIds } }, select: { selectedSubjects: true },
    }) : [],
  ]);
  const purchasedTestIds = new Set(purchases.map((p) => p.itemId));
  const paidIdSet = new Set(paidIds);
  for (const payment of legacyPayments) {
    for (const id of payment.selectedSubjects) {
      if (paidIdSet.has(id)) purchasedTestIds.add(id);
    }
  }
  return { ...ent, isAdmin, purchasedTestIds, categoryTypes };
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
