import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `db`ni to'liq xotiradagi (in-memory) fake bilan almashtiramiz — baza
 * kerak emas, lekin `upsert`/`increment` semantikasi HAQIQIY Postgres
 * xatti-harakatiga yaqin qayta hosil qilinadi (atomik increment), shu
 * bilan "poyga sharti" testlari ma'noga ega bo'ladi. Naqsh
 * `access.test.ts` bilan bir xil: `../db`ni mock qilamiz, `hasActiveSubscription`
 * (lib/access.ts) shu mock'langan `db`dan o'zi foydalanadi — alohida
 * mock kerak emas.
 *
 * `vi.mock` chaqiruvi fayl boshiga ko'chiriladi (hoisting) — shu sababli
 * mock ichida ishlatiladigan holat (Map'lar, `fakeDb`) ham `vi.hoisted`
 * ichida yaratiladi, aks holda hali ishga tushmagan `const`ga murojaat
 * qilingan bo'lardi.
 */
const { fakeDb, testSessions } = vi.hoisted(() => {
  interface FakeDailyUsageRow {
    id: string;
    userId: string;
    date: Date;
    builtTests: number;
    dtmOnline: number;
    solutionsUnlocked: number;
    tutorMessages: number;
  }
  interface FakeSolutionUnlockRow {
    userId: string;
    itemId: string;
    unlockedAt: Date;
  }

  const users = new Map<string, { role: string }>();
  const subscriptions: { userId: string; isActive: boolean; endDate: Date; plan: string }[] = [];
  const dailyUsage = new Map<string, FakeDailyUsageRow>();
  const solutionUnlock = new Map<string, FakeSolutionUnlockRow>();
  const testSessions = new Map<string, { userId: string; startedAt: Date }>();
  let nextId = 1;

  const dailyUsageKey = (userId: string, date: Date) => `${userId}|${date.toISOString()}`;
  const unlockKey = (userId: string, itemId: string) => `${userId}|${itemId}`;

  const applyOp = (row: FakeDailyUsageRow, field: string, op: unknown) => {
    if (op && typeof op === "object" && "increment" in (op as Record<string, unknown>)) {
      (row as unknown as Record<string, number>)[field] += (op as { increment: number }).increment;
    } else if (op && typeof op === "object" && "decrement" in (op as Record<string, unknown>)) {
      (row as unknown as Record<string, number>)[field] -= (op as { decrement: number }).decrement;
    } else {
      (row as unknown as Record<string, unknown>)[field] = op;
    }
  };

  const fakeDb = {
    __users: users,
    __subscriptions: subscriptions,
    __dailyUsage: dailyUsage,
    __solutionUnlock: solutionUnlock,
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const u = users.get(where.id);
        return u ? { role: u.role } : null;
      },
    },
    subscription: {
      findMany: async ({
        where,
      }: {
        where: { userId: string; isActive: boolean; endDate: { gte: Date } };
      }) =>
        subscriptions
          .filter((s) => s.userId === where.userId)
          .filter((s) => s.isActive === where.isActive)
          .filter((s) => s.endDate.getTime() >= where.endDate.gte.getTime())
          .map((s) => ({ plan: s.plan })),
    },
    dailyUsage: {
      upsert: async ({
        where,
        update,
        create,
      }: {
        where: { userId_date: { userId: string; date: Date } };
        update: Record<string, unknown>;
        create: Record<string, unknown>;
      }) => {
        const key = dailyUsageKey(where.userId_date.userId, where.userId_date.date);
        let row = dailyUsage.get(key);
        if (!row) {
          row = {
            id: `usage-${nextId++}`,
            userId: where.userId_date.userId,
            date: where.userId_date.date,
            builtTests: 0,
            dtmOnline: 0,
            solutionsUnlocked: 0,
            tutorMessages: 0,
          };
          for (const [k, v] of Object.entries(create)) {
            if (k === "userId" || k === "date") continue;
            (row as unknown as Record<string, unknown>)[k] = v;
          }
          dailyUsage.set(key, row);
        } else {
          for (const [k, v] of Object.entries(update)) applyOp(row, k, v);
        }
        return { ...row };
      },
      findUnique: async ({ where }: { where: { userId_date: { userId: string; date: Date } } }) => {
        const row = dailyUsage.get(dailyUsageKey(where.userId_date.userId, where.userId_date.date));
        return row ? { ...row } : null;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { userId: string; date: Date; builtTests?: { gt: number }; solutionsUnlocked?: { gt: number } };
        data: Record<string, unknown>;
      }) => {
        let count = 0;
        for (const row of dailyUsage.values()) {
          if (row.userId !== where.userId || row.date.getTime() !== where.date.getTime()) continue;
          if (where.builtTests && !(row.builtTests > where.builtTests.gt)) continue;
          if (where.solutionsUnlocked && !(row.solutionsUnlocked > where.solutionsUnlocked.gt)) continue;
          for (const [k, v] of Object.entries(data)) applyOp(row, k, v);
          count++;
        }
        return { count };
      },
    },
    solutionUnlock: {
      findUnique: async ({ where }: { where: { userId_itemId: { userId: string; itemId: string } } }) => {
        const row = solutionUnlock.get(unlockKey(where.userId_itemId.userId, where.userId_itemId.itemId));
        return row ? { ...row } : null;
      },
      create: async ({ data }: { data: { userId: string; itemId: string } }) => {
        const key = unlockKey(data.userId, data.itemId);
        if (solutionUnlock.has(key)) {
          // Haqiqiy Prisma unique-constraint xatosining minimal fake'i —
          // quota.ts `.code === 'P2002'` orqali (instanceof emas) aniqlaydi.
          throw { code: "P2002", message: "Unique constraint failed" };
        }
        const row = { ...data, unlockedAt: new Date() };
        solutionUnlock.set(key, row);
        return row;
      },
      findMany: async ({ where }: { where: { userId: string; itemId: { in: string[] } } }) =>
        Array.from(solutionUnlock.values()).filter(
          (r) => r.userId === where.userId && where.itemId.in.includes(r.itemId)
        ),
    },
    testSession: {
      findUnique: async ({ where }: { where: { id: string } }) => testSessions.get(where.id) ?? null,
    },
  };

  return { fakeDb, testSessions };
});

