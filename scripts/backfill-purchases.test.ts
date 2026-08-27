import { describe, expect, it } from "vitest";
import { ConfirmedPaymentRow, planPurchaseBackfill } from "./backfill-purchases-lib";

function makePayment(overrides: Partial<ConfirmedPaymentRow> = {}): ConfirmedPaymentRow {
  return {
    id: "payment_1",
    userId: "user_1",
    selectedSubjects: ["test_1"],
    ...overrides,
  };
}

describe("planPurchaseBackfill", () => {
  it("Test.id ga mos kelgan id uchun itemType='test' bilan Purchase rejalashtiradi", () => {
    const testIds = new Set(["test_1"]);
    const courseIds = new Set<string>();
    const plan = planPurchaseBackfill([makePayment()], testIds, courseIds, new Set());

    expect(plan.purchases).toEqual([
      { userId: "user_1", itemType: "test", itemId: "test_1", paymentId: "payment_1" },
    ]);
    expect(plan.report.testPurchasesCreated).toBe(1);
    expect(plan.report.coursePurchasesCreated).toBe(0);
    expect(plan.report.skippedSubjectIds).toBe(0);
  });

  it("Course.id ga mos kelgan id uchun itemType='course' bilan Purchase rejalashtiradi", () => {
    const testIds = new Set<string>();
    const courseIds = new Set(["course_1"]);
    const plan = planPurchaseBackfill(
      [makePayment({ selectedSubjects: ["course_1"] })],
      testIds,
      courseIds,
      new Set()
    );

    expect(plan.purchases).toEqual([
      { userId: "user_1", itemType: "course", itemId: "course_1", paymentId: "payment_1" },
    ]);
    expect(plan.report.coursePurchasesCreated).toBe(1);
    expect(plan.report.testPurchasesCreated).toBe(0);
  });

  it("na Test, na Course'ga mos kelmagan id (Subject id) TEGILMAYDI", () => {
    const plan = planPurchaseBackfill(
      [makePayment({ selectedSubjects: ["subject_fizika"] })],
      new Set(),
      new Set(),
      new Set()
    );

    expect(plan.purchases).toHaveLength(0);
    expect(plan.report.skippedSubjectIds).toBe(1);
  });

  it("bitta to'lovda test va fan id'lari aralash bo'lsa — faqat testga Purchase yaratadi, fanni tegmaydi", () => {
    const testIds = new Set(["test_1"]);
    const plan = planPurchaseBackfill(
      [makePayment({ selectedSubjects: ["test_1", "subject_fizika"] })],
      testIds,
      new Set(),
      new Set()
    );

    expect(plan.purchases).toEqual([
      { userId: "user_1", itemType: "test", itemId: "test_1", paymentId: "payment_1" },
    ]);
    expect(plan.report.testPurchasesCreated).toBe(1);
    expect(plan.report.skippedSubjectIds).toBe(1);
  });

  it("allaqachon mavjud Purchase (existingPurchaseKeys) qayta rejalashtirilmaydi", () => {
    const testIds = new Set(["test_1"]);
    const existing = new Set(["user_1:test:test_1"]);
    const plan = planPurchaseBackfill([makePayment()], testIds, new Set(), existing);

    expect(plan.purchases).toHaveLength(0);
    expect(plan.report.alreadyExists).toBe(1);
    expect(plan.report.testPurchasesCreated).toBe(0);
  });

  it("bir xil id'ga ega ikkita alohida CONFIRMED to'lov — faqat bitta Purchase rejalashtiradi (ikkinchisi 'alreadyExists')", () => {
    const testIds = new Set(["test_1"]);
    const payments = [
      makePayment({ id: "payment_1", userId: "user_1", selectedSubjects: ["test_1"] }),
      makePayment({ id: "payment_2", userId: "user_1", selectedSubjects: ["test_1"] }),
    ];
    const plan = planPurchaseBackfill(payments, testIds, new Set(), new Set());

    expect(plan.purchases).toHaveLength(1);
    expect(plan.purchases[0].paymentId).toBe("payment_1"); // birinchisi g'olib
    expect(plan.report.testPurchasesCreated).toBe(1);
    expect(plan.report.alreadyExists).toBe(1);
  });

  it("bitta to'lov ichida takrorlangan id bitta marta hisoblanadi", () => {
    const testIds = new Set(["test_1"]);
    const plan = planPurchaseBackfill(
      [makePayment({ selectedSubjects: ["test_1", "test_1"] })],
      testIds,
      new Set(),
      new Set()
    );

    expect(plan.purchases).toHaveLength(1);
    expect(plan.report.testPurchasesCreated).toBe(1);
  });

  it("har xil foydalanuvchilar bir xil test id sotib olsa — ikkalasi uchun ham alohida Purchase yaratiladi", () => {
    const testIds = new Set(["test_1"]);
    const payments = [
      makePayment({ id: "payment_1", userId: "user_1", selectedSubjects: ["test_1"] }),
      makePayment({ id: "payment_2", userId: "user_2", selectedSubjects: ["test_1"] }),
    ];
    const plan = planPurchaseBackfill(payments, testIds, new Set(), new Set());

    expect(plan.purchases).toHaveLength(2);
    expect(plan.report.testPurchasesCreated).toBe(2);
  });

  it("bo'sh selectedSubjects — hech narsa rejalashtirmaydi", () => {
    const plan = planPurchaseBackfill(
      [makePayment({ selectedSubjects: [] })],
      new Set(["test_1"]),
      new Set(),
      new Set()
    );

    expect(plan.purchases).toHaveLength(0);
    expect(plan.report.skippedSubjectIds).toBe(0);
  });
});
