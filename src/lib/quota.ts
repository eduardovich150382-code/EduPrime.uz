import type { Prisma } from '@prisma/client';
import { db } from './db';
import { hasActiveSubscription } from './access';
import { tashkentDateKey } from './date';

/**
 * Bepul foydalanuvchi uchun kunlik cheklovlar (S17). Kun — Tashkent
 * kalendar kuni (lib/date.ts#tashkentDateKey), UTC emas — soat 05:00
 * gacha (UTC+5) bo'lgan harakatlar "kechagi kun"ga yozilib qolmasligi
 * uchun. Premium/Teacher obunachi va ADMIN uchun cheklov yo'q.
 */
export const FREE_DAILY_BUILT_TESTS = 3;
export const FREE_DAILY_SOLUTIONS = 10;
export const FREE_DAILY_AI_EXPLAIN = 3;

/** `DailyUsage.date` (`@db.Date`) ustuniga yoziladigan qiymat — Postgres
 * faqat sana qismini saqlaydi, vaqt qismi e'tiborga olinmaydi, shuning
 * uchun har doim kun boshi (UTC yarim tun) ishlatiladi. */
function dailyUsageDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

/** ADMIN yoki faol PREMIUM/TEACHER_PLAN obunachi — kvota cheklovi yo'q. */
async function isUnlimited(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role === 'ADMIN') return true;
  const { premium, teacher } = await hasActiveSubscription(userId);
  return premium || teacher;
}

type QuotaField = 'builtTests' | 'dtmOnline' | 'solutionsUnlocked' | 'tutorMessages';

/**
 * Bugungi hisoblagichni ATOMIK ravishda 1 taga oshiradi va yangi qiymatni
 * qaytaradi — o'qib-keyin-yozish (read-then-write) naqshi ATAYLAB
 * ishlatilmaydi: ikkita so'rov bir vaqtda kelsa, ikkalasi ham eski
 * qiymatni o'qib, bir xil "keyingi" qiymatni yozib qo'yishi (lost update)
 * mumkin edi — natijada haqiqatda 2 marta sarflangan bo'lsa ham hisoblagich
 * faqat 1 marta oshgan bo'lardi. `upsert` + Prisma'ning `increment`
 * operatori bitta atomik SQL bo'lib, Postgres qator darajasidagi qulf
 * orqali ikkala so'rovni ketma-ket qo'llaydi — shuning uchun har bir
 * chaqiruv o'ziga xos (hech qachon takrorlanmaydigan) natija qiymatini
 * oladi va limitni chinakam tekshirish mumkin bo'ladi.
 */
async function bumpDailyUsage(userId: string, dateKey: string, field: QuotaField): Promise<number> {
  const date = dailyUsageDate(dateKey);
  const update = { [field]: { increment: 1 } } as Prisma.DailyUsageUpdateInput;
  const create = { userId, date, [field]: 1 } as Prisma.DailyUsageUncheckedCreateInput;
  const row = await db.dailyUsage.upsert({
    where: { userId_date: { userId, date } },
    update,
    create,
  });
  return row[field];
}

export interface ConsumeQuotaResult {
  allowed: boolean;
  usedToday: number;
  /** `null` — cheklovsiz (premium/teacher/admin). */
  limit: number | null;
}

/**
 * Bepul foydalanuvchi uchun kuniga {@link FREE_DAILY_BUILT_TESTS} ta
 * konstruktor testi. Sessiya YARATILGANDA hisoblansin — tugatilganda emas
 * (`POST /api/sessions` shu funksiyani chaqiradi). Bilim xaritasi mashq
 * testlari bu funksiyani UMUMAN chaqirmaydi — shuning uchun ular kvotaga
 * kirmaydi (chaqiruvchi tomonidan hal qilinadi, bu yerda maxsus holat yo'q).
 */
