import { describe, expect, it, vi } from "vitest";
import {
  createChainedCaller,
  DEFAULT_STRUCTURE_MODEL,
  parseStructureModels,
} from "../structure-chain";
import { RateLimitedError } from "../structure-error";
import type { Caller, ModelCaller, StructureInput } from "../structure";
import type { TranslateGroup } from "../translate";

// Zanjir topilmagan modelni `logger.warn` ga yozadi — test Sentry'ga tegmasin.
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  redactSecrets: (text: string) => text,
}));

const input = (order = 0) => ({ order } as StructureInput);

/** Kvota xatosi — Gemini aynan shunday qaytaradi. */
function quota(): Error {
  return Object.assign(
    new Error("[429 Too Many Requests] You exceeded your current quota: generate_content_free_tier_request"),
    { status: 429 },
  );
}

describe("parseStructureModels", () => {
  it("o'zgaruvchi yo'q yoki bo'sh bo'lsa standart model qoladi", () => {
    // Xulq o'zgarmasligi SHART: sozlamasiz deploy avvalgidek ishlashi kerak.
    expect(parseStructureModels(undefined)).toEqual([DEFAULT_STRUCTURE_MODEL]);
    expect(parseStructureModels("")).toEqual([DEFAULT_STRUCTURE_MODEL]);
    expect(parseStructureModels("   ")).toEqual([DEFAULT_STRUCTURE_MODEL]);
  });

  it("bitta va uchta modelni tartibi bilan o'qiydi", () => {
    expect(parseStructureModels("gemini-flash-lite")).toEqual(["gemini-flash-lite"]);
    expect(parseStructureModels("a-lite,b-flash,c-flash")).toEqual(["a-lite", "b-flash", "c-flash"]);
  });

  it("bo'sh elementlar va bo'shliqlar tashlanadi", () => {
    expect(parseStructureModels(" a , , b ,")).toEqual(["a", "b"]);
    // Faqat axlat qolsa — standartga qaytiladi, import to'xtab qolmasin.
    expect(parseStructureModels(",,, ,")).toEqual([DEFAULT_STRUCTURE_MODEL]);
  });
});

describe("parseStructureModels — berilgan standart ro'yxat", () => {
  it("o'zgaruvchi yo'q yoki faqat axlat bo'lsa berilgan ro'yxat qaytadi", () => {
    const fallback = ["lite", "flash"];
    expect(parseStructureModels(undefined, fallback)).toEqual(fallback);
    expect(parseStructureModels(" , ", fallback)).toEqual(fallback);
    // Env berilgan bo'lsa u ustun.
    expect(parseStructureModels("x", fallback)).toEqual(["x"]);
  });
});

