import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * check-access endi checkTestAccess'ga tayanadi. Avvalgi nusxa Purchase'ni
 * tekshirmas edi — Purchase orqali sotib olganlar "Test yopiq" ko'rardi.
 * Bu yerda lib/access.ts mock qilinmaydi: haqiqiy qaror fake baza ustida
 * tekshiriladi, aks holda test faqat o'zini tasdiqlaydi.
 */
interface FakeState {
  role: string;
  subscriptions: { userId: string; isActive: boolean; endDate: Date; plan: string; categoryId?: string; subjectIds?: string[]; product?: { subjectRule: string } }[];
  purchases: { userId: string; itemType: string; itemId: string }[];
  payments: { userId: string; status: string; selectedSubjects: string[] }[];
  // Nashr etilgan kursdagi QUIZ darslari soni (lib/test-visibility.ts)
  publishedCourseLessons: number;
}

const state: FakeState = { role: "USER", subscriptions: [], purchases: [], payments: [], publishedCourseLessons: 0 };

interface FakeTest {
  categoryId: string;
  subjectId: string;
  id: string;
  isFree: boolean;
  accessType: string;
  price: number;
  titleUz: string;
  isPublished: boolean;
  userId: string | null;
  teacher: { userId: string } | null;
}

const PAID_TEST: FakeTest = { categoryId: "att", subjectId: "physics", id: "t1", isFree: false, accessType: "paid", price: 15000, titleUz: "Kinematika", isPublished: true, userId: null, teacher: null };
let currentTest: FakeTest | null = PAID_TEST;

vi.mock("@/lib/db", () => ({
  db: {
    test: { findUnique: async ({ select }: { select: Record<string, unknown> }) => currentTest && Object.fromEntries(Object.entries(currentTest).filter(([key]) => select[key])) },
    testCategory: { findMany: async () => [{ id: "att", type: "ATTESTATION" }, { id: "dtm", type: "DTM" }] },
    user: { findUnique: async () => ({ role: state.role }) },
    courseLesson: { count: async () => state.publishedCourseLessons },
    lessonBlock: { count: async () => 0 },
    userPermission: { findMany: async () => [] },
    subscription: {
      findMany: async ({ where }: { where: { userId: string; isActive: boolean; endDate: { gte: Date } } }) =>
        state.subscriptions
          .filter((s) => s.userId === where.userId && s.isActive === where.isActive)
          .filter((s) => s.endDate.getTime() >= where.endDate.gte.getTime())
          .map((s) => ({ categoryId: null, subjectIds: [], product: null, ...s })),
    },
    purchase: {
      findUnique: async ({ where }: { where: { userId_itemType_itemId: { userId: string; itemType: string; itemId: string } } }) => {
        const k = where.userId_itemType_itemId;
        return state.purchases.find((p) => p.userId === k.userId && p.itemType === k.itemType && p.itemId === k.itemId) ?? null;
      },
    },
    payment: {
      findFirst: async ({ where }: { where: { userId: string; status: string; selectedSubjects: { has: string } } }) =>
        state.payments.find(
          (p) => p.userId === where.userId && p.status === where.status && p.selectedSubjects.includes(where.selectedSubjects.has),
        ) ?? null,
    },
  },
}));

vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "u1" } }) }));

import { NextRequest } from "next/server";
import { GET } from "../route";

async function check() {
  const response = await GET(new NextRequest("http://localhost/api/subscription/check-access?testId=t1"));
  return { status: response.status, data: await response.json() };
}

const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

beforeEach(() => {
  state.role = "USER";
  state.subscriptions = [];
  state.purchases = [];
  state.payments = [];
  state.publishedCourseLessons = 0;
  currentTest = PAID_TEST;
});