export async function consumeBuiltTest(userId: string): Promise<ConsumeQuotaResult> {
  if (await isUnlimited(userId)) {
    return { allowed: true, usedToday: 0, limit: null };
  }
  const dateKey = tashkentDateKey();
  const used = await bumpDailyUsage(userId, dateKey, 'builtTests');
  if (used > FREE_DAILY_BUILT_TESTS) {
    // Rad etilgan urinish ham hisoblagichni oshirib qo'yganda, foydalanuvchi
    // tugmani qayta-qayta bossa `builtTests` haqiqiy sarflangan sondan
    // ancha oshib ketardi (refundBuiltTest esa faqat haqiqiy sessiyalar
    // uchun ishlaydi) — shu sababli rad etilgan urinishning o'zi darhol
    // qaytariladi, chunki bu chaqiruv baribir sessiya yaratmaydi.
    await db.dailyUsage.updateMany({
      where: { userId, date: dailyUsageDate(dateKey), builtTests: { gt: 0 } },
      data: { builtTests: { decrement: 1 } },
    });
    return { allowed: false, usedToday: FREE_DAILY_BUILT_TESTS, limit: FREE_DAILY_BUILT_TESTS };
  }
  return { allowed: true, usedToday: used, limit: FREE_DAILY_BUILT_TESTS };
}

// Sessiya boshlangandan keyin shu vaqt ICHIDA hech qanday javob
// topshirmasdan tashlab ketilsa, sarflangan kvota qaytariladi.
const REFUND_WINDOW_MS = 2 * 60 * 1000;

/**
 * `consumeBuiltTest` orqali sarflangan kvotani qaytaradi — faqat sessiya
 * boshlanganidan {@link REFUND_WINDOW_MS} ichida chaqirilsa. Chaqiruvchi
 * (`POST /api/sessions/[id]/submit`) buni FAQAT barcha javoblar bo'sh
 * bo'lgan holatda chaqiradi — bu marshrut `TestSession.submittedAt` orqali
 * allaqachon bir martalik bajarilishni kafolatlaydi (qayta topshirish 409
 * bilan rad etiladi), shuning uchun bu funksiyaning o'zi qo'shimcha
 * himoya (idempotentlik belgisi) talab qilmaydi.
 *
 * Sessiya topilmasa yoki oyna o'tib ketgan bo'lsa — jimgina hech narsa
 * qilmaydi (bu holatlar chaqiruvchi tomonidan allaqachon boshqa yo'l bilan
 * ishlov berilgan bo'ladi).
 */
export async function refundBuiltTest(sessionId: string): Promise<void> {
  const testSession = await db.testSession.findUnique({
    where: { id: sessionId },
    select: { userId: true, startedAt: true },
  });
  if (!testSession) return;
  if (Date.now() - testSession.startedAt.getTime() >= REFUND_WINDOW_MS) return;

  const date = dailyUsageDate(tashkentDateKey(testSession.startedAt));
  await db.dailyUsage.updateMany({
    where: { userId: testSession.userId, date, builtTests: { gt: 0 } },
    data: { builtTests: { decrement: 1 } },
  });
}

/**
 * Bepul foydalanuvchi uchun kuniga {@link FREE_DAILY_AI_EXPLAIN} ta yangi AI
 * tushuntirish (S19). Faqat YANGI generatsiya sarflaydi — keshdan
 * (`ItemExplanation`) qaytarilgan javob bu funksiyani UMUMAN chaqirmaydi
 * (chaqiruvchi — `POST /api/results/[id]/ai-explain` — avval keshni
 * tekshiradi). Premium/Teacher/ADMIN uchun cheklovsiz.
 */
export async function consumeTutorMessage(userId: string): Promise<ConsumeQuotaResult> {
  if (await isUnlimited(userId)) {
    return { allowed: true, usedToday: 0, limit: null };
  }
  const dateKey = tashkentDateKey();
  const used = await bumpDailyUsage(userId, dateKey, 'tutorMessages');
  if (used > FREE_DAILY_AI_EXPLAIN) {
    return { allowed: false, usedToday: FREE_DAILY_AI_EXPLAIN, limit: FREE_DAILY_AI_EXPLAIN };
  }
  return { allowed: true, usedToday: used, limit: FREE_DAILY_AI_EXPLAIN };
}

