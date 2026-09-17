import { describe, expect, it, vi } from "vitest";
import type { ModelCaller, StructureInput } from "../structure";
import {
  isModelNotFound,
  isRateLimit,
  isRetriableError,
  parseStructureBatch,
  parseStructureCallTimeoutMs,
  parseStructureConcurrency,
  parseStructureDeadlineMs,
  RateLimitedError,
  RETRY_RESERVE_MS,
  statusOf,
  STRUCTURE_CALL_TIMEOUT_MS,
  TimeBudgetError,
  toLastError,
  withRetry,
} from "../structure-error";

const input = { order: 1 } as StructureInput;

/** Statusli xato — SDK aynan shunday obyekt tashlaydi. */
function httpError(status: number, message = "failed"): Error {
  return Object.assign(new Error(message), { status });
}

describe("isModelNotFound", () => {
  it("404 ni va NOT_FOUND matnli 400 ni taniydi", () => {
    expect(isModelNotFound(httpError(404))).toBe(true);
    expect(isModelNotFound(httpError(400, "[400 Bad Request] NOT_FOUND"))).toBe(true);
    expect(
      isModelNotFound(new Error("models/gemini-x is not found for API version v1beta")),
    ).toBe(true);
    expect(isModelNotFound(new Error("[404 Not Found] model"))).toBe(true);
  });

  it("oddiy 400, 429 va boshqa xatolar — model topilmadi EMAS", () => {
    expect(isModelNotFound(httpError(400, "invalid argument"))).toBe(false);
    expect(isModelNotFound(httpError(429, "NOT_FOUND"))).toBe(false);
    expect(isModelNotFound(httpError(503))).toBe(false);
    expect(isModelNotFound(new Error("timeout"))).toBe(false);
  });
});

describe("isRateLimit", () => {
  it("429 ni status bo'yicha ham, xabar matni bo'yicha ham taniydi", () => {
    expect(isRateLimit(httpError(429))).toBe(true);
    expect(isRateLimit(new Error("[429 Too Many Requests] generate_content_free_tier_request"))).toBe(true);
    expect(isRateLimit(new Error("RESOURCE_EXHAUSTED: quota"))).toBe(true);
  });

  it("boshqa xatolarni kvota deb bilmaydi", () => {
    expect(isRateLimit(httpError(503))).toBe(false);
    expect(isRateLimit(new Error("request timed out"))).toBe(false);
    // Status ANIQ bo'lsa xabar matni e'tiborga olinmaydi.
    expect(isRateLimit(httpError(400, "quota RESOURCE_EXHAUSTED"))).toBe(false);
  });
});

