import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `db`ni mock qilamiz — real baza kerak emas. Naqsh boshqa cron
 * marshrutlari (`subscription-alerts`) bilan bir xil: `CRON_SECRET`
 * tekshiruvi, so'ng haqiqiy ish.
 */
const {
  findUniqueSettingMock,
  upsertSettingMock,
  groupByMock,
  findManyAttemptMock,
  findManyResultMock,
  upsertItemStatMock,
} = vi.hoisted(() => ({
  findUniqueSettingMock: vi.fn(),
  upsertSettingMock: vi.fn(),
  groupByMock: vi.fn(),
  findManyAttemptMock: vi.fn(),
  findManyResultMock: vi.fn(),
  upsertItemStatMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    systemSetting: {
      findUnique: (...args: unknown[]) => findUniqueSettingMock(...args),
      upsert: (...args: unknown[]) => upsertSettingMock(...args),
    },
    attempt: {
      groupBy: (...args: unknown[]) => groupByMock(...args),
      findMany: (...args: unknown[]) => findManyAttemptMock(...args),
    },
    testResult: {
      findMany: (...args: unknown[]) => findManyResultMock(...args),
    },
    itemStat: {
      upsert: (...args: unknown[]) => upsertItemStatMock(...args),
    },
  },
}));

import { GET } from "../route";

function callCron(secret = "test-secret") {
  const request = new Request("http://localhost/api/cron/item-stats", {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
  return GET(request as any);
}

describe("GET /api/cron/item-stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
    findUniqueSettingMock.mockResolvedValue(null);
    upsertSettingMock.mockResolvedValue({});
    findManyResultMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("CRON_SECRET noto'g'ri bo'lsa 401 qaytaradi va hech narsa hisoblamaydi", async () => {
    const response = await callCron("wrong-secret");
    expect(response.status).toBe(401);
    expect(groupByMock).not.toHaveBeenCalled();
  });

  it("CRON_SECRET umuman sozlanmagan bo'lsa ham 401 qaytaradi", async () => {
    delete process.env.CRON_SECRET;
    const response = await callCron("test-secret");
    expect(response.status).toBe(401);
  });

  it("kamida 20 urinishi bo'lgan itemId'lar uchun so'raydi (having chegarasi)", async () => {
    groupByMock.mockResolvedValue([]);
    await callCron();
    expect(groupByMock).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["itemId"],
        having: { itemId: { _count: { gte: 20 } } },
      })
    );
  });

  it("nomzod topilmasa muvaffaqiyatli bo'sh natija qaytaradi va kursorni tozalaydi", async () => {
    groupByMock.mockResolvedValue([]);
    const response = await callCron();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({ success: true, processed: 0, reachedEnd: true });
    expect(upsertSettingMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "item_stats_cursor" },
        create: { key: "item_stats_cursor", value: "" },
        update: { value: "" },
      })
    );
  });

  it("Attempt'lardan pValue/discrimination/avgTimeSec/distractorHits hisoblab ItemStat'ga yozadi", async () => {
    // 1-chaqiruvda bitta item, 2-chaqiruvda (cursor'dan keyin) bo'sh —
    // shu bitta item uchun to'liq tsikl.
    groupByMock.mockResolvedValueOnce([{ itemId: "item-1", _count: { itemId: 20 } }]).mockResolvedValue([]);

    // groupSize = round(20*0.27) = 5. Yuqori 5 (percentage 100..80) hammasi
    // to'g'ri, quyi 5 (percentage 25..5) hammasi noto'g'ri -> discrimination
    // = 1.0 - 0.0 = 1.0. Jami to'g'ri = 5 (yuqori) + 0 = 5/20 -> pValue=0.25.
    // timeSpentSec hammasi 4 -> avgTimeSec=4. Noto'g'ri javoblar "X" — 15 ta.
    const attempts = Array.from({ length: 20 }, (_, i) => ({
      isCorrect: i < 5,
      answer: i < 5 ? "Y" : "X",
      timeSpentSec: 4,
      testResultId: `result-${i}`,
    }));
    findManyAttemptMock.mockResolvedValue(attempts);
    findManyResultMock.mockImplementation(({ where }: { where: { id: { in: string[] } } }) =>
      Promise.resolve(
        where.id.in.map((id) => {
          const i = Number(id.replace("result-", ""));
          return { id, percentage: 100 - i * 5 };
        })
      )
    );

    const response = await callCron();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({ success: true, processed: 1, reachedEnd: true });
    expect(upsertItemStatMock).toHaveBeenCalledWith({
      where: { itemId: "item-1" },
      create: {
        itemId: "item-1",
        attempts: 20,
        correct: 5,
        pValue: 0.25,
        discrimination: 1,
        avgTimeSec: 4,
        distractorHits: { X: 15 },
      },
      update: {
        attempts: 20,
        correct: 5,
        pValue: 0.25,
        discrimination: 1,
        avgTimeSec: 4,
        distractorHits: { X: 15 },
      },
    });
  });

  it("bitta ishga tushirishda vaqt chegarasidan oshsa, oxirgi ishlangan itemId kursorda saqlanadi (tugallanmagan holat)", async () => {
    let now = 1_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);

    // 25 (BATCH_SIZE) ta itemId qaytaradi — to'liq bo'lak, davom etish
    // kerakligini bildiradi — lekin shu chaqiruv ICHIDA vaqt chegarasi
    // tugaydi (quyida simulyatsiya qilinadi), shuning uchun ikkinchi bo'lak
    // so'ralmaydi.
    const fullBatch = Array.from({ length: 25 }, (_, i) => ({
      itemId: `item-${String(i).padStart(4, "0")}`,
      _count: { itemId: 20 },
    }));
    groupByMock.mockImplementation(() => {
      now += 26_000; // TIME_BUDGET_MS (25s) dan oshadi
      return Promise.resolve(fullBatch);
    });
    findManyAttemptMock.mockResolvedValue(
      Array.from({ length: 20 }, () => ({ isCorrect: true, answer: "", timeSpentSec: 1, testResultId: null }))
    );

    const response = await callCron();
    const data = await response.json();

    expect(data).toMatchObject({ success: true, processed: 25, reachedEnd: false });
    expect(groupByMock).toHaveBeenCalledTimes(1); // ikkinchi bo'lak so'ralmadi
    expect(upsertSettingMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { key: "item_stats_cursor", value: "item-0024" },
        update: { value: "item-0024" },
      })
    );
  });
});