vi.mock("../db", () => ({ db: fakeDb }));

import {
  consumeBuiltTest,
  consumeSolution,
  getSolutionQuotaStatus,
  getUnlockedItemIds,
  refundBuiltTest,
  FREE_DAILY_BUILT_TESTS,
  FREE_DAILY_SOLUTIONS,
} from "../quota";

beforeEach(() => {
  fakeDb.__users.clear();
  fakeDb.__subscriptions.length = 0;
  fakeDb.__dailyUsage.clear();
  fakeDb.__solutionUnlock.clear();
  testSessions.clear();
  vi.useRealTimers();
});

describe("consumeBuiltTest", () => {
  it(`bepul foydalanuvchi kuniga ${FREE_DAILY_BUILT_TESTS} tagacha ruxsat oladi, keyingisi rad etiladi`, async () => {
    vi.setSystemTime(new Date("2026-08-31T10:00:00.000Z"));
    for (let i = 1; i <= FREE_DAILY_BUILT_TESTS; i++) {
      const r = await consumeBuiltTest("user-1");
      expect(r.allowed).toBe(true);
      expect(r.usedToday).toBe(i);
    }
    const over = await consumeBuiltTest("user-1");
    expect(over.allowed).toBe(false);
    expect(over.usedToday).toBe(FREE_DAILY_BUILT_TESTS);
  });

  it("PREMIUM obunachi uchun cheklovsiz — DailyUsage yozuvi ochilmaydi", async () => {
    vi.setSystemTime(new Date("2026-08-31T10:00:00.000Z"));
    fakeDb.__subscriptions.push({
      userId: "user-2",
      isActive: true,
      endDate: new Date("2030-01-01"),
      plan: "PREMIUM",
    });
    const r = await consumeBuiltTest("user-2");
    expect(r).toEqual({ allowed: true, usedToday: 0, limit: null });
    expect(fakeDb.__dailyUsage.size).toBe(0);
  });

  it("ADMIN uchun cheklovsiz", async () => {
    vi.setSystemTime(new Date("2026-08-31T10:00:00.000Z"));
    fakeDb.__users.set("admin-1", { role: "ADMIN" });
    const r = await consumeBuiltTest("admin-1");
    expect(r).toEqual({ allowed: true, usedToday: 0, limit: null });
  });

  it("kun chegarasi Tashkent (UTC+5) bo'yicha — UTC 21:00 (Tashkent ertasi kuni 02:00) 'bugun' sifatida keyingi kunga yoziladi", async () => {
    // 2026-08-31T21:00:00Z == 2026-09-01T02:00:00 Tashkent — UTC kun hali
    // 08-31, lekin Tashkent kuni allaqachon 09-01. Naiv UTC-asosli hisob
    // buni noto'g'ri "08-31"ga yozgan bo'lardi.
    vi.setSystemTime(new Date("2026-08-31T21:00:00.000Z"));
    await consumeBuiltTest("user-3");
    const row = Array.from(fakeDb.__dailyUsage.values())[0];
    expect(row.date.toISOString().slice(0, 10)).toBe("2026-09-01");
  });

  it("bir vaqtda ikkita chaqiruv kelsa ham kvota ikki marta o'tib ketmaydi (ketma-ket atomik increment)", async () => {
    vi.setSystemTime(new Date("2026-08-31T10:00:00.000Z"));
    // Haqiqiy parallel so'rovlarda Postgres qator qulfi ularni ketma-ket
    // qo'llaydi — shu sababli har biri O'ZIGA XOS ortgan qiymatni oladi
    // (hech qachon ikkalasi ham "1" yoki ikkalasi ham eski qiymatni
    // ko'rmaydi). Fake `upsert` ham shu semantikani saqlaydi.
    const results = await Promise.all([
      consumeBuiltTest("user-4"),
      consumeBuiltTest("user-4"),
      consumeBuiltTest("user-4"),
      consumeBuiltTest("user-4"),
    ]);
    const usedValues = results.map((r) => r.usedToday).sort();
    // 4 marta chaqirilgan (limit 3) — usedToday qiymatlari 1,2,3,3 bo'lishi
    // kerak (4-chaqiruv rad etiladi, lekin usedToday limitga qisqartiriladi).
    expect(usedValues).toEqual([1, 2, 3, 3]);
    expect(results.filter((r) => r.allowed).length).toBe(FREE_DAILY_BUILT_TESTS);
  });
});