export interface ConsumeSolutionResult {
  allowed: boolean;
  /** Savol shu foydalanuvchi uchun avvaldan ochilgan edi (qayta hisoblanmadi). */
  alreadyUnlocked: boolean;
  usedToday: number;
  limit: number | null;
}

/**
 * Bitta savol (`itemId` — Question.id yoki Item.id) yechimini ochadi.
 * Allaqachon ochilgan savol (`SolutionUnlock` bor) kvotani QAYTA
 * sarflamaydi — avval shu tekshiriladi. Premium/Teacher/ADMIN uchun
 * cheklovsiz (baribir `SolutionUnlock` yoziladi — keyingi safar aynan shu
 * savol yana tekin/tez "allaqachon ochilgan" deb topilishi uchun, garchi
 * ularga bu ahamiyatsiz bo'lsa ham izchillik uchun).
 */
export async function consumeSolution(userId: string, itemId: string): Promise<ConsumeSolutionResult> {
  const existing = await db.solutionUnlock.findUnique({
    where: { userId_itemId: { userId, itemId } },
  });
  if (existing) {
    return { allowed: true, alreadyUnlocked: true, usedToday: 0, limit: FREE_DAILY_SOLUTIONS };
  }

  if (await isUnlimited(userId)) {
    await createSolutionUnlockIfMissing(userId, itemId);
    return { allowed: true, alreadyUnlocked: false, usedToday: 0, limit: null };
  }

  const dateKey = tashkentDateKey();
  const used = await bumpDailyUsage(userId, dateKey, 'solutionsUnlocked');
  if (used > FREE_DAILY_SOLUTIONS) {
    return { allowed: false, alreadyUnlocked: false, usedToday: FREE_DAILY_SOLUTIONS, limit: FREE_DAILY_SOLUTIONS };
  }

  const created = await createSolutionUnlockIfMissing(userId, itemId);
  if (!created) {
    // Poyga sharti: ikkinchi parallel so'rov shu yerga aynan bir xil
    // itemId bilan yetib keldi — SolutionUnlock allaqachon boshqa so'rov
    // tomonidan yaratilgan. Yuqorida sarflangan 1 kvotani qaytaramiz,
    // chunki bu chaqiruv haqiqatda yangi narsa ochmadi.
    await db.dailyUsage.updateMany({
      where: { userId, date: dailyUsageDate(dateKey), solutionsUnlocked: { gt: 0 } },
      data: { solutionsUnlocked: { decrement: 1 } },
    });
    return { allowed: true, alreadyUnlocked: true, usedToday: used - 1, limit: FREE_DAILY_SOLUTIONS };
  }

  return { allowed: true, alreadyUnlocked: false, usedToday: used, limit: FREE_DAILY_SOLUTIONS };
}

/** Prisma unique-constraint xatosini `instanceof` orqali emas, `.code`
 * orqali aniqlaydi — testda yengil (Prisma runtime klassiga bog'liq
 * bo'lmagan) fake xato bilan ham ishlaydi, productionda haqiqiy
 * `PrismaClientKnownRequestError` bilan ham. */
function isUniqueConstraintError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'P2002';
}

/** `true` — yangi yozuv yaratildi; `false` — parallel so'rov allaqachon yaratib ulgurgan (unique constraint). */
async function createSolutionUnlockIfMissing(userId: string, itemId: string): Promise<boolean> {
  try {
    await db.solutionUnlock.create({ data: { userId, itemId } });
    return true;
  } catch (err) {
    if (isUniqueConstraintError(err)) return false;
    throw err;
  }
}

/**
 * Bitta savol shu foydalanuvchi uchun allaqachon ochilgan-ochilmaganini
 * TEKSHIRADI, lekin kvota sarflamaydi va `SolutionUnlock` yozmaydi —
 * `POST /api/results/[id]/ai-explain` shu funksiyani chaqiradi: AI
 * tushuntirish yozma yechimning o'rnini bosuvchi bo'lgani uchun XUDDI SHU
 * qulfni talab qiladi, lekin uni ochish (`consumeSolution`) faqat
 * "Yechimni ochish" tugmasi orqali sodir bo'ladi — bu yerda ochish yo'q.
 */
