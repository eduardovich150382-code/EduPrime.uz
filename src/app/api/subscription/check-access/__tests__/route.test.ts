import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * check-access endi checkTestAccess'ga tayanadi. Avvalgi nusxa Purchase'ni
 * tekshirmas edi — Purchase orqali sotib olganlar "Test yopiq" ko'rardi.
 * Bu yerda lib/access.ts mock qilinmaydi: haqiqiy qaror fake baza ustida
 * tekshiriladi, aks holda test faqat o'zini tasdiqlaydi.
 */
interface FakeState {
  role: string;
  subscriptions: { userId: string; isActive: boolean; endDate: Date; plan: string }[];
  purchases: { userId: string; itemType: string; itemId: string }[];
  payments: { userId: string; status: string; selectedSubjects: string[] }[];
}

const state: FakeState = { role: "USER", subscriptions: [], purchases: [], payments: [] };

const PAID_TEST = { id: "t1", isFree: false, accessType: "paid", price: 15000, titleUz: "Kinematika" };
let currentTest: typeof PAID_TEST | null = PAID_TEST;

vi.mock("@/lib/db", () => ({
  db: {
    test: { findUnique: async () => currentTest },
    user: { findUnique: async () => ({ role: state.role }) },
    subscription: {
      findMany: async ({ where }: { where: { userId: string; isActive: boolean; endDate: { gte: Date } } }) =>
        state.subscriptions
          .filter((s) => s.userId === where.userId && s.isActive === where.isActive)
          .filter((s) => s.endDate.getTime() >= where.endDate.gte.getTime())
          .map((s) => ({ plan: s.plan })),
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
  currentTest = PAID_TEST;
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
