import { describe, expect, it, vi } from "vitest";
import {
  createChainedCaller,
  DEFAULT_STRUCTURE_MODEL,
  parseStructureModels,
} from "../structure-chain";
import { RateLimitedError } from "../structure-error";
import type { ModelCaller, StructureInput } from "../structure";

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
