import { beforeEach, describe, expect, it, vi } from "vitest";

// Modul yuklanishida env o'qiladi — standart zanjir tekshirilsin.
const mocks = vi.hoisted(() => {
  delete process.env.AI_IMPORT_MODELS;
  return {
    /** Model nomi → chaqiruv xulqi. Berilmagan model muvaffaqiyatli javob beradi. */
    behavior: new Map<string, () => Promise<unknown>>(),
    called: [] as string[],
    /** Har chaqiruvda modelga ketgan matnli qismlar — prompt qoidalarini tekshirish uchun. */
    prompts: [] as string[],
  };
});

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel({ model }: { model: string }) {
      return {
        generateContent: async (parts: unknown) => {
          mocks.called.push(model);
          if (Array.isArray(parts)) {
            mocks.prompts.push(parts.filter((part): part is string => typeof part === "string").join("\n"));
          }
          const run = mocks.behavior.get(model);
          if (run) return run();
          return {
            response: {
              text: () => JSON.stringify({ questions: [{ text: "2+2", options: [], correctAnswer: "4" }] }),
              usageMetadata: { totalTokenCount: 42 },
            },
          };
        },
      };
    }
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  redactSecrets: (text: string) => text,
}));

import { logger } from "@/lib/logger";
import { DEFAULT_AI_IMPORT_MODELS, importTestFromText } from "../gemini";

const RAW_GOOGLE = "[GoogleGenerativeAI Error]: quota generate_content_free_tier_request";

function reject(status: number, message: string) {
  return () => Promise.reject(Object.assign(new Error(message), { status }));
}

beforeEach(() => {
  mocks.behavior.clear();
  mocks.called.length = 0;
  mocks.prompts.length = 0;
  vi.clearAllMocks();
});

describe("importTestFromText — model zanjiri", () => {
  it("birinchi Flash-Lite sinaladi", async () => {
    const result = await importTestFromText("1. 2+2?");

    expect(mocks.called).toEqual(["gemini-3.5-flash-lite"]);
    expect(result.questions).toHaveLength(1);
    expect(result.errorCode).toBeUndefined();
  });

  it("ro'yxat o'rtasidagi model 404 bersa keyingisi chaqiriladi va savollar qaytadi", async () => {
    mocks.behavior.set("gemini-3.5-flash-lite", reject(429, RAW_GOOGLE));
    mocks.behavior.set("gemini-3.8-flash", reject(429, RAW_GOOGLE));
    mocks.behavior.set("gemini-3.7-flash", reject(404, "models/gemini-3.7-flash is not found for API version v1beta"));

    const result = await importTestFromText("1. 2+2?");

    expect(mocks.called).toEqual(["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash"]);
    expect(result.questions).toHaveLength(1);
    expect(logger.info).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ model: "gemini-3.6-flash", source: "text" }),
    );
  });

  it("hamma model 429 bersa AI_QUOTA_EXHAUSTED, xom matn faqat logda", async () => {
    for (const model of DEFAULT_AI_IMPORT_MODELS) mocks.behavior.set(model, reject(429, RAW_GOOGLE));

    const result = await importTestFromText("1. 2+2?");

    expect(mocks.called).toEqual([...DEFAULT_AI_IMPORT_MODELS]);
    expect(result).toMatchObject({ questions: [], errorCode: "AI_QUOTA_EXHAUSTED" });
    expect(JSON.stringify(result)).not.toContain("GoogleGenerativeAI");
    expect(logger.error).toHaveBeenCalled();
  });

  it("oddiy 400 da zanjir to'xtaydi va xom matn ko'rsatilmaydi", async () => {
    mocks.behavior.set("gemini-3.5-flash-lite", reject(400, "[GoogleGenerativeAI Error]: invalid argument"));

    const result = await importTestFromText("1. 2+2?");

    expect(mocks.called).toEqual(["gemini-3.5-flash-lite"]);
    expect(result).toMatchObject({ questions: [], errorCode: "AI_ERROR" });
    expect(JSON.stringify(result)).not.toContain("GoogleGenerativeAI");
  });

  it("kesilgan javob uchun mavjud xabar o'zgarmaydi", async () => {
    mocks.behavior.set("gemini-3.5-flash-lite", () =>
      Promise.resolve({ response: { text: () => '{"questions": [{"text": "2+2"}, {"te', usageMetadata: {} } }),
    );

    const result = await importTestFromText("1. 2+2?");

    expect(result.questions).toEqual([]);
    expect(result.errorCode).toBeUndefined();
    expect(result.warnings[0]).toContain("AI javobi to'liq kelmadi");
  });
});

/** Ko'p qatorli, LaTeX'li muallif yechimi — import quvurida buzilmasligi kerak. */
const AUTHOR_SOLUTION = [
  "Yechim:",
  "Tezlanish $a = \\frac{v - v_0}{t}$ formulasidan topiladi.",
  "",
  "1) $v_0 = 0$ bo'lgani uchun $a = \\frac{20}{4} = 5\\ \\text{m/s}^2$.",
  "2) Yo'l: $S = \\frac{a t^2}{2} = 40\\ \\text{m}$.",
  "",
  "Javob: $a = 5\\ \\text{m/s}^2$, $S = 40\\ \\text{m}$.",
].join("\n");

function respondWith(question: Record<string, unknown>) {
  return () =>
    Promise.resolve({
      response: { text: () => JSON.stringify({ questions: [question] }), usageMetadata: {} },
    });
}

describe("importTestFromText — muallif yechimi", () => {
  it("promptda yechimni aynan ko'chirish qoidasi bor", async () => {
    await importTestFromText("1. 2+2?");

    const prompt = mocks.prompts[0];
    expect(prompt).toContain("Yechim:");
    expect(prompt).toContain("Решение:");
    expect(prompt).toContain("Solution:");
    expect(prompt).toContain("AYNAN ko'chir");
    expect(prompt).toContain("TARJIMA QILMA");
    expect(prompt).toContain("O'ZINGDAN yechim YOZMA");
  });

  it("ko'p qatorli LaTeX'li yechim aynan qaytadi", async () => {
    mocks.behavior.set(
      "gemini-3.5-flash-lite",
      respondWith({ text: "Savol", options: [], correctAnswer: "A", explanation: AUTHOR_SOLUTION }),
    );

    const result = await importTestFromText("1. ... Yechim: ...");

    // Aynan teng: kesish, trim yoki qatorlarni yo'qotish bo'lmasin.
    expect(result.questions[0].explanation).toBe(AUTHOR_SOLUTION);
  });

  it("yechim bo'sh kelsa bo'sh qoladi, maydon yo'q bo'lsa undefined", async () => {
    mocks.behavior.set(
      "gemini-3.5-flash-lite",
      respondWith({ text: "Savol", options: [], correctAnswer: "A", explanation: "" }),
    );
    expect((await importTestFromText("1. 2+2?")).questions[0].explanation).toBe("");

    mocks.behavior.set(
      "gemini-3.5-flash-lite",
      respondWith({ text: "Savol", options: [], correctAnswer: "A" }),
    );
    expect((await importTestFromText("1. 2+2?")).questions[0].explanation).toBeUndefined();
  });
});
