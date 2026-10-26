import { describe, expect, it } from "vitest";
import { daysLeft, daysSince, daysUntil, formatTashkentDate, tashkentDateKey, tashkentDayRangeUtc, tashkentRelativeDay } from "../date";

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

describe("daysUntil", () => {
  it("Toshkent 00:30 — kun allaqachon almashgan, UTC hali kechagi kunda", () => {
    // 2026-10-21T19:30Z = 2026-10-22 00:30 Tashkent
    expect(daysUntil("2026-10-23", new Date("2026-10-21T19:30:00.000Z"))).toBe(1);
  });

  it("Toshkent 23:59 — hali eski kun", () => {
    // 2026-10-21T18:59Z = 2026-10-21 23:59 Tashkent
    expect(daysUntil("2026-10-23", new Date("2026-10-21T18:59:00.000Z"))).toBe(2);
  });

  it("bugungi sana — 0", () => {
    expect(daysUntil("2026-10-22", new Date("2026-10-21T19:30:00.000Z"))).toBe(0);
  });

  it("o'tgan sana — null", () => {
    expect(daysUntil("2026-10-21", new Date("2026-10-21T19:30:00.000Z"))).toBeNull();
  });

  it("yil almashuvi", () => {
    expect(daysUntil("2027-01-01", new Date("2026-12-30T12:00:00.000Z"))).toBe(2);
  });

  it("noto'g'ri format, mavjud bo'lmagan sana va bo'sh qiymat — null", () => {
    const now = new Date("2026-01-10T12:00:00.000Z");
    expect(daysUntil("", now)).toBeNull();
    expect(daysUntil(null, now)).toBeNull();
    expect(daysUntil("15.01.2027", now)).toBeNull();
    expect(daysUntil("2027-02-30", now)).toBeNull();
  });
});

describe("tashkentRelativeDay", () => {
  it("Toshkent 00:30 da kechagi 23:00 — 'kecha', UTC bo'yicha bir kun bo'lsa ham", () => {
    const now = new Date("2026-10-21T19:30:00.000Z"); // 22-oktabr 00:30
    expect(tashkentRelativeDay(new Date("2026-10-21T18:00:00.000Z"), now)).toBe(1); // 21-oktabr 23:00
  });

  it("Toshkent 00:30 da 00:10 — 'bugun'", () => {
    const now = new Date("2026-10-21T19:30:00.000Z");
    expect(tashkentRelativeDay(new Date("2026-10-21T19:10:00.000Z"), now)).toBe(0);
  });

  it("3 kun oldin, timestamp son ko'rinishida", () => {
    const now = new Date("2026-10-22T10:00:00.000Z");
    expect(tashkentRelativeDay(new Date("2026-10-19T10:00:00.000Z").getTime(), now)).toBe(3);
  });

  it("noto'g'ri sana va kelajak — null", () => {
    const now = new Date("2026-10-22T10:00:00.000Z");
    expect(tashkentRelativeDay("abc", now)).toBeNull();
    expect(tashkentRelativeDay(new Date("2026-10-24T10:00:00.000Z"), now)).toBeNull();
  });
});

describe("formatTashkentDate", () => {
  it("uz: oy nomini o'zimiz beramiz — brauzer ICU'sidagi \"M11\" emas", () => {
    expect(formatTashkentDate(new Date("2026-11-24T07:00:00.000Z"), "uz")).toBe("24-noyabr");
    expect(formatTashkentDate("2026-11-24T07:00:00.000Z", "uz", true)).toBe("24-noyabr, 2026");
  });
  it("uz: oy va yil chegaralari", () => {
    expect(formatTashkentDate(new Date("2026-10-31T10:00:00.000Z"), "uz")).toBe("31-oktabr");
    expect(formatTashkentDate(new Date("2026-11-01T10:00:00.000Z"), "uz")).toBe("1-noyabr");
    expect(formatTashkentDate(new Date("2026-12-31T10:00:00.000Z"), "uz", true)).toBe("31-dekabr, 2026");
    expect(formatTashkentDate(new Date("2027-01-01T10:00:00.000Z"), "uz", true)).toBe("1-yanvar, 2027");
  });
  it("UTC 19:00–23:59 Toshkentda ertangi kun (oy va yil oshib o'tishi bilan)", () => {
    expect(formatTashkentDate(new Date("2026-10-31T19:00:00.000Z"), "uz")).toBe("1-noyabr");
    expect(formatTashkentDate(new Date("2026-12-31T23:59:00.000Z"), "uz", true)).toBe("1-yanvar, 2027");
    expect(formatTashkentDate(new Date("2026-10-31T18:59:00.000Z"), "uz")).toBe("31-oktabr");
  });
  it("ru/en — Intl, Toshkent kuni bilan", () => {
    expect(formatTashkentDate(new Date("2026-10-31T19:00:00.000Z"), "ru")).toBe("1 ноября");
    expect(formatTashkentDate(new Date("2026-10-31T19:00:00.000Z"), "en", true)).toBe("November 1, 2026");
  });
});

describe("daysLeft", () => {
  const now = new Date("2026-10-24T19:30:00.000Z"); // 25-oktabr 00:30
  it("bugun tugasa 0, ertaga 1 — soatlar emas kalendar kunlari", () => {
    expect(daysLeft(new Date("2026-10-25T18:00:00.000Z"), now)).toBe(0); // 25-oktabr 23:00
    expect(daysLeft(new Date("2026-10-24T19:40:00.000Z"), now)).toBe(0); // 10 daqiqadan keyin, shu kun
    expect(daysLeft(new Date("2026-10-25T19:10:00.000Z"), now)).toBe(1); // 26-oktabr 00:10
  });
  it("tugagan obuna — manfiy, oy chegarasidan o'tib ham", () => {
    expect(daysLeft(new Date("2026-10-24T18:00:00.000Z"), now)).toBe(-1);
    expect(daysLeft("2026-11-10T07:00:00.000Z", now)).toBe(16);
  });
});
