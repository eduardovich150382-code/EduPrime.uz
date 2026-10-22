import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkTestAccess, loadTestAccessContext, resolveTestAccess, type TestAccessInfo } from "../access";

/**
 * resolveTestAccess + loadTestAccessContext (ro'yxat uchun) checkTestAccess
 * (bitta test uchun) bilan AYNAN bir xil qaror berishi shart — aks holda
 * karta "Boshlash" deydi, solve sahifasi esa "Test yopiq". Shuning uchun
 * ikkala yo'l bitta xotiradagi "baza" ustida ishlaydi: fake'lar ikkala
 * so'rov shaklini (findUnique/findFirst va findMany) bir xil ma'lumotdan
 * javoblaydi.
 */
interface FakeDb {
  subscriptions: { userId: string; isActive: boolean; endDate: Date; plan: string }[];
  purchases: { userId: string; itemType: string; itemId: string }[];
  payments: { userId: string; status: string; selectedSubjects: string[] }[];
}

const state: FakeDb = { subscriptions: [], purchases: [], payments: [] };

const mocks = vi.hoisted(() => ({
  subscriptionFindMany: vi.fn(),
  purchaseFindUnique: vi.fn(),
  purchaseFindMany: vi.fn(),
  paymentFindFirst: vi.fn(),
  paymentFindMany: vi.fn(),
}));

vi.mock("../db", () => ({
  db: {
    subscription: { findMany: (...args: unknown[]) => mocks.subscriptionFindMany(...args) },
    purchase: {
      findUnique: (...args: unknown[]) => mocks.purchaseFindUnique(...args),
      findMany: (...args: unknown[]) => mocks.purchaseFindMany(...args),
    },
    payment: {
      findFirst: (...args: unknown[]) => mocks.paymentFindFirst(...args),
      findMany: (...args: unknown[]) => mocks.paymentFindMany(...args),
    },
  },
}));

interface SubscriptionArgs { where: { userId: string; isActive: boolean; endDate: { gte: Date } } }
interface PurchaseUniqueArgs { where: { userId_itemType_itemId: { userId: string; itemType: string; itemId: string } } }
interface PurchaseManyArgs { where: { userId: string; itemType: string; itemId: { in: string[] } } }
interface PaymentFirstArgs { where: { userId: string; status: string; selectedSubjects: { has: string } } }
interface PaymentManyArgs { where: { userId: string; status: string; selectedSubjects: { hasSome: string[] } } }

beforeEach(() => {
  vi.clearAllMocks();
  state.subscriptions = [];
  state.purchases = [];
  state.payments = [];

  mocks.subscriptionFindMany.mockImplementation(async ({ where }: SubscriptionArgs) =>
    state.subscriptions
      .filter((s) => s.userId === where.userId && s.isActive === where.isActive)
      .filter((s) => s.endDate.getTime() >= where.endDate.gte.getTime())
      .map((s) => ({ plan: s.plan })),
  );
  mocks.purchaseFindUnique.mockImplementation(async ({ where }: PurchaseUniqueArgs) => {
    const k = where.userId_itemType_itemId;
    return state.purchases.find((p) => p.userId === k.userId && p.itemType === k.itemType && p.itemId === k.itemId) ?? null;
  });
  mocks.purchaseFindMany.mockImplementation(async ({ where }: PurchaseManyArgs) =>
    state.purchases
      .filter((p) => p.userId === where.userId && p.itemType === where.itemType && where.itemId.in.includes(p.itemId))
      .map((p) => ({ itemId: p.itemId })),
  );
  mocks.paymentFindFirst.mockImplementation(async ({ where }: PaymentFirstArgs) =>
    state.payments.find(
      (p) => p.userId === where.userId && p.status === where.status && p.selectedSubjects.includes(where.selectedSubjects.has),
    ) ?? null,
  );
  mocks.paymentFindMany.mockImplementation(async ({ where }: PaymentManyArgs) =>
    state.payments
      .filter((p) => p.userId === where.userId && p.status === where.status)
      .filter((p) => p.selectedSubjects.some((id) => where.selectedSubjects.hasSome.includes(id)))
      .map((p) => ({ selectedSubjects: p.selectedSubjects })),
  );
});

const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
const past = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);

// Bitta sahifa: har accessType'dan bittadan, ikkita pullik (biri sotib olingan).
const PAGE: TestAccessInfo[] = [
  { id: "free1", isFree: true, accessType: "free" },
  { id: "free2", isFree: false, accessType: "free" },
  { id: "prem", isFree: false, accessType: "premium" },
  { id: "teach", isFree: false, accessType: "teacher" },
  { id: "both", isFree: false, accessType: "premium_teacher" },
  { id: "paidA", isFree: false, accessType: "paid" },
  { id: "paidB", isFree: false, accessType: "paid" },
  { id: "weird", isFree: false, accessType: "something_new" },
];

interface Scenario {
  name: string;
  role: string | undefined;
  setup: () => void;
  // Kutilgan ochiq testlar — moslikdan tashqari, mantiqning o'zi ham to'g'riligini ko'rsatadi.
  open: string[];
}

const FREE = ["free1", "free2"];

