import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PermissionEntitlement } from "../entitlements";
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
  subscriptions: { userId: string; isActive: boolean; endDate: Date; plan: string; categoryId?: string; subjectIds?: string[]; product?: { subjectRule: string } }[];
  permissions: PermissionEntitlement[];
  purchases: { userId: string; itemType: string; itemId: string }[];
  payments: { userId: string; status: string; selectedSubjects: string[] }[];
}

const state: FakeDb = { subscriptions: [], permissions: [], purchases: [], payments: [] };

const mocks = vi.hoisted(() => ({
  subscriptionFindMany: vi.fn(),
  permissionFindMany: vi.fn(),
  categoryFindMany: vi.fn(),
  purchaseFindUnique: vi.fn(),
  purchaseFindMany: vi.fn(),
  paymentFindFirst: vi.fn(),
  paymentFindMany: vi.fn(),
}));

vi.mock("../db", () => ({
  db: {
    userPermission: { findMany: (...args: unknown[]) => mocks.permissionFindMany(...args) },
    testCategory: { findMany: (...args: unknown[]) => mocks.categoryFindMany(...args) },
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
  state.permissions = [];
  mocks.permissionFindMany.mockImplementation(async () => state.permissions);
  mocks.categoryFindMany.mockImplementation(async () => [{ id: "att", type: "ATTESTATION" }, { id: "cat", type: "DTM" }]);
  state.purchases = [];
  state.payments = [];

  mocks.subscriptionFindMany.mockImplementation(async ({ where }: SubscriptionArgs) =>
    state.subscriptions
      .filter((s) => s.userId === where.userId && s.isActive === where.isActive)
      .filter((s) => s.endDate.getTime() >= where.endDate.gte.getTime())
      .map((s) => ({ categoryId: null, subjectIds: [], product: null, ...s })),
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
  { categoryId: "cat", subjectId: "subject", id: "free1", isFree: true, accessType: "free" },
  { categoryId: "cat", subjectId: "subject", id: "free2", isFree: false, accessType: "free" },
  { categoryId: "cat", subjectId: "subject", id: "prem", isFree: false, accessType: "premium" },
  { categoryId: "cat", subjectId: "subject", id: "teach", isFree: false, accessType: "teacher" },
  { categoryId: "cat", subjectId: "subject", id: "both", isFree: false, accessType: "premium_teacher" },
  { categoryId: "cat", subjectId: "subject", id: "paidA", isFree: false, accessType: "paid" },
  { categoryId: "cat", subjectId: "subject", id: "paidB", isFree: false, accessType: "paid" },
  { categoryId: "cat", subjectId: "subject", id: "sub-dtm", isFree: false, accessType: "subscription" },
  { categoryId: "att", subjectId: "physics", id: "sub-att", isFree: false, accessType: "subscription" },
  { categoryId: "att", subjectId: "math", id: "sub-att-math", isFree: false, accessType: "subscription" },
  { categoryId: "att", subjectId: "physics", id: "paid-att", isFree: false, accessType: "paid" },
  { categoryId: "cat", subjectId: "other", id: "paid-other", isFree: false, accessType: "paid" },
  { categoryId: "cat", subjectId: "subject", id: "weird", isFree: false, accessType: "something_new" },
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
    open: [...FREE, "prem", "both", "sub-dtm"],
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
    open: [...FREE, "teach", "both", "sub-att", "sub-att-math"],
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

scenarios.push(
  { name: "CATEGORY ONE: o'z fani va paid mock", role: "USER", setup: () => state.subscriptions.push({ userId: "u1", isActive: true, endDate: future, plan: "CATEGORY", categoryId: "att", subjectIds: ["physics"], product: { subjectRule: "ONE" } }), open: [...FREE, "sub-att", "paid-att"] },
  { name: "CATEGORY NONE: butun kategoriya", role: "USER", setup: () => state.subscriptions.push({ userId: "u1", isActive: true, endDate: future, plan: "CATEGORY", categoryId: "att", subjectIds: [], product: { subjectRule: "NONE" } }), open: [...FREE, "sub-att", "sub-att-math", "paid-att"] },
  { name: "DTM_BLOCK: saqlangan fanlar", role: "USER", setup: () => state.subscriptions.push({ userId: "u1", isActive: true, endDate: future, plan: "CATEGORY", categoryId: "cat", subjectIds: ["subject", "m1", "m2", "m3", "m4"], product: { subjectRule: "DTM_BLOCK" } }), open: [...FREE, "prem", "teach", "both", "paidA", "paidB", "sub-dtm", "weird"] },
  { name: "BUNDLE barcha testlar", role: "USER", setup: () => state.subscriptions.push({ userId: "u1", isActive: true, endDate: future, plan: "BUNDLE" }), open: PAGE.map((t) => t.id) },
  { name: "fanli UserPermission", role: "USER", setup: () => state.permissions.push({ categoryId: "att", subjectId: "physics", isActive: true, expiresAt: future }), open: [...FREE, "sub-att", "paid-att"] },
  { name: "fansiz UserPermission", role: "USER", setup: () => state.permissions.push({ categoryId: "att", subjectId: null, isActive: true, expiresAt: null }), open: [...FREE, "sub-att", "sub-att-math", "paid-att"] },
  { name: "tugagan va nofaol UserPermission", role: "USER", setup: () => { state.permissions.push({ categoryId: "att", subjectId: null, isActive: true, expiresAt: past }, { categoryId: "cat", subjectId: null, isActive: false, expiresAt: future }); }, open: FREE },
);

describe("resolveTestAccess ↔ checkTestAccess mosligi", () => {
  for (const sc of scenarios) {
    it(sc.name, async () => {
      sc.setup();
      const ctx = await loadTestAccessContext("u1", sc.role, PAGE);
      for (const test of PAGE) {
        const listed = resolveTestAccess(test, ctx);
        const single = await checkTestAccess("u1", test, sc.role);
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
  it.each([3, 50, 200])("%i ta test: har jadvalga ko'pi bilan bitta so'rov", async (count) => {
    const many: TestAccessInfo[] = Array.from({ length: count }, (_, i) => ({
      categoryId: i % 3 ? "att" : "cat",
      subjectId: "subject",
      id: `t${i}`,
      isFree: false,
      accessType: i % 3 === 2 ? "paid" : "subscription",
    }));
    await loadTestAccessContext("u1", "USER", many);
    expect(mocks.subscriptionFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.permissionFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.permissionFindMany).toHaveBeenCalledWith({
      where: { userId: "u1", isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gte: expect.any(Date) } }] },
      select: { categoryId: true, subjectId: true, isActive: true, expiresAt: true },
    });
    expect(mocks.categoryFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.categoryFindMany).toHaveBeenCalledWith({ where: { id: { in: ["cat", "att"] } }, select: { id: true, type: true } });
    expect(mocks.purchaseFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.paymentFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.purchaseFindUnique).not.toHaveBeenCalled();
    expect(mocks.paymentFindFirst).not.toHaveBeenCalled();
  });

  it("pullik test yo'q — xarid so'rovlari yo'q; paid uchun ham obuna tekshiriladi", async () => {
    await loadTestAccessContext("u1", "USER", [{ categoryId: "cat", subjectId: "subject", id: "p", isFree: false, accessType: "premium" }]);
    expect(mocks.purchaseFindMany).not.toHaveBeenCalled();
    expect(mocks.paymentFindMany).not.toHaveBeenCalled();

    vi.clearAllMocks();
    await loadTestAccessContext("u1", "USER", [{ categoryId: "cat", subjectId: "subject", id: "x", isFree: false, accessType: "paid" }]);
    expect(mocks.subscriptionFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.permissionFindMany).toHaveBeenCalledTimes(1);
  });

  it("faqat bepul testlar yoki ADMIN — hech qanday so'rov yo'q", async () => {
    await loadTestAccessContext("u1", "USER", PAGE.slice(0, 2));
    await loadTestAccessContext("u1", "ADMIN", PAGE);
    expect(mocks.subscriptionFindMany).not.toHaveBeenCalled();
    expect(mocks.purchaseFindMany).not.toHaveBeenCalled();
    expect(mocks.paymentFindMany).not.toHaveBeenCalled();
    expect(mocks.permissionFindMany).not.toHaveBeenCalled();
    expect(mocks.categoryFindMany).not.toHaveBeenCalled();
  });
});
