import { describe, expect, it } from "vitest";
import { resolveDraftStartTime } from "../sessionDraft";

describe("resolveDraftStartTime", () => {
  it("qoralamada startTime bo'lsa o'shani qaytaradi — handleFinish umumiy vaqtni shundan hisoblaydi", () => {
    expect(resolveDraftStartTime(1_700_000_000_000, 999)).toBe(1_700_000_000_000);
  });

  it("eski qoralama (startTime maydoni yo'q) fallbackka tushadi", () => {
    expect(resolveDraftStartTime(undefined, 999)).toBe(999);
  });

  it("buzilgan qiymatlar (son emas, manfiy, NaN) fallbackka tushadi", () => {
    expect(resolveDraftStartTime("not-a-number", 999)).toBe(999);
    expect(resolveDraftStartTime(-5, 999)).toBe(999);
    expect(resolveDraftStartTime(NaN, 999)).toBe(999);
    expect(resolveDraftStartTime(0, 999)).toBe(999);
  });
});
