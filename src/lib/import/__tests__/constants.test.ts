import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_FREE_DAILY_IMPORTS, parseDailyImportLimit } from "../constants";

describe("parseDailyImportLimit", () => {
  it("to'g'ri musbat butun sonni o'qiydi", () => {
    expect(parseDailyImportLimit("5")).toBe(5);
    expect(parseDailyImportLimit("1")).toBe(1);
    expect(parseDailyImportLimit("999")).toBe(999);
  });

  it("atrofidagi bo'shliqlarni kechiradi", () => {
    expect(parseDailyImportLimit("  7  ")).toBe(7);
  });

  it("o'zgaruvchi berilmasa zaxira qiymatni qaytaradi", () => {
    expect(parseDailyImportLimit(undefined)).toBe(DEFAULT_FREE_DAILY_IMPORTS);
  });

  // Bu qiymatlarning hammasi ilgari `Number()` orqali jimgina 0 yoki NaN
  // bo'lib ketishi mumkin edi — 0 limit importni butunlay to'sib qo'yardi.
  it.each([
    ["bo'sh satr", ""],
    ["faqat bo'shliq", "   "],
    ["son emas", "abc"],
    ["nol", "0"],
    ["manfiy", "-1"],
    ["kasr", "2.5"],
    ["yarim son", "3abc"],
    ["NaN", "NaN"],
    ["Infinity", "Infinity"],
  ])("noto'g'ri qiymat (%s) da zaxira qiymat ishlatiladi", (_nom, raw) => {
    expect(parseDailyImportLimit(raw)).toBe(DEFAULT_FREE_DAILY_IMPORTS);
  });

  it("zaxira qiymat 2 — kvota kodda qanday bo'lgan bo'lsa shunday qoladi", () => {
    expect(DEFAULT_FREE_DAILY_IMPORTS).toBe(2);
  });
});

describe("FREE_DAILY_IMPORTS muhitdan o'qilishi", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  /** Konstanta modul yuklanganda hisoblanadi — shuning uchun har tekshiruv
   * uchun modul qaytadan import qilinadi. */
  const reload = async () => {
    vi.resetModules();
    return (await import("../constants")).FREE_DAILY_IMPORTS;
  };

  it("muhitdagi qiymatni oladi", async () => {
    vi.stubEnv("FREE_DAILY_IMPORTS", "25");
    expect(await reload()).toBe(25);
  });

  it("muhitdagi qiymat noto'g'ri bo'lsa zaxira qiymatga qaytadi", async () => {
    vi.stubEnv("FREE_DAILY_IMPORTS", "cheksiz");
    expect(await reload()).toBe(DEFAULT_FREE_DAILY_IMPORTS);
  });

  it("o'zgaruvchi umuman berilmasa zaxira qiymat ishlaydi", async () => {
    vi.stubEnv("FREE_DAILY_IMPORTS", undefined as unknown as string);
    expect(await reload()).toBe(DEFAULT_FREE_DAILY_IMPORTS);
  });
});
