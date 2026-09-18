import { describe, expect, it, vi } from "vitest";
import { submitImport } from "../submit-import";

const CHAT_JSON = JSON.stringify([
  { order: 1, text: "2+2=?", options: ["3", "4"], answer: "B" },
]);

/** Muvaffaqiyatli `/api/ai/import` javobini taqlid qiladi. */
function okFetch(body: unknown) {
  return vi.fn(async () => ({ ok: true, json: async () => body }) as unknown as Response);
}

describe("submitImport — json rejimi", () => {
  it("TARMOQQA UMUMAN chiqmaydi", () => {
    // JSON rejimining butun ma'nosi shu: Gemini yo'q, kvota yo'q, 60 s
    // chegara yo'q. Bu tekshiruv panel mantig'ini emas, aynan yuborish
    // qarorini qo'riqlaydi.
    const fetchFn = vi.fn();
    return submitImport({ mode: "json", text: CHAT_JSON }, { fetchFn: fetchFn as unknown as typeof fetch })
      .then((result) => {
        expect(fetchFn).toHaveBeenCalledTimes(0);
        expect(result.questions).toHaveLength(1);
        expect(result.aiResult).toBeNull();
      });
  });

  it("halokatli xatoda savol qaytarmaydi, muammoni qaytaradi", async () => {
    const fetchFn = vi.fn();
    const result = await submitImport(
      { mode: "json", text: "salom" },
      { fetchFn: fetchFn as unknown as typeof fetch },
    );
    expect(fetchFn).toHaveBeenCalledTimes(0);
    expect(result.questions).toEqual([]);
    expect(result.problems).toEqual([{ order: -1, code: "JSON_INVALID" }]);
  });
});

describe("submitImport — text (AI) rejimi", () => {
  it("/api/ai/import ga BIR marta POST yuboradi", async () => {
    const fetchFn = okFetch({ questions: [{ text: "a", options: [], correctAnswer: "", confidence: 1 }], totalFound: 1, warnings: [] });
    const result = await submitImport(
      { mode: "text", text: "1. 2+2=?" },
      { fetchFn: fetchFn as unknown as typeof fetch },
    );

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/ai/import");
    expect(init.method).toBe("POST");
    expect(result.questions).toHaveLength(1);
    expect(result.aiResult).not.toBeNull();
  });

  it("marshrut xato bersa savol emas, xato qaytadi", async () => {
    const fetchFn = vi.fn(
      async () => ({ ok: false, json: async () => ({ error: "Kvota tugadi" }) }) as unknown as Response,
    );
    const result = await submitImport(
      { mode: "text", text: "1. 2+2=?" },
      { fetchFn: fetchFn as unknown as typeof fetch },
    );
    expect(result.questions).toEqual([]);
    expect(result.error).toBe("Kvota tugadi");
  });
});