describe("isRetriableError", () => {
  it("vaqtinchalik nosozliklar qayta uriniladi", () => {
    expect(isRetriableError(httpError(503))).toBe(true);
    expect(isRetriableError(new Error("request timed out"))).toBe(true);
    // Tarmoq xatosida sabab `code` da keladi, `message` da emas.
    expect(isRetriableError(Object.assign(new Error("reset"), { code: "ECONNRESET" }))).toBe(true);
    expect(isRetriableError(Object.assign(new Error("fetch failed"), { code: "UND_ERR_CONNECT_TIMEOUT" }))).toBe(true);
  });

  it("uzilgan chaqiruv qayta uriniladi, vaqt tugagani esa yo'q", () => {
    // Gemini SDK uzilishni o'z sinfiga o'raydi va `name` yo'qoladi —
    // shuning uchun xabar matni ham hisobga olinadi.
    expect(isRetriableError(Object.assign(new Error("boom"), { name: "AbortError" }))).toBe(true);
    expect(isRetriableError(new Error("Request aborted when fetching https://x"))).toBe(true);
    // Vaqt tugagan — kutib qayta urinishning ma'nosi yo'q.
    expect(isRetriableError(new TimeBudgetError())).toBe(false);
  });

  it("kvota chegarasi qayta URINILMAYDI — u kunlik, soniyalarda tiklanmaydi", () => {
    // 429 ni zanjir boshqaradi: kutish o'rniga keyingi modelga o'tiladi.
    expect(isRetriableError(httpError(429))).toBe(false);
    expect(isRetriableError(new Error("[429] RESOURCE_EXHAUSTED: quota"))).toBe(false);
    expect(isRetriableError(new RateLimitedError())).toBe(false);
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
  it("503 da kutib qayta uriniladi va natija qaytadi", async () => {
    const call = vi
      .fn<ModelCaller>()
      .mockRejectedValueOnce(httpError(503))
      .mockRejectedValueOnce(httpError(503))
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
    const error = httpError(503, "unavailable");
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

  it("byudjet tugagan bo'lsa chaqiruv UMUMAN boshlanmaydi", async () => {
    const call = vi.fn<ModelCaller>().mockResolvedValue({ json: {}, tokens: 0 });

    await expect(withRetry(call, { remaining: () => RETRY_RESERVE_MS })(input)).rejects.toBeInstanceOf(
      TimeBudgetError,
    );

    expect(call).not.toHaveBeenCalled();
  });

  it("kutishga vaqt yetmasa qayta urinilmaydi va xato TimeBudgetError bo'ladi", async () => {
    const call = vi.fn<ModelCaller>().mockRejectedValue(httpError(503, "unavailable"));
    const sleep = vi.fn().mockResolvedValue(undefined);
    // Birinchi chaqiruvga yetadi, kutish + zaxiraga esa yo'q.
    const remaining = () => RETRY_RESERVE_MS + 500;

    const failure = await withRetry(call, { sleep, remaining, random: () => 0.5 })(input).catch((e) => e);

    expect(failure).toBeInstanceOf(TimeBudgetError);
    // Asl sabab yo'qolmaydi.
    expect((failure as TimeBudgetError).cause).toMatchObject({ status: 503 });
    expect(call).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("har chaqiruvga o'z chegarasi bilan signal beriladi va taymer tozalanadi", async () => {
    const timers: { fn: () => void; ms: number }[] = [];
    let cleared = 0;
    const call = vi.fn<ModelCaller>().mockResolvedValue({ json: {}, tokens: 0 });

    await withRetry(call, {
      remaining: () => 100000,
      setTimer: (fn, ms) => {
        timers.push({ fn, ms });
        return 0 as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimer: () => {
        cleared++;
      },
    })(input);

    const signal = call.mock.calls[0][1]!;
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(timers[0].ms).toBe(STRUCTURE_CALL_TIMEOUT_MS);
    // Muvaffaqiyatli chaqiruvdan keyin taymer osilib qolmaydi.
    expect(cleared).toBe(1);
    expect(signal.aborted).toBe(false);
  });

  it("chegara byudjetdan oshmaydi", async () => {
    const timers: number[] = [];
    const call = vi.fn<ModelCaller>().mockResolvedValue({ json: {}, tokens: 0 });

    await withRetry(call, {
      remaining: () => RETRY_RESERVE_MS + 3000,
      setTimer: (fn, ms) => {
        timers.push(ms);
        return 0 as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimer: () => {},
    })(input);

    expect(timers[0]).toBe(3000);
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

  it("o'ralgan xatoning asl sababi ham yoziladi", () => {
    // `TimeBudgetError` ning o'z xabari nima ulgurmaganini aytmaydi —
    // birinchi urinish NEGA yiqilgani faqat `cause` da qoladi.
    const wrapped = toLastError(
      new TimeBudgetError(undefined, { cause: httpError(503, "UNAVAILABLE") }),
      at,
    );

    expect(wrapped).toEqual({
      message: "Vaqt byudjeti tugadi",
      name: "TimeBudgetError",
      causeName: "Error",
      causeMessage: "UNAVAILABLE",
      at: "2026-09-14T10:00:00.000Z",
    });
  });

  it("sabab yo'q bo'lsa cause maydonlari umuman qo'shilmaydi", () => {
    const plain = toLastError(new TimeBudgetError(), at);

    expect(plain).not.toHaveProperty("causeName");
    expect(plain).not.toHaveProperty("causeMessage");
  });

  it("sabab ham redaktsiya qilinadi va qirqiladi", () => {
    const secret = toLastError(
      new TimeBudgetError(undefined, {
        cause: new Error("GET https://generativelanguage.googleapis.com/v1/models?key=AIzaSyTOPSECRET failed"),
      }),
      at,
    );
    expect(secret.causeMessage).not.toContain("AIzaSyTOPSECRET");
    expect(secret.causeMessage).toContain("key=[redacted]");

    const long = toLastError(new TimeBudgetError(undefined, { cause: new Error("x".repeat(2000)) }), at);
    expect(long.causeMessage).toHaveLength(500);
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

describe("vaqt sozlamalari", () => {
  it("standart qiymatlar", () => {
    expect(parseStructureDeadlineMs(undefined)).toBe(40000);
    expect(parseStructureCallTimeoutMs(undefined)).toBe(25000);
    expect(parseStructureBatch(undefined)).toBe(8);
  });

  it("to'g'ri qiymat o'qiladi", () => {
    expect(parseStructureDeadlineMs(" 30000 ")).toBe(30000);
    expect(parseStructureCallTimeoutMs("15000")).toBe(15000);
    expect(parseStructureBatch("4")).toBe(4);
  });

  it("noto'g'ri qiymatda standartga qaytadi", () => {
    // Sozlama xatosi tufayli import butunlay to'xtab qolmasligi kerak.
    for (const raw of ["", "0", "4999", "60000", "abc", "10.5", "-1"]) {
      expect(parseStructureDeadlineMs(raw)).toBe(40000);
      expect(parseStructureCallTimeoutMs(raw)).toBe(25000);
    }
    for (const raw of ["", "0", "41", "abc", "2.5"]) {
      expect(parseStructureBatch(raw)).toBe(8);
    }
  });
});