describe("refundBuiltTest", () => {
  it("sessiya 2 daqiqa ICHIDA hech qanday javobsiz tashlansa kvota qaytariladi", async () => {
    vi.setSystemTime(new Date("2026-08-31T10:00:00.000Z"));
    await consumeBuiltTest("user-5");
    testSessions.set("session-1", {
      userId: "user-5",
      startedAt: new Date("2026-08-31T10:00:00.000Z"),
    });

    vi.setSystemTime(new Date("2026-08-31T10:01:30.000Z")); // 90s keyin — oyna ichida
    await refundBuiltTest("session-1");

    const row = Array.from(fakeDb.__dailyUsage.values())[0];
    expect(row.builtTests).toBe(0);
  });

  it("2 daqiqadan keyin chaqirilsa qaytarilmaydi", async () => {
    vi.setSystemTime(new Date("2026-08-31T10:00:00.000Z"));
    await consumeBuiltTest("user-6");
    testSessions.set("session-2", {
      userId: "user-6",
      startedAt: new Date("2026-08-31T10:00:00.000Z"),
    });

    vi.setSystemTime(new Date("2026-08-31T10:05:00.000Z")); // 5 daqiqa keyin
    await refundBuiltTest("session-2");

    const row = Array.from(fakeDb.__dailyUsage.values())[0];
    expect(row.builtTests).toBe(1);
  });

  it("mavjud bo'lmagan sessiyada xatosiz hech narsa qilmaydi", async () => {
    await expect(refundBuiltTest("no-such-session")).resolves.toBeUndefined();
  });
});