const scenarios: Scenario[] = [
  { name: "obunasiz, xaridsiz foydalanuvchi", role: "USER", setup: () => {}, open: FREE },
  {
    name: "faol PREMIUM obunachi",
    role: "USER",
    setup: () => state.subscriptions.push({ userId: "u1", isActive: true, endDate: future, plan: "PREMIUM" }),
    open: [...FREE, "prem", "both"],
  },
  {
    name: "muddati tugagan PREMIUM obuna",
    role: "USER",
    setup: () => state.subscriptions.push({ userId: "u1", isActive: true, endDate: past, plan: "PREMIUM" }),
    open: FREE,
  },
  {
    name: "o'chirilgan (isActive=false) PREMIUM obuna",
    role: "USER",
    setup: () => state.subscriptions.push({ userId: "u1", isActive: false, endDate: future, plan: "PREMIUM" }),
    open: FREE,
  },
  {
    name: "faol TEACHER_PLAN obunachi",
    role: "USER",
    setup: () => state.subscriptions.push({ userId: "u1", isActive: true, endDate: future, plan: "TEACHER_PLAN" }),
    open: [...FREE, "teach", "both"],
  },
  // checkTestAccess TEACHER rolining o'ziga hech narsa bermaydi — faqat obuna.
  { name: "TEACHER roli, obunasiz", role: "TEACHER", setup: () => {}, open: FREE },
  { name: "ADMIN", role: "ADMIN", setup: () => {}, open: PAGE.map((t) => t.id) },
  {
    name: "Purchase orqali sotib olingan paid test",
    role: "USER",
    setup: () => state.purchases.push({ userId: "u1", itemType: "test", itemId: "paidA" }),
    open: [...FREE, "paidA"],
  },
  {
    name: "eski Payment.selectedSubjects xaridi",
    role: "USER",
    setup: () => state.payments.push({ userId: "u1", status: "CONFIRMED", selectedSubjects: ["subj-x", "paidB"] }),
    open: [...FREE, "paidB"],
  },
  {
    name: "tasdiqlanmagan Payment, kurs xaridi va boshqa foydalanuvchining xaridi",
    role: "USER",
    setup: () => {
      state.payments.push({ userId: "u1", status: "PENDING", selectedSubjects: ["paidA"] });
      state.purchases.push({ userId: "u1", itemType: "course", itemId: "paidA" });
      state.purchases.push({ userId: "u2", itemType: "test", itemId: "paidB" });
    },
    open: FREE,
  },
];

describe("resolveTestAccess ↔ checkTestAccess mosligi", () => {
  for (const sc of scenarios) {
    it(sc.name, async () => {
      sc.setup();
      const ctx = await loadTestAccessContext("u1", sc.role, PAGE);
      for (const test of PAGE) {
        const listed = resolveTestAccess(test, ctx);
        const isFree = test.isFree || test.accessType === "free";
        // checkTestAccess bepulni chaqiruvchiga qoldiradi (GET /api/tests/[id]
        // ham shunday) — bepulda uni chaqirmaymiz.
        const single = isFree ? true : await checkTestAccess("u1", test, sc.role);
        expect({ id: test.id, access: listed }).toEqual({ id: test.id, access: single });
      }
      expect(PAGE.filter((t) => resolveTestAccess(t, ctx)).map((t) => t.id).sort()).toEqual([...sc.open].sort());
    });
  }
});

describe("resolveTestAccess — kirmagan foydalanuvchi (ctx = null)", () => {
  it("faqat bepul testlar ochiq", () => {
    expect(PAGE.filter((t) => resolveTestAccess(t, null)).map((t) => t.id)).toEqual(FREE);
  });
});

describe("loadTestAccessContext — N+1 yo'q", () => {
  it("testlar soni qancha bo'lsa ham har jadvalga ko'pi bilan bitta so'rov", async () => {
    const many: TestAccessInfo[] = Array.from({ length: 50 }, (_, i) => ({
      id: `t${i}`,
      isFree: false,
      accessType: i % 2 ? "paid" : "premium",
    }));
    await loadTestAccessContext("u1", "USER", many);
    expect(mocks.subscriptionFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.purchaseFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.paymentFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.purchaseFindUnique).not.toHaveBeenCalled();
    expect(mocks.paymentFindFirst).not.toHaveBeenCalled();
  });

  it("pullik test yo'q — xarid so'rovlari yo'q; obunali test yo'q — obuna so'rovi yo'q", async () => {
    await loadTestAccessContext("u1", "USER", [{ id: "p", isFree: false, accessType: "premium" }]);
    expect(mocks.purchaseFindMany).not.toHaveBeenCalled();
    expect(mocks.paymentFindMany).not.toHaveBeenCalled();

    vi.clearAllMocks();
    await loadTestAccessContext("u1", "USER", [{ id: "x", isFree: false, accessType: "paid" }]);
    expect(mocks.subscriptionFindMany).not.toHaveBeenCalled();
  });

  it("faqat bepul testlar yoki ADMIN — hech qanday so'rov yo'q", async () => {
    await loadTestAccessContext("u1", "USER", PAGE.slice(0, 2));
    await loadTestAccessContext("u1", "ADMIN", PAGE);
    expect(mocks.subscriptionFindMany).not.toHaveBeenCalled();
    expect(mocks.purchaseFindMany).not.toHaveBeenCalled();
    expect(mocks.paymentFindMany).not.toHaveBeenCalled();
  });
});
