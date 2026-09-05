import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkCourseAccess, checkTestAccess, hasActiveSubscription, isLessonFreelyPreviewable } from "../access";

/**
 * `db` (Prisma) ni mock qilamiz — baza kerak emas. Fake implementatsiyalar
 * haqiqiy access.ts'dagi `where` shartlarini o'zi qayta talqin qiladi (masalan
 * `endDate: { gte: now }`), shu bilan "muddati o'tgan obuna o'tmaydi" kabi
 * holatlarni ham real so'rov mantig'iga mos ravishda tekshiramiz.
 *
 * `vi.mock` va `vi.hoisted` chaqiruvlari vitest tomonidan faylning eng
 * boshiga avtomatik ko'chiriladi — shuning uchun yuqoridagi `../access`
 * importi baribir shu mock'langan `db` bilan ishlaydi.
 */
const { findFirstMock, findManyMock, purchaseFindUniqueMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  findManyMock: vi.fn(),
  purchaseFindUniqueMock: vi.fn(),
}));

vi.mock("../db", () => ({
  db: {
    payment: { findFirst: (...args: unknown[]) => findFirstMock(...args) },
    subscription: { findMany: (...args: unknown[]) => findManyMock(...args) },
    purchase: { findUnique: (...args: unknown[]) => purchaseFindUniqueMock(...args) },
  },
}));

interface FakeSubscription {
  userId: string;
  isActive: boolean;
  endDate: Date;
  plan: string;
}

interface FakePayment {
  userId: string;
  status: string;
  selectedSubjects: string[];
}

interface SubscriptionWhereArgs {
  where: { userId: string; isActive: boolean; endDate: { gte: Date } };
}

interface PaymentWhereArgs {
  where: { userId: string; status: string; selectedSubjects: { has: string } };
}

interface FakePurchase {
  userId: string;
  itemType: string;
  itemId: string;
}

interface PurchaseWhereArgs {
  where: { userId_itemType_itemId: { userId: string; itemType: string; itemId: string } };
}

function setSubscriptions(subscriptions: FakeSubscription[]) {
  findManyMock.mockImplementation(async (args: SubscriptionWhereArgs) => {
    return subscriptions
      .filter((s) => s.userId === args.where.userId)
      .filter((s) => s.isActive === args.where.isActive)
      .filter((s) => s.endDate.getTime() >= args.where.endDate.gte.getTime())
      .map((s) => ({ plan: s.plan }));
  });
}

function setPayments(payments: FakePayment[]) {
  findFirstMock.mockImplementation(async (args: PaymentWhereArgs) => {
    const match = payments.find(
      (p) =>
        p.userId === args.where.userId &&
        p.status === args.where.status &&
        p.selectedSubjects.includes(args.where.selectedSubjects.has)
    );
    return match ?? null;
  });
}

function setPurchases(purchases: FakePurchase[]) {
  purchaseFindUniqueMock.mockImplementation(async (args: PurchaseWhereArgs) => {
    const key = args.where.userId_itemType_itemId;
    const match = purchases.find(
      (p) => p.userId === key.userId && p.itemType === key.itemType && p.itemId === key.itemId
    );
    return match ?? null;
  });
}

const farFuture = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
const farPast = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);

beforeEach(() => {
  findFirstMock.mockReset();
  findManyMock.mockReset();
  purchaseFindUniqueMock.mockReset();
  setSubscriptions([]);
  setPayments([]);
  setPurchases([]);
});

