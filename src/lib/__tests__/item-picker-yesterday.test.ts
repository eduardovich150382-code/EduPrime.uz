import { describe, expect, it, vi, beforeEach } from "vitest";

// `getYesterdayIncorrectItemIds` DB'ga boradi — item-picker.test.ts
// (`db: {}` bilan mocklangan) bu funksiyani sinovdan o'tkazmaydi, shuning
// uchun alohida faylda, haqiqiy javob qaytaradigan mock bilan tekshiriladi.
const testResultFindMany = vi.fn();
const itemFindMany = vi.fn();

vi.mock("../db", () => ({
  db: {
    testResult: { findMany: (...args: unknown[]) => testResultFindMany(...args) },
    item: { findMany: (...args: unknown[]) => itemFindMany(...args) },
  },
}));

import { getYesterdayIncorrectItemIds } from "../item-picker";

beforeEach(() => {
  testResultFindMany.mockReset();
  itemFindMany.mockReset();
});

describe("getYesterdayIncorrectItemIds", () => {
  it("faqat DB'da haqiqatan mavjud Item id'larini qaytaradi — 200 tadan ko'p aralash questionId bo'lganda ham", async () => {
    // 250 ta turli questionId "kecha" noto'g'ri javob sifatida yozilgan —
    // aksariyati hali Item bankiga ko'chirilmagan (haqiqiy loyihadagi
    // holat, TopicNode izohiga qarang).
    const answers = Array.from({ length: 250 }, (_, i) => ({ questionId: `q${i}`, isCorrect: false }));
    testResultFindMany.mockResolvedValue([{ answers }]);
    // DB'da faqat 3 tasi haqiqiy Item sifatida topiladi.
    itemFindMany.mockResolvedValue([{ id: "item-q0" }, { id: "item-q1" }, { id: "item-q2" }]);

    const ids = await getYesterdayIncorrectItemIds("user1");

    // Natija — funksiya hech qanday xom questionId'ni o'zidan qo'shmaydi,
    // faqat DB tasdiqlagan Item id'lari qaytadi.
    expect(ids).toEqual(["item-q0", "item-q1", "item-q2"]);

    expect(itemFindMany).toHaveBeenCalledTimes(1);
    const call = itemFindMany.mock.calls[0][0];
    expect(call.where.OR).toHaveLength(2);
    expect(call.where.OR[0].id.in).toContain("q0");
    expect(call.where.OR[1].legacyQuestionId.in).toContain("q0");
    expect(call.take).toBe(200);
  });

  it("isCorrect true yoki undefined bo'lgan javoblarni 'xato' sifatida hisobga olmaydi", async () => {
    testResultFindMany.mockResolvedValue([
      { answers: [{ questionId: "correct1", isCorrect: true }, { questionId: "skipped1" }] },
    ]);

    const ids = await getYesterdayIncorrectItemIds("user1");

    expect(ids).toEqual([]);
    expect(itemFindMany).not.toHaveBeenCalled(); // bo'sh to'plam uchun qo'shimcha so'rov yubormaydi
  });

  it("hech qanday TestResult topilmasa bo'sh massiv qaytaradi", async () => {
    testResultFindMany.mockResolvedValue([]);
    const ids = await getYesterdayIncorrectItemIds("user1");
    expect(ids).toEqual([]);
  });
});
