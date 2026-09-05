import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `db`ni xotiradagi fake bilan almashtiramiz — `quota.test.ts`dagi `item`
 * fake'i bilan bir xil naqsh (`resolveUnlockKeys` ham shu jadvaldan
 * foydalanadi, alohida mock kerak emas). `vi.mock` hoisting bilan fayl
 * boshiga ko'chiriladi — shu sababli ichidagi holat (`items`) ham
 * `vi.hoisted` ichida yaratiladi.
 */
const { items } = vi.hoisted(() => ({
  items: new Map<string, { id: string; legacyQuestionId: string | null }>(),
}));

vi.mock("../db", () => ({
  db: {
    item: {
      findMany: async ({
        where,
      }: {
        where: { legacyQuestionId?: { in: string[] }; id?: { in: string[] } };
      }) => {
        if (where.legacyQuestionId) {
          return Array.from(items.values()).filter(
            (it) => it.legacyQuestionId !== null && where.legacyQuestionId!.in.includes(it.legacyQuestionId)
          );
        }
        return Array.from(items.values()).filter((it) => where.id!.in.includes(it.id));
      },
    },
  },
}));

import { resolveAttemptCandidates, toAttemptCreateInput } from "../attempts";
import type { AnswerResult } from "../grading";

function buildAnswer(overrides: Partial<AnswerResult> = {}): AnswerResult {
  return {
    questionId: "q1",
    answer: "A",
    isCorrect: true,
    correctAnswer: "A",
    timeSpent: 5,
    ...overrides,
  };
}

beforeEach(() => {
  items.clear();
});

describe("resolveAttemptCandidates", () => {
  it("Item.id'ga to'g'ridan-to'g'ri mos keladigan javobni (sessiya tarmog'i) nomzod sifatida qaytaradi", async () => {
    items.set("item-1", { id: "item-1", legacyQuestionId: null });
    const result = await resolveAttemptCandidates([buildAnswer({ questionId: "item-1" })]);
    expect(result).toEqual([{ itemId: "item-1", answer: "A", isCorrect: true, timeSpentSec: 5 }]);
  });

  it("eski Question.id'ni legacyQuestionId orqali Item.id'ga normallashtiradi (Test tarmog'i)", async () => {
    items.set("item-1", { id: "item-1", legacyQuestionId: "question-1" });
    const result = await resolveAttemptCandidates([buildAnswer({ questionId: "question-1" })]);
    expect(result).toEqual([{ itemId: "item-1", answer: "A", isCorrect: true, timeSpentSec: 5 }]);
  });

  it("hech qanday Item topilmagan javobni chiqarib tashlaydi — yetim Attempt qatori yozilmasin", async () => {
    const result = await resolveAttemptCandidates([buildAnswer({ questionId: "orphan-question" })]);
    expect(result).toEqual([]);
  });

  it("bir nechta javobdan faqat Item topilganlarini qaytaradi (aralash holat)", async () => {
    items.set("item-1", { id: "item-1", legacyQuestionId: "question-1" });
    const answers = [
      buildAnswer({ questionId: "question-1", answer: "B", isCorrect: false, timeSpent: 3 }),
      buildAnswer({ questionId: "orphan-question", answer: "C", timeSpent: 9 }),
    ];
    const result = await resolveAttemptCandidates(answers);
    expect(result).toEqual([{ itemId: "item-1", answer: "B", isCorrect: false, timeSpentSec: 3 }]);
  });

  it("bo'sh massiv uchun so'rovsiz bo'sh natija qaytaradi", async () => {
    const result = await resolveAttemptCandidates([]);
    expect(result).toEqual([]);
  });
});

describe("toAttemptCreateInput", () => {
  it("nomzodlarni userId/sessionId/testResultId bilan Attempt.createMany kirishiga o'giradi", () => {
    const rows = toAttemptCreateInput(
      [{ itemId: "item-1", answer: "A", isCorrect: true, timeSpentSec: 7 }],
      { userId: "user-1", sessionId: "session-1", testResultId: "result-1" }
    );
    expect(rows).toEqual([
      {
        userId: "user-1",
        itemId: "item-1",
        sessionId: "session-1",
        testResultId: "result-1",
        answer: "A",
        isCorrect: true,
        timeSpentSec: 7,
      },
    ]);
  });

  it("sessionId berilmasa null qo'yadi (Test orqali topshirilgan natija)", () => {
    const rows = toAttemptCreateInput(
      [{ itemId: "item-1", answer: "A", isCorrect: true, timeSpentSec: 7 }],
      { userId: "user-1", testResultId: "result-1" }
    );
    expect(rows[0].sessionId).toBeNull();
  });
});
