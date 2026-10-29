import { db } from './db';
import { loadSubscriptionDetails, loadSubscriptionRows, type DetailedEntitlements } from './subscription-details';
import { canAccessByEntitlements, isFreeTest, type TestAccessContext, type TestAccessInfo, type UserEntitlements } from './entitlements';
import { hasBundle, hasLegacyPlan, inScope, withoutLegacyPlans } from './entitlements';
import { getAdFreeTestId, isAdFreeTest } from './ad-free-test';

export { canAccessByEntitlements, hasAnyActiveSubscription } from './entitlements';
export type { TestAccessContext, TestAccessInfo, UserEntitlements } from './entitlements';

// Obunalar va ruxsatlar foydalanuvchi uchun bir martadan olinadi. Mahsulot
// sotuvdan olinsa ham oldin sotib olingan obuna huquqi saqlanadi.
export function loadUserEntitlements(userId: string, now: Date, mode: 'pricing'): Promise<DetailedEntitlements>;
export function loadUserEntitlements(userId: string, now?: Date): Promise<UserEntitlements>;
export async function loadUserEntitlements(userId: string, now = new Date(), mode?: 'pricing'): Promise<UserEntitlements> {
  if (mode === 'pricing') return loadSubscriptionDetails(userId, now);
  const [subscriptions, permissions] = await Promise.all([
    db.subscription.findMany({
      where: { userId, isActive: true, endDate: { gte: now } },
      select: {
        plan: true, categoryId: true, subjectIds: true, isActive: true, startDate: true, endDate: true,
        product: { select: { subjectRule: true } },
      },
    }),
    db.userPermission.findMany({
      where: userPermissionWhere(userId, now),
      select: { categoryId: true, subjectId: true, isActive: true, expiresAt: true },
    }),
  ]);
  return {
    now,
    subscriptions: subscriptions.map(({ product, ...s }) => ({ ...s, subjectRule: product?.subjectRule ?? null })),
    permissions,
  };
}

const userPermissionWhere = (userId: string, now: Date) => ({ userId, isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] });

// /me yo'llari bitta so'rovda ham kirish konteksti, ham pricing uchun obuna
// kerak qiladi — ikki marta yuklamaslik uchun bitta to'plamdan ikkalasi.
// To'plamlar boshqacha: access startDate'ni so'rovda filtrlamaydi (eski
// tariflarda u e'tiborsiz, isActiveEntitlement qaror qiladi), pricing esa
// faqat boshlanganlarini ko'rsatadi. Shu farq bu yerda JS'da saqlanadi.
// React `cache()` route handler'da so'rov doirasida ishlamaydi — shuning
// uchun natija qo'lda uzatiladi.
export async function loadPersonalEntitlements(userId: string, now = new Date()): Promise<{
  access: UserEntitlements; pricing: DetailedEntitlements;
}> {
  const [rows, permissions] = await Promise.all([
    loadSubscriptionRows([userId], now, true),
    db.userPermission.findMany({
      where: userPermissionWhere(userId, now),
      select: { categoryId: true, subjectId: true, isActive: true, expiresAt: true },
    }),
  ]);
  const current = rows.filter((s) => s.endDate >= now);
  return {
    access: { now, subscriptions: current, permissions },
    pricing: { now, permissions: [], subscriptions: current.filter((s) => s.startDate <= now) },
  };
}

// Doira metama'lumoti fanlar sonidan qat'i nazar bitta so'rovda olinadi.
// Eski tarif yonidagi yangi obuna videoni ham ochishi mumkin; bunday
// aralash holatda discipline metama'lumotini tashlab ketmaymiz.
export async function loadFeatureEntitlements(userId: string, role?: string): Promise<UserEntitlements> {
  const userRole = role ?? (await db.user.findUnique({ where: { id: userId }, select: { role: true } }))?.role;
  if (userRole === 'ADMIN') return { now: new Date(), subscriptions: [], permissions: [], isAdmin: true };
  const ent = await loadUserEntitlements(userId);
  if (hasBundle(ent)) return ent;
  const categoryIds = [...new Set([
    ...ent.subscriptions.filter((s) => s.plan === 'CATEGORY' && s.categoryId).map((s) => s.categoryId as string),
    ...ent.permissions.map((p) => p.categoryId),
  ])];
  if (!categoryIds.length) return ent;
  const subjects = await db.subject.findMany({
    where: { categoryId: { in: categoryIds } },
    select: { id: true, categoryId: true, disciplineKey: true },
  });
  return { ...ent, subjects };
}

