import { describe, expect, it } from "vitest";
import type { AIImportedQuestion, AIImportResult } from "@/types";
import { getAiImportStatus } from "../ai-import-status";

const question = { text: "2+2", options: [], correctAnswer: "4", confidence: 1 } as unknown as AIImportedQuestion;

function result(patch: Partial<AIImportResult>): AIImportResult {
  return { questions: [], totalFound: 0, warnings: [], ...patch };
}

describe("getAiImportStatus", () => {
  it("savol kelsa — muvaffaqiyat", () => {
    expect(getAiImportStatus(result({ questions: [question], totalFound: 1 }))).toBe("success");
  });

  it("0 savol + kvota xatosi — muvaffaqiyat EMAS, kvota", () => {
    expect(getAiImportStatus(result({ errorCode: "AI_QUOTA_EXHAUSTED" }))).toBe("quota");
  });

  it("0 savol + boshqa xato — muvaffaqiyat EMAS", () => {
    expect(getAiImportStatus(result({ errorCode: "AI_ERROR", warnings: ["xato"] }))).toBe("failed");
  });

  it("0 savol, xatosiz (masalan kesilgan javob) — muvaffaqiyat EMAS", () => {
    expect(getAiImportStatus(result({ warnings: ["AI javobi to'liq kelmadi"] }))).toBe("failed");
    // AI `totalFound` ni savolsiz to'ldirsa ham yashil chiqmasin.
    expect(getAiImportStatus(result({ totalFound: 5 }))).toBe("failed");
  });
});
