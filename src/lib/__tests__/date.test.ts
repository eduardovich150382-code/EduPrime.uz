import { describe, expect, it } from "vitest";
import { daysSince, tashkentDateKey, tashkentDayRangeUtc } from "../date";

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

describe("tashkentDayRangeUtc", () => {
  it("daysAgo=0 — Tashkent kuni tush paytida chaqirilsa, o'sha kunning to'liq [00:00,24:00) Tashkent oralig'ini beradi", () => {
    // 2026-08-26T10:00:00Z + 5soat = 2026-08-26T15:00 Tashkent — hali o'sha kun
    const { start, end } = tashkentDayRangeUtc(0, new Date("2026-08-26T10:00:00.000Z"));
    expect(start.toISOString()).toBe("2026-08-25T19:00:00.000Z"); // 2026-08-26T00:00 Tashkent
    expect(end.toISOString()).toBe("2026-08-26T19:00:00.000Z"); // 2026-08-27T00:00 Tashkent
  });

  it("daysAgo=1 — 'kecha'ni bir kun orqaga suradi", () => {
    const { start, end } = tashkentDayRangeUtc(1, new Date("2026-08-26T10:00:00.000Z"));
    expect(start.toISOString()).toBe("2026-08-24T19:00:00.000Z");
    expect(end.toISOString()).toBe("2026-08-25T19:00:00.000Z");
  });

  it("Tashkent kun chegarasiga yaqin chaqiruv ham to'g'ri kunni tanlaydi (UTC kechqurun, Tashkent allaqachon ertasi kun)", () => {
    // 2026-08-25T23:30:00Z + 5soat = 2026-08-26T04:30 Tashkent — 'bugun' allaqachon 26-avgust
    const { start, end } = tashkentDayRangeUtc(0, new Date("2026-08-25T23:30:00.000Z"));
    expect(start.toISOString()).toBe("2026-08-25T19:00:00.000Z");
    expect(end.toISOString()).toBe("2026-08-26T19:00:00.000Z");
  });

  it("oy/yil chegarasidan o'tganda ham to'g'ri ishlaydi", () => {
    const { start, end } = tashkentDayRangeUtc(1, new Date("2026-01-01T02:00:00.000Z")); // Tashkent: 2026-01-01T07:00
    expect(start.toISOString()).toBe("2025-12-30T19:00:00.000Z"); // 2025-12-31T00:00 Tashkent
    expect(end.toISOString()).toBe("2025-12-31T19:00:00.000Z");
  });

  it("oraliq aynan 24 soat", () => {
    const { start, end } = tashkentDayRangeUtc(0, new Date("2026-05-10T12:00:00.000Z"));
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});
