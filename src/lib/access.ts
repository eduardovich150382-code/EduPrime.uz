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
 * Ro'yxat (GET /api/tests) uchun foydalanuvchining kirish ma'lumoti —
 * sahifadagi har test uchun checkTestAccess chaqirilsa 20 ta test = 40+
 * so'rov (N+1) bo'lardi. Shuning uchun ma'lumot bir marta yuklanadi va
 * qaror xotirada, resolveTestAccess bilan chiqariladi.
 *
 * UserPermission ataylab yo'q: checkTestAccess uni o'qimaydi. Bu yerda
 * o'qilsa karta "ochiq" deydi, solve va savollar endpointi esa rad etadi.
 */
export interface TestAccessContext {
  isAdmin: boolean;
  premium: boolean;
  teacher: boolean;
  // Purchase va eski Payment.selectedSubjects xaridlari birlashmasi.
  purchasedTestIds: ReadonlySet<string>;
}

export interface TestAccessInfo {
  id: string;
  isFree: boolean;
  accessType: string;
}

function isFreeTest(test: TestAccessInfo): boolean {
  return test.isFree || test.accessType === 'free';
}

/**
 * checkTestAccess bilan bir xil qaror, faqat sof. Farqi bitta: bepul testga
 * true — checkTestAccess'da bepul tekshiruv chaqiruvchida (GET /api/tests/[id]).
 * `ctx === null` — tizimga kirmagan foydalanuvchi.
 */
export function resolveTestAccess(test: TestAccessInfo, ctx: TestAccessContext | null): boolean {
  if (isFreeTest(test)) return true;
  if (!ctx) return false;
  if (ctx.isAdmin) return true;
  if (test.accessType === 'premium' && ctx.premium) return true;
  if (test.accessType === 'teacher' && ctx.teacher) return true;
  if (test.accessType === 'premium_teacher' && (ctx.premium || ctx.teacher)) return true;
  if (test.accessType === 'paid' && ctx.purchasedTestIds.has(test.id)) return true;
  return false;
}

const SUBSCRIPTION_ACCESS_TYPES = new Set(['premium', 'teacher', 'premium_teacher']);

/**
 * Sahifadagi testlar uchun kontekst — testlar sonidan qat'i nazar ko'pi
 * bilan 3 so'rov. Kerak bo'lmagan so'rov umuman bajarilmaydi: ADMIN'ga
 * hech biri, obunali test bo'lmasa — obuna, pullik test bo'lmasa — xarid.
 */
export async function loadTestAccessContext(
  userId: string,
  role: string | undefined,
  tests: TestAccessInfo[]
): Promise<TestAccessContext> {
  const isAdmin = role === 'ADMIN';
  const locked = isAdmin ? [] : tests.filter((t) => !isFreeTest(t));
  const needsSubscription = locked.some((t) => SUBSCRIPTION_ACCESS_TYPES.has(t.accessType));
  const paidIds = locked.filter((t) => t.accessType === 'paid').map((t) => t.id);

  const [subscription, purchases, legacyPayments] = await Promise.all([
    needsSubscription ? hasActiveSubscription(userId) : { premium: false, teacher: false },
    paidIds.length > 0
      ? db.purchase.findMany({
          where: { userId, itemType: 'test', itemId: { in: paidIds } },
          select: { itemId: true },
        })
      : [],
    // checkTestAccess'dagi zaxira bilan bir xil sabab — Purchase backfill.
    paidIds.length > 0
      ? db.payment.findMany({
          where: { userId, status: 'CONFIRMED', selectedSubjects: { hasSome: paidIds } },
          select: { selectedSubjects: true },
        })
      : [],
  ]);

  const purchasedTestIds = new Set(purchases.map((p) => p.itemId));
  // selectedSubjects'da fan id'lari ham aralashgan — faqat sahifadagi
  // pullik testlarnikini olamiz.
  const paidIdSet = new Set(paidIds);
  for (const payment of legacyPayments) {
    for (const id of payment.selectedSubjects) {
      if (paidIdSet.has(id)) purchasedTestIds.add(id);
    }
  }

  return { isAdmin, ...subscription, purchasedTestIds };
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
