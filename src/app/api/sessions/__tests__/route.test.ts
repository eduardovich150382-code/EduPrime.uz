import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findManyItemMock,
  createSessionMock,
  requireAuthMock,
  userFindUniqueMock,
  subscriptionFindManyMock,
  dailyUsageUpsertMock,
  dailyUsageUpdateManyMock,
  subjectFindManyMock,
} = vi.hoisted(() => ({
  findManyItemMock: vi.fn(),
  createSessionMock: vi.fn(),
  requireAuthMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  subscriptionFindManyMock: vi.fn(),
  dailyUsageUpsertMock: vi.fn(),
  dailyUsageUpdateManyMock: vi.fn(),
  subjectFindManyMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    userPermission: { findMany: async () => [] },
    subject: { findMany: (...args: unknown[]) => subjectFindManyMock(...args) },
    testSession: { create: (...args: unknown[]) => createSessionMock(...args) },
    item: { findMany: (...args: unknown[]) => findManyItemMock(...args) },
    // consumeBuiltTest (lib/quota.ts) — bepul foydalanuvchi, kvota ostida
    // (limit tekshiruvi quota.test.ts'da alohida sinaladi).
    user: { findUnique: (...args: unknown[]) => userFindUniqueMock(...args) },
    subscription: { findMany: (...args: unknown[]) => subscriptionFindManyMock(...args) },
    dailyUsage: {
      upsert: (...args: unknown[]) => dailyUsageUpsertMock(...args),
      // Rad etilgan urinishda consumeBuiltTest hisoblagichni darhol
      // qaytaradi (lib/quota.ts) — bu yerda haqiqiy qiymat muhim emas,
      // faqat chaqiruv xatosiz o'tishi kerak.
      updateMany: (...args: unknown[]) => dailyUsageUpdateManyMock(...args),
    },
  },
}));

vi.mock("@/lib/api-auth", () => ({
  requireAuth: () => requireAuthMock(),
}));

import { POST } from "../route";

function pickableItem(id: string, difficulty = 3) {
  return { id, templateId: null, difficulty };
}

function fullItem(id: string, disciplineKey: string | null = null) {
  return {
    id, text: `Savol ${id}`, images: [], options: [{ label: "A", text: "x", image: null }],
    correctAnswer: "A", type: "MULTIPLE_CHOICE", explanation: null, explanationImages: [], videoUrl: null,
    subject: { id: `pool-${disciplineKey}`, categoryId: 'pool', disciplineKey, nameUz: "Fan", nameRu: "Предмет", nameEn: "Subject" },
  };
}

