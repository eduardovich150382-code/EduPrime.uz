import { beforeEach, describe, expect, it, vi } from "vitest";

// Modul yuklanishida env o'qiladi — standart zanjir tekshirilsin.
const mocks = vi.hoisted(() => {
  delete process.env.AI_IMPORT_MODELS;
  return {
    /** Model nomi → chaqiruv xulqi. Berilmagan model muvaffaqiyatli javob beradi. */
    behavior: new Map<string, () => Promise<unknown>>(),
    called: [] as string[],
  };
});

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel({ model }: { model: string }) {
      return {
        generateContent: async () => {
          mocks.called.push(model);
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