describe("consumeSolution", () => {
  it(`bepul foydalanuvchi kuniga ${FREE_DAILY_SOLUTIONS} tagacha yechim ochadi, keyingisi rad etiladi`, async () => {
    vi.setSystemTime(new Date("2026-08-31T10:00:00.000Z"));
    for (let i = 1; i <= FREE_DAILY_SOLUTIONS; i++) {
      const r = await consumeSolution("user-7", `item-${i}`);
      expect(r.allowed).toBe(true);
      expect(r.alreadyUnlocked).toBe(false);
    }
    const over = await consumeSolution("user-7", "item-overflow");
    expect(over.allowed).toBe(false);
    expect(fakeDb.__solutionUnlock.has("user-7|item-overflow")).toBe(false);
  });

  it("allaqachon ochilgan savol qayta hisoblanmaydi", async () => {
    vi.setSystemTime(new Date("2026-08-31T10:00:00.000Z"));
    await consumeSolution("user-8", "item-1");
    const afterFirst = Array.from(fakeDb.__dailyUsage.values())[0].solutionsUnlocked;
    expect(afterFirst).toBe(1);

    const second = await consumeSolution("user-8", "item-1");
    expect(second.allowed).toBe(true);
    expect(second.alreadyUnlocked).toBe(true);

    const afterSecond = Array.from(fakeDb.__dailyUsage.values())[0].solutionsUnlocked;
    expect(afterSecond).toBe(1); // o'zgarmadi
  });

  it("PREMIUM/TEACHER/ADMIN uchun cheklovsiz", async () => {
    vi.setSystemTime(new Date("2026-08-31T10:00:00.000Z"));
    fakeDb.__subscriptions.push({
      userId: "user-9",
      isActive: true,
      endDate: new Date("2030-01-01"),
      plan: "TEACHER_PLAN",
    });
    for (let i = 0; i < FREE_DAILY_SOLUTIONS + 5; i++) {
      const r = await consumeSolution("user-9", `item-${i}`);
      expect(r.allowed).toBe(true);
      expect(r.limit).toBeNull();
    }
    expect(fakeDb.__dailyUsage.size).toBe(0);
  });

  it("bir xil itemId'ga parallel ikkita so'rov — faqat bittasi haqiqatan sarflaydi, ikkinchisi kvotani qaytaradi", async () => {
    vi.setSystemTime(new Date("2026-08-31T10:00:00.000Z"));
    const [a, b] = await Promise.all([
      consumeSolution("user-10", "item-shared"),
      consumeSolution("user-10", "item-shared"),
    ]);
    const allowedCount = [a, b].filter((r) => r.allowed).length;
    expect(allowedCount).toBe(2); // ikkalasi ham "allowed" (biri yangi, biri alreadyUnlocked)
    const row = Array.from(fakeDb.__dailyUsage.values())[0];
    expect(row.solutionsUnlocked).toBe(1); // faqat bitta haqiqiy sarf qoladi
  });
});

describe("getSolutionQuotaStatus / getUnlockedItemIds", () => {
  it("hech narsa sarflanmagan bo'lsa 0/10 qaytaradi", async () => {
    vi.setSystemTime(new Date("2026-08-31T10:00:00.000Z"));
    const status = await getSolutionQuotaStatus("user-11");
    expect(status).toEqual({ usedToday: 0, limit: FREE_DAILY_SOLUTIONS });
  });

  it("sarflangandan keyin to'g'ri sonni qaytaradi", async () => {
    vi.setSystemTime(new Date("2026-08-31T10:00:00.000Z"));
    await consumeSolution("user-12", "item-1");
    await consumeSolution("user-12", "item-2");
    const status = await getSolutionQuotaStatus("user-12");
    expect(status).toEqual({ usedToday: 2, limit: FREE_DAILY_SOLUTIONS });
  });

  it("PREMIUM uchun cheklovsiz holatni qaytaradi", async () => {
    fakeDb.__subscriptions.push({
      userId: "user-13",
      isActive: true,
      endDate: new Date("2030-01-01"),
      plan: "PREMIUM",
    });
    const status = await getSolutionQuotaStatus("user-13");
    expect(status).toEqual({ usedToday: 0, limit: null });
  });

  it("faqat ochilgan itemId'larni qaytaradi", async () => {
    vi.setSystemTime(new Date("2026-08-31T10:00:00.000Z"));
    await consumeSolution("user-14", "item-a");
    const unlocked = await getUnlockedItemIds("user-14", ["item-a", "item-b", "item-c"]);
    expect(unlocked).toEqual(new Set(["item-a"]));
  });
});