async function callPost(body: unknown) {
  const request = new Request("http://localhost/api/sessions", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const response = await POST(request as any);
  return { status: response.status, data: await response.json() };
}

describe("POST /api/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockReturnValue({ user: { id: "user1", role: "USER" }, error: null });
    userFindUniqueMock.mockResolvedValue({ role: "USER" });
    subscriptionFindManyMock.mockResolvedValue([]);
    dailyUsageUpsertMock.mockResolvedValue({ builtTests: 1 });
    subjectFindManyMock.mockResolvedValue([{ id: 'att-physics', categoryId: 'att', disciplineKey: 'fizika' }]);
  });

  it("limit noto'g'ri bo'lsa 400 qaytaradi", async () => {
    const { status, data } = await callPost({ limit: 0, durationMin: 30 });
    expect(status).toBe(400);
    expect(data.error).toBeTruthy();
  });

  it("durationMin noto'g'ri bo'lsa 400 qaytaradi", async () => {
    const { status } = await callPost({ limit: 5, durationMin: -1 });
    expect(status).toBe(400);
  });

  it("havzada mos savol topilmasa 404 qaytaradi", async () => {
    findManyItemMock.mockResolvedValue([]);
    const { status, data } = await callPost({ limit: 5, durationMin: 30 });
    expect(status).toBe(404);
    expect(data.error).toBeTruthy();
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it("sessiya yaratadi va to'g'ri javobsiz savollarni qaytaradi", async () => {
    // buildItemWhere item-picker.ts'da chaqiriladi — findManyItemMock har
    // chaqiriqda bir xil havzani qaytaradi (relaxation tsikliga tushmaydi,
    // chunki candidates.length >= limit).
    findManyItemMock.mockImplementation((args: { select?: Record<string, unknown> }) => {
      if (args.select && "text" in args.select) return Promise.resolve([fullItem("item1"), fullItem("item2")]);
      return Promise.resolve([pickableItem("item1"), pickableItem("item2")]);
    });
    createSessionMock.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: "session1", ...data })
    );

    const { status, data } = await callPost({ limit: 2, durationMin: 45, subjectIds: ["subj1"] });

    expect(status).toBe(200);
    expect(data.session.id).toBe("session1");
    expect(data.session.durationMin).toBe(45);
    expect(data.session.questionCount).toBe(2);
    for (const q of data.session.questions) {
      expect(q.correctAnswer).toBeUndefined();
    }
    expect(createSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "user1", durationMin: 45, mode: "FIXED" }),
      })
    );
  });

  it("kunlik konstruktor test kvotasi tugagan bo'lsa 429 qaytaradi va sessiya yaratmaydi", async () => {
    findManyItemMock.mockImplementation((args: { select?: Record<string, unknown> }) => {
      if (args.select && "text" in args.select) return Promise.resolve([fullItem("item1"), fullItem("item2")]);
      return Promise.resolve([pickableItem("item1"), pickableItem("item2")]);
    });
    // FREE_DAILY_BUILT_TESTS (3) dan oshib ketgan kunlik hisoblagich.
    dailyUsageUpsertMock.mockResolvedValue({ builtTests: 4 });

    const { status, data } = await callPost({ limit: 2, durationMin: 30, subjectIds: ["subj1"] });

    expect(status).toBe(429);
    expect(data.code).toBe("BUILT_TEST_QUOTA_EXCEEDED");
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it("{source:'mastery'} yuborilgan so'rov ham kvotani sarflaydi (limitdan keyin 429 qaytaradi)", async () => {
    // Kritik xavfsizlik tuzatishi: `source` mijoz tomonidan erkin yuboriladigan
    // maydon — bu marshrut orqali kvota sarflashni chetlab o'tishning yo'li
    // yo'q, `source` qanday qiymatda bo'lishidan qat'i nazar.
    findManyItemMock.mockImplementation((args: { select?: Record<string, unknown> }) => {
      if (args.select && "text" in args.select) return Promise.resolve([fullItem("item1"), fullItem("item2")]);
      return Promise.resolve([pickableItem("item1"), pickableItem("item2")]);
    });
    dailyUsageUpsertMock.mockResolvedValue({ builtTests: 4 }); // limitdan oshgan

    const { status, data } = await callPost({ limit: 2, durationMin: 30, subjectIds: ["subj1"], source: "mastery" });

    expect(status).toBe(429);
    expect(data.code).toBe("BUILT_TEST_QUOTA_EXCEEDED");
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  function wireScopedBuild(disciplines: (string | null)[]) {
    subscriptionFindManyMock.mockResolvedValue([{
      plan: 'CATEGORY', categoryId: 'att', subjectIds: ['att-physics'], product: { subjectRule: 'ONE' },
      isActive: true, endDate: new Date('2099-01-01'),
    }]);
    findManyItemMock.mockImplementation((args: { select?: Record<string, unknown> }) => {
      if (args.select && 'text' in args.select) return Promise.resolve(disciplines.map((key, i) => fullItem(`item${i}`, key)));
      return Promise.resolve(disciplines.map((_, i) => pickableItem(`item${i}`)));
    });
    createSessionMock.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'session1', ...data }));
  }

  it('fanni so‘rov bilmasa ham haqiqiy Item fizikada bo‘lsa cheklovsiz', async () => {
    wireScopedBuild(['fizika', 'fizika']);
    dailyUsageUpsertMock.mockResolvedValue({ builtTests: 4 });
    expect((await callPost({ limit: 2, durationMin: 30 })).status).toBe(200);
    expect(dailyUsageUpsertMock).not.toHaveBeenCalled();
    expect(createSessionMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ spec: expect.objectContaining({ builtQuotaCharged: false }) }),
    }));
    expect(subscriptionFindManyMock).toHaveBeenCalledTimes(1);
    expect(subjectFindManyMock).toHaveBeenCalledTimes(1);
  });

  it('aralash fizika/kimyo sessiyasi aynan bitta kvota sarflaydi va belgini server yozadi', async () => {
    wireScopedBuild(['fizika', 'kimyo']);
    expect((await callPost({ limit: 2, durationMin: 30, builtQuotaCharged: false })).status).toBe(200);
    expect(dailyUsageUpsertMock).toHaveBeenCalledTimes(1);
    expect(createSessionMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ spec: expect.objectContaining({ builtQuotaCharged: true }) }),
    }));
  });

  it('kalitsiz Item yoki mijoz yozgan fan/kvota belgisi cheklovni chetlab o‘tmaydi', async () => {
    wireScopedBuild([null]);
    dailyUsageUpsertMock.mockResolvedValue({ builtTests: 4 });
    const { status } = await callPost({ limit: 1, durationMin: 30, subjectIds: ['att-physics'], builtQuotaCharged: false });
    expect(status).toBe(429);
    expect(createSessionMock).not.toHaveBeenCalled();
  });
});