export async function checkTestAccess(
  userId: string | null | undefined,
  test: TestAccessInfo,
  role: string | undefined,
): Promise<boolean> {
  // Mehmon: faqat haqiqiy bepul test. Reklama testi ham login talab qiladi —
  // Mini App kiritadi, natija va attributsiya akkauntga yoziladi.
  if (!userId) return isFreeTest(test);
  // Reklama testi — obuna/ruxsat so'rovlarisiz (kesh), qo'nish yo'li yengil bo'lsin.
  if (await isAdFreeTest(test.id)) return true;
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
  /** Chaqiruvchi allaqachon yuklagan bo'lsa (`loadPersonalEntitlements`) — qayta so'ralmaydi. */
  entitlements?: UserEntitlements;
}

// Testlar sonidan qat'i nazar ko'pi bilan beshta so'rov: obuna, ruxsat,
// kategoriya turlari, Purchase va eski Payment. Bepul/ADMIN uchun so'rov yo'q.
export async function loadTestAccessContext(
  userId: string,
  role: string | undefined,
  tests: TestAccessInfo[],
  options: TestAccessOptions = {},
): Promise<TestAccessContext> {
  const { includePurchases = true, categoryTypes: knownCategoryTypes, entitlements } = options;
  const isAdmin = role === 'ADMIN';
  const locked = isAdmin ? [] : tests.filter((t) => !isFreeTest(t));
  const categoryIds = [...new Set(locked.filter((t) => t.accessType === 'subscription').map((t) => t.categoryId))];
  const paidIds = includePurchases ? locked.filter((t) => t.accessType === 'paid').map((t) => t.id) : [];
  const now = new Date();
  const [ent, categoryTypes, purchases, legacyPayments, adFreeTestId] = await Promise.all([
    locked.length ? (entitlements ?? loadUserEntitlements(userId, now)) : { now, subscriptions: [], permissions: [] },
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
    locked.length ? getAdFreeTestId() : null,
  ]);
  const purchasedTestIds = new Set(purchases.map((p) => p.itemId));
  const paidIdSet = new Set(paidIds);
  for (const payment of legacyPayments) {
    for (const id of payment.selectedSubjects) {
      if (paidIdSet.has(id)) purchasedTestIds.add(id);
    }
  }
  const promoTestIds = new Set(adFreeTestId ? [adFreeTestId] : []);
  return { ...ent, isAdmin, purchasedTestIds, categoryTypes, promoTestIds };
}

/**
 * Same shape as checkTestAccess, for Course. Kept as a separate function
 * (rather than a generic helper) because Test and Course are different
 * Prisma models — duplicating this ~10-line check is cheaper than forcing a
 * shared generic type through two unrelated tables.
 */
export async function checkCourseAccess(
  userId: string,
  course: { id: string; accessType: string; subjectId?: string },
  role: string | undefined
): Promise<boolean> {
  if (role === 'ADMIN') return true;

  const ent = await loadUserEntitlements(userId);
  const premium = hasLegacyPlan(ent, 'PREMIUM');
  const teacher = hasLegacyPlan(ent, 'TEACHER_PLAN');

  if (hasBundle(ent)) return true;
  if (course.accessType === 'premium' && premium) return true;
  if (course.accessType === 'teacher' && teacher) return true;
  if (course.accessType === 'premium_teacher' && (premium || teacher)) return true;
  if (['premium', 'teacher', 'premium_teacher', 'subscription'].includes(course.accessType) && course.subjectId) {
    const subject = await db.subject.findUnique({ where: { id: course.subjectId }, select: { categoryId: true } });
    if (subject && inScope(withoutLegacyPlans(ent), { categoryId: subject.categoryId, subjectId: course.subjectId })) return true;
  }

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
