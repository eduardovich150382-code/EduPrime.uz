import { describe, expect, it, vi } from "vitest";
import type { ModelCaller, StructureInput } from "../structure";
import {
  isRetriableError,
  parseStructureConcurrency,
  statusOf,
  toLastError,
  withRetry,
} from "../structure-error";

const input = { order: 1 } as StructureInput;

/** Statusli xato — SDK aynan shunday obyekt tashlaydi. */
function httpError(status: number, message = "failed"): Error {
  return Object.assign(new Error(message), { status });
}

describe("isRetriableError", () => {
  it("tezlik chegarasi va vaqtinchalik nosozliklar qayta uriniladi", () => {
    expect(isRetriableError(httpError(429))).toBe(true);
    expect(isRetriableError(httpError(503))).toBe(true);
    expect(isRetriableError(new Error("[429] RESOURCE_EXHAUSTED: quota"))).toBe(true);
    expect(isRetriableError(new Error("request timed out"))).toBe(true);
    // Tarmoq xatosida sabab `code` da keladi, `message` da emas.
    expect(isRetriableError(Object.assign(new Error("reset"), { code: "ECONNRESET" }))).toBe(true);
    expect(isRetriableError(Object.assign(new Error("fetch failed"), { code: "UND_ERR_CONNECT_TIMEOUT" }))).toBe(true);
  });

  it("400 va sxema xatosi qayta urinilmaydi", () => {
    expect(isRetriableError(httpError(400, "Invalid JSON payload"))).toBe(false);
    expect(isRetriableError(new SyntaxError("Unexpected end of JSON input"))).toBe(false);
    expect(isRetriableError(new Error("responseSchema is invalid"))).toBe(false);
  });

  it("status bor bo'lsa xabar matni e'tiborga olinmaydi", () => {
    // Aks holda "400 Bad Request ... upstream 503" xabari 400 ni qayta
    // urinishga majbur qilardi — bekorga pul va vaqt.
    expect(isRetriableError(httpError(400, "Bad Request: upstream returned 503"))).toBe(false);
  });
});

describe("statusOf", () => {
  it("status va statusCode maydonlarini o'qiydi", () => {
    expect(statusOf(httpError(429))).toBe(429);
    expect(statusOf(Object.assign(new Error("x"), { statusCode: 503 }))).toBe(503);
    expect(statusOf(new Error("x"))).toBeUndefined();
  });
});

describe("withRetry", () => {
  it("429 da kutib qayta uriniladi va natija qaytadi", async () => {
    const call = vi
      .fn<ModelCaller>()
      .mockRejectedValueOnce(httpError(429))
      .mockRejectedValueOnce(httpError(429))
      .mockResolvedValue({ json: { text: "ok" }, tokens: 10 });
    const sleep = vi.fn().mockResolvedValue(undefined);

    const result = await withRetry(call, { sleep, random: () => 0.5 })(input);

    expect(result.tokens).toBe(10);
    expect(call).toHaveBeenCalledTimes(3);
    // Jitter: 0.75 + 0.5 * 0.5 = 1.0 — aniq koeffitsiyent bilan kutish aynan
    // jadvaldagi qiymat bo'ladi.
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([1000, 4000]);
  });

  it("uch urinishdan keyin ham yiqilsa asl xato tashlanadi", async () => {
    const error = httpError(429, "quota");
    const call = vi.fn<ModelCaller>().mockRejectedValue(error);
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(withRetry(call, { sleep, random: () => 0 })(input)).rejects.toBe(error);

    expect(call).toHaveBeenCalledTimes(4);
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([750, 3000, 7500]);
  });

  it("400 da umuman qayta urinilmaydi", async () => {
    const call = vi.fn<ModelCaller>().mockRejectedValue(httpError(400, "bad request"));
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(withRetry(call, { sleep })(input)).rejects.toThrow("bad request");

    expect(call).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("jitter kutishni jadval atrofida tarqatadi", async () => {
    const call = vi
      .fn<ModelCaller>()
      .mockRejectedValueOnce(httpError(503))
      .mockResolvedValue({ json: {}, tokens: 0 });
    const sleep = vi.fn().mockResolvedValue(undefined);

    await withRetry(call, { sleep, random: () => 1 })(input);

    expect(sleep.mock.calls[0][0]).toBeGreaterThanOrEqual(750);
    expect(sleep.mock.calls[0][0]).toBeLessThanOrEqual(1250);
  });
});

describe("toLastError", () => {
  const at = new Date("2026-09-14T10:00:00.000Z");

  it("xabar, nom, status va vaqtni yozadi", () => {
    expect(toLastError(httpError(429, "quota exceeded"), at)).toEqual({
      message: "quota exceeded",
      name: "Error",
      status: 429,
      at: "2026-09-14T10:00:00.000Z",
    });
  });

  it("maxfiy qiymat redaktsiya qilinadi", () => {
    const secret = toLastError(
      new Error("GET https://generativelanguage.googleapis.com/v1/models?key=AIzaSyTOPSECRET failed"),
      at,
    );

    expect(secret.message).not.toContain("AIzaSyTOPSECRET");
    expect(secret.message).toContain("key=[redacted]");

    const dsn = toLastError(new Error("connect postgresql://user:parol@host:5432/db refused"), at);
    expect(dsn.message).not.toContain("parol");
    expect(dsn.message).toContain("[redacted-dsn]");
  });

  it("xabar 500 belgidan oshmaydi", () => {
    const long = toLastError(new Error("x".repeat(2000)), at);
    expect(long.message).toHaveLength(500);
  });

  it("Error bo'lmagan qiymat ham yiqilmaydi", () => {
    expect(toLastError("plain failure", at)).toEqual({
      message: "plain failure",
      name: "string",
      at: "2026-09-14T10:00:00.000Z",
    });
  });
});

describe("parseStructureConcurrency", () => {
  it("standart qiymat 6", () => {
    expect(parseStructureConcurrency(undefined)).toBe(6);
    expect(parseStructureConcurrency("")).toBe(6);
  });

  it("1-10 oralig'idagi butun son qabul qilinadi", () => {
    expect(parseStructureConcurrency("3")).toBe(3);
    expect(parseStructureConcurrency(" 10 ")).toBe(10);
    expect(parseStructureConcurrency("1")).toBe(1);
  });

  it("noto'g'ri qiymatda standartga qaytadi", () => {
    // Sozlama xatosi tufayli import butunlay to'xtab qolmasligi kerak.
    for (const raw of ["0", "11", "abc", "2.5", "-1"]) {
      expect(parseStructureConcurrency(raw)).toBe(6);
    }
  });
});
