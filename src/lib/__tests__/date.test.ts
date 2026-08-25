import { describe, expect, it } from "vitest";
import { daysSince, tashkentDateKey } from "../date";

describe("tashkentDateKey", () => {
  it("UTC 23:30 — Tashkent'da ertasi kun ertalabki soatlarda (04:30)", () => {
    // 2026-08-25T23:30:00Z + 5soat = 2026-08-26T04:30 Tashkent
    expect(tashkentDateKey(new Date("2026-08-25T23:30:00.000Z"))).toBe("2026-08-26");
  });

  it("UTC 19:00 — aynan Tashkent kuni almashadigan chegara (00:00)", () => {
    // 2026-08-25T19:00:00Z + 5soat = 2026-08-26T00:00 Tashkent — yangi kun boshlanadi
    expect(tashkentDateKey(new Date("2026-08-25T19:00:00.000Z"))).toBe("2026-08-26");
  });

  it("UTC 18:59 — chegaradan bir daqiqa oldin hali eski kun (23:59)", () => {
    expect(tashkentDateKey(new Date("2026-08-25T18:59:00.000Z"))).toBe("2026-08-25");
  });

  it("UTC 19:01 — chegaradan bir daqiqa keyin yangi kun (00:01)", () => {
    expect(tashkentDateKey(new Date("2026-08-25T19:01:00.000Z"))).toBe("2026-08-26");
  });

  it("yil almashuvi — UTC 20:00, 31-dekabr kechqurun Tashkent'da 1-yanvar", () => {
    // 2025-12-31T20:00:00Z + 5soat = 2026-01-01T01:00 Tashkent
    expect(tashkentDateKey(new Date("2025-12-31T20:00:00.000Z"))).toBe("2026-01-01");
  });

  it("yil almashuvidan oldin — UTC 18:00, 31-dekabr hali o'sha yilda", () => {
    // 2025-12-31T18:00:00Z + 5soat = 2025-12-31T23:00 Tashkent
    expect(tashkentDateKey(new Date("2025-12-31T18:00:00.000Z"))).toBe("2025-12-31");
  });

  it("UTC tush payti — offset kun chegarasidan uzoq bo'lganda ham to'g'ri", () => {
    expect(tashkentDateKey(new Date("2026-03-15T12:00:00.000Z"))).toBe("2026-03-15");
  });
});

describe("daysSince", () => {
  it("bir xil vaqt uchun 0 qaytaradi", () => {
    const now = new Date("2026-08-26T10:00:00.000Z");
    expect(daysSince(now, now)).toBe(0);
  });

  it("29 kun oldingi sana uchun 30 dan kam qiymat qaytaradi", () => {
    const now = new Date("2026-08-26T00:00:00.000Z");
    const usedAt = new Date("2026-07-28T00:00:00.000Z"); // 29 kun oldin
    expect(daysSince(usedAt, now)).toBeLessThan(30);
  });

  it("30 kundan ortiq oldingi sana uchun 30 dan katta qiymat qaytaradi", () => {
    const now = new Date("2026-08-26T00:00:00.000Z");
    const usedAt = new Date("2026-07-20T00:00:00.000Z"); // 37 kun oldin
    expect(daysSince(usedAt, now)).toBeGreaterThan(30);
  });
});