export async function isSolutionUnlocked(userId: string, itemId: string): Promise<boolean> {
  const existing = await db.solutionUnlock.findUnique({
    where: { userId_itemId: { userId, itemId } },
  });
  if (existing) return true;
  return isUnlimited(userId);
}

/**
 * `SolutionUnlock.itemId` HAR DOIM Item.id bo'lishi kerak (sessiya tarmog'i
 * shunday yozadi) — lekin Test tarmog'idan keladigan eski `questionId`lar
 * `Question.id`. Ikkalasi turli manbadan kelib, bir xil jadvalga yozilsa,
 * bitta savol ikki xil kalit ostida IKKI MARTA ochilgan/kvota sarflangan
 * bo'lib qoladi (item-picker.ts#getRecentlyCorrectItemIds'dagi bilan bir
 * xil muammo, o'sha yerdagi bilan bir xil yechim): `questionId` Item'ga
 * ko'chirilgan bo'lsa (`legacyQuestionId`), uning Item.id'sini qaytaradi;
 * hali ko'chirilmagan bo'lsa (backfill qilinmagan eski savol) — berilgan
 * id bilan davom etiladi, Item paydo bo'lgach keyingi chaqiruv avtomatik
 * to'g'ri kalitga o'tadi. Sessiya tarmog'idagi itemId'lar uchun bu funksiya
 * zararsiz — `legacyQuestionId` bo'yicha hech narsa topilmay, o'zi qaytadi.
 *
 * `consumeSolution`/`isSolutionUnlocked`ga berilgan HAR BIR yozish/o'qish
 * shu orqali o'tishi shart (unlock-solution, ai-explain, GET /api/results/[id]).
 */
export async function resolveUnlockKey(questionId: string): Promise<string> {
  const item = await db.item.findUnique({
    where: { legacyQuestionId: questionId },
    select: { id: true },
  });
  return item?.id ?? questionId;
}

/** {@link resolveUnlockKey}ning ko'p id uchun bitta so'rovda ishlaydigan versiyasi — GET /api/results/[id] har bir savol uchun alohida so'rov yubormasin. */
export async function resolveUnlockKeys(questionIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (questionIds.length === 0) return map;
  const items = await db.item.findMany({
    where: { legacyQuestionId: { in: questionIds } },
    select: { id: true, legacyQuestionId: true },
  });
  const byLegacy = new Map(items.map((it) => [it.legacyQuestionId as string, it.id]));
  for (const qid of questionIds) {
    map.set(qid, byLegacy.get(qid) ?? qid);
  }
  return map;
}

/** Berilgan `itemId`larning qaysilari shu foydalanuvchi uchun allaqachon ochilganini qaytaradi. */
export async function getUnlockedItemIds(userId: string, itemIds: string[]): Promise<Set<string>> {
  if (itemIds.length === 0) return new Set();
  const rows = await db.solutionUnlock.findMany({
    where: { userId, itemId: { in: itemIds } },
    select: { itemId: true },
  });
  return new Set(rows.map((r) => r.itemId));
}

export interface SolutionQuotaStatus {
  usedToday: number;
  /** `null` — cheklovsiz (premium/teacher/admin). */
  limit: number | null;
}

/** Natijalar sahifasidagi "Bugun N/10 bepul yechim qoldi" hisoblagichi uchun — kvotani sarflamaydi. */
export async function getSolutionQuotaStatus(userId: string): Promise<SolutionQuotaStatus> {
  if (await isUnlimited(userId)) return { usedToday: 0, limit: null };
  const date = dailyUsageDate(tashkentDateKey());
  const row = await db.dailyUsage.findUnique({
    where: { userId_date: { userId, date } },
    select: { solutionsUnlocked: true },
  });
  return { usedToday: Math.min(row?.solutionsUnlocked ?? 0, FREE_DAILY_SOLUTIONS), limit: FREE_DAILY_SOLUTIONS };
}