describe("createChainedCaller", () => {
  it("birinchi model 429 bersa keyingisi chaqiriladi va natija qaytadi", async () => {
    const first = vi.fn<ModelCaller>().mockRejectedValue(quota());
    const second = vi.fn<ModelCaller>().mockResolvedValue({ json: { text: "ok" }, tokens: 10 });
    const make = vi.fn((model: string) => (model === "a" ? first : second));

    const result = await createChainedCaller(["a", "b"], make)(input());

    expect(result).toEqual({ json: { text: "ok" }, tokens: 10, model: "b" });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("kvotasi tugagan model SHU chaqiruvchi umrida boshqa chaqirilmaydi", async () => {
    // Aks holda har blok uchun qaytadan urinib, vaqt va chegarani yeyardi.
    const first = vi.fn<ModelCaller>().mockRejectedValue(quota());
    const second = vi.fn<ModelCaller>().mockResolvedValue({ json: {}, tokens: 1 });
    const caller = createChainedCaller(["a", "b"], (model) => (model === "a" ? first : second));

    await caller(input(0));
    await caller(input(1));
    await caller(input(2));

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(3);
  });

  it("hamma model 429 bersa RateLimitedError otiladi", async () => {
    const error = quota();
    const call = vi.fn<ModelCaller>().mockRejectedValue(error);

    const failure = await createChainedCaller(["a", "b"], () => call)(input()).catch((e) => e);

    expect(failure).toBeInstanceOf(RateLimitedError);
    // Asl sabab yo'qolmaydi — marshrut uni `raw.lastError` ga yozadi.
    expect((failure as RateLimitedError).cause).toBe(error);
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("kvotadan boshqa xatoda model ALMASHMAYDI", async () => {
    // 400 yoki sxema xatosi modelga bog'liq emas: zanjirni aylantirish
    // xatoni tuzatmaydi, faqat kvotani yeydi.
    const first = vi.fn<ModelCaller>().mockRejectedValue(Object.assign(new Error("bad request"), { status: 400 }));
    const second = vi.fn<ModelCaller>().mockResolvedValue({ json: {}, tokens: 1 });

    await expect(
      createChainedCaller(["a", "b"], (model) => (model === "a" ? first : second))(input()),
    ).rejects.toThrow("bad request");

    expect(second).not.toHaveBeenCalled();
  });

  it("har model uchun chaqiruvchi bir marta yasaladi", async () => {
    const call = vi.fn<ModelCaller>().mockResolvedValue({ json: {}, tokens: 1 });
    const make = vi.fn(() => call);
    const caller = createChainedCaller(["a"], make);

    await caller(input(0));
    await caller(input(1));

    expect(make).toHaveBeenCalledTimes(1);
  });

  it("signal chaqiruvchiga uzatiladi", async () => {
    const call = vi.fn<ModelCaller>().mockResolvedValue({ json: {}, tokens: 1 });
    const controller = new AbortController();

    await createChainedCaller(["a"], () => call)(input(), controller.signal);

    expect(call).toHaveBeenCalledWith(expect.objectContaining({ order: 0 }), controller.signal);
  });
});

/** Google mavjud bo'lmagan model uchun aynan shunday qaytaradi. */
function notFound(): Error {
  return Object.assign(
    new Error("[404 Not Found] models/gemini-x is not found for API version v1beta"),
    { status: 404 },
  );
}

// Strukturalash (S4) va tarjima (S5) bir xil zanjirdan foydalanadi — "model
// topilmadi" xulqi ikkalasida ham tekshiriladi.
describe.each([
  { stage: "strukturalash", makeInput: () => ({ order: 0 } as StructureInput) },
  { stage: "tarjima", makeInput: () => ({} as TranslateGroup) },
] as const)("createChainedCaller — model topilmadi ($stage)", ({ makeInput }) => {
  type Input = ReturnType<typeof makeInput>;
  const ok = { json: { text: "ok" }, tokens: 5 };

  it("o'rtadagi model 404 bersa keyingisi chaqiriladi va u qayta sinalmaydi", async () => {
    const a = vi.fn<Caller<Input>>().mockRejectedValue(quota());
    const b = vi.fn<Caller<Input>>().mockRejectedValue(notFound());
    const c = vi.fn<Caller<Input>>().mockResolvedValue(ok);
    const byName: Record<string, Caller<Input>> = { a, b, c };
    const caller = createChainedCaller<Input>(["a", "b", "c"], (m) => byName[m]);

    expect(await caller(makeInput())).toEqual({ ...ok, model: "c" });
    await caller(makeInput());

    expect(b).toHaveBeenCalledTimes(1);
    expect(c).toHaveBeenCalledTimes(2);
  });

  it("NOT_FOUND matnli 400 da ham keyingisiga o'tiladi", async () => {
    const a = vi.fn<Caller<Input>>().mockRejectedValue(
      Object.assign(new Error("[400 Bad Request] NOT_FOUND: model not available"), { status: 400 }),
    );
    const b = vi.fn<Caller<Input>>().mockResolvedValue(ok);

    const result = await createChainedCaller<Input>(["a", "b"], (m) => (m === "a" ? a : b))(makeInput());

    expect(result.model).toBe("b");
  });

  it("oddiy 400 da zanjir to'xtaydi", async () => {
    const a = vi.fn<Caller<Input>>().mockRejectedValue(
      Object.assign(new Error("[400 Bad Request] invalid schema"), { status: 400 }),
    );
    const b = vi.fn<Caller<Input>>().mockResolvedValue(ok);

    await expect(
      createChainedCaller<Input>(["a", "b"], (m) => (m === "a" ? a : b))(makeInput()),
    ).rejects.toThrow("invalid schema");
    expect(b).not.toHaveBeenCalled();
  });

  it("404 va 429 aralash tugasa — kvota (RateLimitedError, sababi 429)", async () => {
    const limit = quota();
    const a = vi.fn<Caller<Input>>().mockRejectedValue(limit);
    const b = vi.fn<Caller<Input>>().mockRejectedValue(notFound());

    const failure = await createChainedCaller<Input>(["a", "b"], (m) => (m === "a" ? a : b))(makeInput()).catch(
      (e: unknown) => e,
    );

    expect(failure).toBeInstanceOf(RateLimitedError);
    expect((failure as RateLimitedError).cause).toBe(limit);
  });

  it("hamma model topilmasa kvota EMAS, asl xato otiladi — keyingi chaqiruvda ham", async () => {
    const error = notFound();
    const call = vi.fn<Caller<Input>>().mockRejectedValue(error);
    const caller = createChainedCaller<Input>(["a", "b"], () => call);

    await expect(caller(makeInput())).rejects.toBe(error);
    // Hamma model belgilangan — lekin sabab yo'qolmaydi.
    await expect(caller(makeInput())).rejects.toBe(error);
    expect(call).toHaveBeenCalledTimes(2);
  });
});