describe("checkTestAccess", () => {
  it("ADMIN har doim o'tadi — obuna tekshirilmaydi ham", async () => {
    const result = await checkTestAccess("user-1", { id: "t1", accessType: "premium" }, "ADMIN");
    expect(result).toBe(true);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("premium accessType, faol PREMIUM obuna bilan o'tadi", async () => {
    setSubscriptions([{ userId: "user-1", isActive: true, endDate: farFuture, plan: "PREMIUM" }]);
    const result = await checkTestAccess("user-1", { id: "t1", accessType: "premium" }, "STUDENT");
    expect(result).toBe(true);
  });

  it("premium accessType, obuna yo'q bo'lsa o'tmaydi", async () => {
    const result = await checkTestAccess("user-1", { id: "t1", accessType: "premium" }, "STUDENT");
    expect(result).toBe(false);
  });

  it("premium accessType, muddati o'tgan obuna bo'lsa o'tmaydi", async () => {
    setSubscriptions([{ userId: "user-1", isActive: true, endDate: farPast, plan: "PREMIUM" }]);
    const result = await checkTestAccess("user-1", { id: "t1", accessType: "premium" }, "STUDENT");
    expect(result).toBe(false);
  });

  it("teacher accessType, faol TEACHER_PLAN obuna bilan o'tadi", async () => {
    setSubscriptions([{ userId: "user-1", isActive: true, endDate: farFuture, plan: "TEACHER_PLAN" }]);
    const result = await checkTestAccess("user-1", { id: "t1", accessType: "teacher" }, "STUDENT");
    expect(result).toBe(true);
  });

  it("teacher accessType, faqat PREMIUM obuna bo'lsa o'tmaydi", async () => {
    setSubscriptions([{ userId: "user-1", isActive: true, endDate: farFuture, plan: "PREMIUM" }]);
    const result = await checkTestAccess("user-1", { id: "t1", accessType: "teacher" }, "STUDENT");
    expect(result).toBe(false);
  });

  it("premium_teacher accessType, ikkalasidan biri bilan ham o'tadi", async () => {
    setSubscriptions([{ userId: "user-1", isActive: true, endDate: farFuture, plan: "PREMIUM" }]);
    expect(
      await checkTestAccess("user-1", { id: "t1", accessType: "premium_teacher" }, "STUDENT")
    ).toBe(true);

    setSubscriptions([{ userId: "user-1", isActive: true, endDate: farFuture, plan: "TEACHER_PLAN" }]);
    expect(
      await checkTestAccess("user-1", { id: "t1", accessType: "premium_teacher" }, "STUDENT")
    ).toBe(true);
  });

  it("paid accessType, shu testga CONFIRMED to'lov bilan o'tadi (legacy selectedSubjects)", async () => {
    setPayments([{ userId: "user-1", status: "CONFIRMED", selectedSubjects: ["t1"] }]);
    const result = await checkTestAccess("user-1", { id: "t1", accessType: "paid" }, "STUDENT");
    expect(result).toBe(true);
  });

  it("paid accessType, mos to'lov bo'lmasa o'tmaydi", async () => {
    setPayments([{ userId: "user-1", status: "CONFIRMED", selectedSubjects: ["boshqa-test"] }]);
    const result = await checkTestAccess("user-1", { id: "t1", accessType: "paid" }, "STUDENT");
    expect(result).toBe(false);
  });

  it("paid accessType, to'lov CONFIRMED bo'lmasa (masalan PENDING) o'tmaydi", async () => {
    setPayments([{ userId: "user-1", status: "PENDING", selectedSubjects: ["t1"] }]);
    const result = await checkTestAccess("user-1", { id: "t1", accessType: "paid" }, "STUDENT");
    expect(result).toBe(false);
  });

  it("paid accessType, Purchase yozuvi bo'lsa (selectedSubjects bo'lmasa ham) o'tadi — Payment'ga umuman murojaat qilinmaydi", async () => {
    setPurchases([{ userId: "user-1", itemType: "test", itemId: "t1" }]);
    setPayments([]);
    const result = await checkTestAccess("user-1", { id: "t1", accessType: "paid" }, "STUDENT");
    expect(result).toBe(true);
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("paid accessType, Purchase ham, legacy selectedSubjects ham yo'q bo'lsa o'tmaydi", async () => {
    setPurchases([]);
    setPayments([]);
    const result = await checkTestAccess("user-1", { id: "t1", accessType: "paid" }, "STUDENT");
    expect(result).toBe(false);
  });

  it("paid accessType, boshqa foydalanuvchining Purchase'i ruxsat bermaydi", async () => {
    setPurchases([{ userId: "user-2", itemType: "test", itemId: "t1" }]);
    setPayments([]);
    const result = await checkTestAccess("user-1", { id: "t1", accessType: "paid" }, "STUDENT");
    expect(result).toBe(false);
  });
});

describe("checkCourseAccess", () => {
  it("ADMIN har doim o'tadi", async () => {
    const result = await checkCourseAccess("user-1", { id: "c1", accessType: "paid" }, "ADMIN");
    expect(result).toBe(true);
  });

  it("premium accessType, faol obuna bilan o'tadi, obunasiz o'tmaydi", async () => {
    setSubscriptions([{ userId: "user-1", isActive: true, endDate: farFuture, plan: "PREMIUM" }]);
    expect(await checkCourseAccess("user-1", { id: "c1", accessType: "premium" }, "STUDENT")).toBe(true);

    setSubscriptions([]);
    expect(await checkCourseAccess("user-1", { id: "c1", accessType: "premium" }, "STUDENT")).toBe(false);
  });

  it("paid accessType, shu kursga CONFIRMED to'lov bilan o'tadi (legacy selectedSubjects)", async () => {
    setPayments([{ userId: "user-1", status: "CONFIRMED", selectedSubjects: ["c1"] }]);
    const result = await checkCourseAccess("user-1", { id: "c1", accessType: "paid" }, "STUDENT");
    expect(result).toBe(true);
  });

  it("paid accessType, Purchase yozuvi bo'lsa o'tadi — Payment'ga murojaat qilinmaydi", async () => {
    setPurchases([{ userId: "user-1", itemType: "course", itemId: "c1" }]);
    setPayments([]);
    const result = await checkCourseAccess("user-1", { id: "c1", accessType: "paid" }, "STUDENT");
    expect(result).toBe(true);
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("paid accessType, Purchase ham, legacy selectedSubjects ham yo'q bo'lsa o'tmaydi", async () => {
    setPurchases([]);
    setPayments([]);
    const result = await checkCourseAccess("user-1", { id: "c1", accessType: "paid" }, "STUDENT");
    expect(result).toBe(false);
  });
});

describe("isLessonFreelyPreviewable (S25 — birinchi dars har doim bepul)", () => {
  it("birinchi dars — isPreviewable=false bo'lsa ham true qaytaradi", () => {
    expect(isLessonFreelyPreviewable({ id: "lesson1", isPreviewable: false }, "lesson1")).toBe(true);
  });

  it("ikkinchi dars — isPreviewable=false bo'lsa false qaytaradi", () => {
    expect(isLessonFreelyPreviewable({ id: "lesson2", isPreviewable: false }, "lesson1")).toBe(false);
  });

  it("ikkinchi dars — o'qituvchi isPreviewable=true qilib belgilagan bo'lsa true qaytaradi", () => {
    expect(isLessonFreelyPreviewable({ id: "lesson2", isPreviewable: true }, "lesson1")).toBe(true);
  });

  it("firstLessonId aniqlanmagan bo'lsa (bo'sh kurs) hech qanday darsni majburan ochmaydi", () => {
    expect(isLessonFreelyPreviewable({ id: "lesson1", isPreviewable: false }, undefined)).toBe(false);
  });
});

describe("hasActiveSubscription", () => {
  it("hech qanday faol obuna bo'lmasa ikkalasi ham false", async () => {
    const result = await hasActiveSubscription("user-1");
    expect(result).toEqual({ premium: false, teacher: false });
  });

  it("bir vaqtda ham PREMIUM, ham TEACHER_PLAN faol bo'lishi mumkin", async () => {
    setSubscriptions([
      { userId: "user-1", isActive: true, endDate: farFuture, plan: "PREMIUM" },
      { userId: "user-1", isActive: true, endDate: farFuture, plan: "TEACHER_PLAN" },
    ]);
    const result = await hasActiveSubscription("user-1");
    expect(result).toEqual({ premium: true, teacher: true });
  });
});