describe("GET /api/subscription/check-access — qoralama test", () => {
  const DRAFT: FakeTest = { ...PAID_TEST, isPublished: false, teacher: { userId: "teacher-user" } };

  it("begona foydalanuvchi — 404, sarlavha oshkor bo'lmaydi", async () => {
    currentTest = DRAFT;
    const { status, data } = await check();
    expect(status).toBe(404);
    expect(data).not.toHaveProperty("testTitle");
  });

  it("nashr etilgan kursga ulangan qoralama — odatdagi paywall javobi", async () => {
    currentTest = DRAFT;
    state.publishedCourseLessons = 1;
    const { status, data } = await check();
    expect(status).toBe(200);
    expect(data).toEqual({ hasAccess: false, accessType: "paid", price: 15000, testTitle: "Kinematika" });
  });

  it("ega (Test.userId) — 404 emas", async () => {
    currentTest = { ...DRAFT, teacher: null, userId: "u1" };
    expect((await check()).status).toBe(200);
  });
});

describe("GET /api/subscription/check-access", () => {
  it("faqat eski Payment.selectedSubjects xaridi bilan — kiradi (avvalgidek)", async () => {
    state.payments.push({ userId: "u1", status: "CONFIRMED", selectedSubjects: ["t1"] });
    expect((await check()).data).toEqual({ hasAccess: true, reason: "purchased" });
  });

  it("faqat Purchase xaridi bilan — kiradi (avval rad etilardi)", async () => {
    state.purchases.push({ userId: "u1", itemType: "test", itemId: "t1" });
    expect((await check()).data).toEqual({ hasAccess: true, reason: "purchased" });
  });

  it("premium obunachi premium testga — kiradi", async () => {
    currentTest = { ...PAID_TEST, accessType: "premium" };
    state.subscriptions.push({ userId: "u1", isActive: true, endDate: future, plan: "PREMIUM" });
    expect((await check()).data).toEqual({ hasAccess: true, reason: "premium_subscription" });
  });

  it("ADMIN — kiradi", async () => {
    state.role = "ADMIN";
    expect((await check()).data).toEqual({ hasAccess: true, reason: "admin" });
  });

  it("huquqsiz foydalanuvchi — kirmaydi, ekran uchun accessType/narx/nom qaytadi", async () => {
    // Boshqa foydalanuvchining xaridi va tasdiqlanmagan to'lov hisobga olinmaydi.
    state.purchases.push({ userId: "u2", itemType: "test", itemId: "t1" });
    state.payments.push({ userId: "u1", status: "PENDING", selectedSubjects: ["t1"] });
    expect((await check()).data).toEqual({
      hasAccess: false,
      accessType: "paid",
      price: 15000,
      testTitle: "Kinematika",
    });
  });

  it("bepul test — kiradi (avvalgidek)", async () => {
    currentTest = { ...PAID_TEST, isFree: true, accessType: "free" };
    expect((await check()).data).toEqual({ hasAccess: true, reason: "free" });
  });
});


describe("check-access — kengaytirilgan select va yangi huquqlar", () => {
  it.each([
    ["TEACHER_PLAN", "att", true], ["TEACHER_PLAN", "dtm", false],
    ["PREMIUM", "att", false], ["PREMIUM", "dtm", true],
  ] as const)("%s, subscription kategoriya=%s → %s", async (plan, categoryId, expected) => {
    currentTest = { ...PAID_TEST, categoryId, accessType: "subscription" };
    state.subscriptions.push({ userId: "u1", plan: String(plan), isActive: true, endDate: future });
    const result = await check();
    expect(result.status).toBe(200);
    expect(result.data.hasAccess).toBe(expected);
    if (expected) expect(result.data.reason).toBe("subscription");
  });

  it("CATEGORY ONE: paid mock uchun categoryId va subjectId select qilinadi", async () => {
    state.subscriptions.push({ userId: "u1", plan: "CATEGORY", categoryId: "att", subjectIds: ["physics"], product: { subjectRule: "ONE" }, isActive: true, endDate: future });
    expect((await check()).data.hasAccess).toBe(true);
    currentTest = { ...PAID_TEST, subjectId: "math" };
    expect((await check()).data.hasAccess).toBe(false);
    currentTest = { ...PAID_TEST, categoryId: "dtm" };
    expect((await check()).data.hasAccess).toBe(false);
  });
});
