import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `db` va `auth`ni mock qilamiz — real baza/sessiya kerak emas. Naqsh
 * `courses/[id]/__tests__/route.test.ts` bilan bir xil. S17 — yechim
 * darajalari HAR IKKALA tarmoq (Test va TestSession/Item) uchun ham shu
 * yerda sinaladi (CLAUDE.md — "ikkalasi ham qulflansin").
 */
const {
  findUniqueResultMock,
  authMock,
  userFindUniqueMock,
  subscriptionFindManyMock,
  solutionUnlockFindManyMock,
  dailyUsageFindUniqueMock,
  itemFindManyMock,
  resultCountMock,
  resultFindManyMock,
  categoryFindUniqueMock,
} = vi.hoisted(() => ({
  findUniqueResultMock: vi.fn(),
  authMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  subscriptionFindManyMock: vi.fn(),
  solutionUnlockFindManyMock: vi.fn(),
  dailyUsageFindUniqueMock: vi.fn(),
  itemFindManyMock: vi.fn(),
  resultCountMock: vi.fn(),
  resultFindManyMock: vi.fn(),
  categoryFindUniqueMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    testResult: {
      findUnique: (...args: unknown[]) => findUniqueResultMock(...args),
      count: (...args: unknown[]) => resultCountMock(...args),
      findMany: (...args: unknown[]) => resultFindManyMock(...args),
    },
    testCategory: { findUnique: (...args: unknown[]) => categoryFindUniqueMock(...args) },
    user: { findUnique: (...args: unknown[]) => userFindUniqueMock(...args) },
    subscription: { findMany: (...args: unknown[]) => subscriptionFindManyMock(...args) },
    solutionUnlock: { findMany: (...args: unknown[]) => solutionUnlockFindManyMock(...args) },
    dailyUsage: { findUnique: (...args: unknown[]) => dailyUsageFindUniqueMock(...args) },
    item: { findMany: (...args: unknown[]) => itemFindManyMock(...args) },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: () => authMock(),
}));

import { GET } from "../route";

function baseQuestion(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "q1",
    text: "2+2=?",
    images: [] as string[],
    options: [{ label: "A", text: "4", image: null }],
    correctAnswer: "A",
    explanation: "Chunki 2+2=4",
    explanationImages: [] as string[],
    videoUrl: null,
    points: 1,
    order: 0,
    type: "MULTIPLE_CHOICE",
    ...overrides,
  };
}

async function callGet(id = "result1") {
  const request = new Request(`http://localhost/api/results/${id}`);
  const response = await GET(request as any, { params: Promise.resolve({ id }) });
  return { status: response.status, data: await response.json() };
}

describe("GET /api/results/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockReturnValue({ user: { id: "user1", role: "USER" } });
    userFindUniqueMock.mockResolvedValue({ role: "USER" });
    subscriptionFindManyMock.mockResolvedValue([]);
    solutionUnlockFindManyMock.mockResolvedValue([]);
    dailyUsageFindUniqueMock.mockResolvedValue(null);
    // Test tarmog'ida resolveUnlockKeys (lib/quota.ts) shu mock orqali
    // legacyQuestionId'larni qidiradi — default: hech biri Item'ga
    // ko'chirilmagan (bo'sh massiv), kalitlar o'zgarishsiz qoladi. Sessiya
    // tarmog'i testlari buni loadSessionItems uchun o'zining to'liq item
    // ro'yxati bilan qayta belgilaydi.
    itemFindManyMock.mockResolvedValue([]);
    resultCountMock.mockResolvedValue(1);
    resultFindManyMock.mockResolvedValue([]);
    categoryFindUniqueMock.mockResolvedValue(null);
  });

  describe("Test tarmog'i (result.test bor)", () => {
    it("yozma yechim ochilmagan bo'lsa explanation: null qaytadi", async () => {
      findUniqueResultMock.mockResolvedValue({
        id: "result1",
        userId: "user1",
        testId: "test1",
        sessionId: null,
        test: { questions: [baseQuestion()], subject: {} },
        session: null,
      });

      const { status, data } = await callGet();
      expect(status).toBe(200);
      expect(data.result.test.questions[0].explanation).toBeNull();
      expect(data.result.test.questions[0].explanationImages).toEqual([]);
      expect(data.result.test.questions[0].solutionKind).toBe("written");
      expect(data.result.test.questions[0].solutionUnlocked).toBe(false);
    });

    it("SolutionUnlock mavjud bo'lsa yozma yechim to'liq qaytadi", async () => {
      findUniqueResultMock.mockResolvedValue({
        id: "result1",
        userId: "user1",
        testId: "test1",
        sessionId: null,
        test: { questions: [baseQuestion()], subject: {} },
        session: null,
      });
      solutionUnlockFindManyMock.mockResolvedValue([{ itemId: "q1" }]);

      const { data } = await callGet();
      expect(data.result.test.questions[0].explanation).toBe("Chunki 2+2=4");
      expect(data.result.test.questions[0].solutionUnlocked).toBe(true);
    });

    it("video yechim bor, Premium emas — videoUrl null va yozma yechim ham yashirilgan (unlock bo'lsa ham)", async () => {
      findUniqueResultMock.mockResolvedValue({
        id: "result1",
        userId: "user1",
        testId: "test1",
        sessionId: null,
        test: {
          questions: [baseQuestion({ videoUrl: "https://youtube.com/watch?v=x" })],
          subject: {},
        },
        session: null,
      });
      solutionUnlockFindManyMock.mockResolvedValue([{ itemId: "q1" }]); // yozma ochilgan bo'lsa ham...

      const { data } = await callGet();
      const q = data.result.test.questions[0];
      expect(q.videoUrl).toBeNull();
      expect(q.explanation).toBeNull(); // ...video mavjudligi sababli baribir ko'rinmaydi
      expect(q.solutionKind).toBe("video");
    });

    it("video yechim bor, Premium — videoUrl to'liq qaytadi", async () => {
      findUniqueResultMock.mockResolvedValue({
        id: "result1",
        userId: "user1",
        testId: "test1",
        sessionId: null,
        test: {
          questions: [baseQuestion({ videoUrl: "https://youtube.com/watch?v=x" })],
          subject: {},
        },
        session: null,
      });
      subscriptionFindManyMock.mockResolvedValue([{ plan: "PREMIUM" }]);

      const { data } = await callGet();
      expect(data.result.test.questions[0].videoUrl).toBe("https://youtube.com/watch?v=x");
    });

    it("ADMIN uchun har doim ochiq", async () => {
      authMock.mockReturnValue({ user: { id: "admin1", role: "ADMIN" } });
      userFindUniqueMock.mockResolvedValue({ role: "ADMIN" });
      findUniqueResultMock.mockResolvedValue({
        id: "result1",
        userId: "someone-else",
        testId: "test1",
        sessionId: null,
        test: { questions: [baseQuestion()], subject: {} },
        session: null,
      });

      const { data } = await callGet();
      expect(data.result.test.questions[0].explanation).toBe("Chunki 2+2=4");
      // ADMIN cheklovsiz — SolutionUnlock so'ralmaydi ham.
      expect(solutionUnlockFindManyMock).not.toHaveBeenCalled();
    });

    it("solutionQuota'ni javobga qo'shadi", async () => {
      findUniqueResultMock.mockResolvedValue({
        id: "result1",
        userId: "user1",
        testId: "test1",
        sessionId: null,
        test: { questions: [baseQuestion()], subject: {} },
        session: null,
      });
      dailyUsageFindUniqueMock.mockResolvedValue({ solutionsUnlocked: 3 });

      const { data } = await callGet();
      expect(data.solutionQuota).toEqual({ usedToday: 3, limit: 10 });
    });

    it("urinishlar: jami son, oldingilar soni va faqat oxirgi 5 tasi (o'z natijalari)", async () => {
      const completedAt = new Date("2026-10-20T10:00:00Z");
      findUniqueResultMock.mockResolvedValue({
        id: "result1",
        userId: "user1",
        testId: "test1",
        sessionId: null,
        completedAt,
        test: { id: "test1", categoryId: "cat1", questions: [baseQuestion()], subject: {} },
        session: null,
      });
      resultCountMock.mockResolvedValueOnce(11).mockResolvedValueOnce(8);
      resultFindManyMock.mockResolvedValue([
        { id: "result1", score: 42, maxScore: 50, completedAt },
      ]);

      const { data } = await callGet();

      expect(resultCountMock).toHaveBeenNthCalledWith(1, { where: { userId: "user1", testId: "test1" } });
      expect(resultCountMock).toHaveBeenNthCalledWith(2, {
        where: {
          userId: "user1",
          testId: "test1",
          OR: [{ completedAt: { lt: completedAt } }, { completedAt, id: { lt: "result1" } }],
        },
      });
      expect(resultFindManyMock).toHaveBeenCalledWith({
        where: { userId: "user1", testId: "test1" },
        select: { id: true, score: true, maxScore: true, completedAt: true },
        orderBy: [{ completedAt: "desc" }, { id: "desc" }],
        take: 5,
      });
      expect(data.attempts.total).toBe(11);
      expect(data.attempts.olderCount).toBe(8);
      expect(data.attempts.recent).toEqual([
        { id: "result1", score: 42, maxScore: 50, completedAt: completedAt.toISOString() },
      ]);
    });

    it("test turini (category.type) categoryId bo'yicha qaytaradi", async () => {
      findUniqueResultMock.mockResolvedValue({
        id: "result1",
        userId: "user1",
        testId: "test1",
        sessionId: null,
        completedAt: new Date(),
        test: { id: "test1", categoryId: "cat1", questions: [baseQuestion()], subject: {} },
        session: null,
      });
      categoryFindUniqueMock.mockResolvedValue({ type: "ATTESTATION" });

      const { data } = await callGet();
      expect(categoryFindUniqueMock).toHaveBeenCalledWith({ where: { id: "cat1" }, select: { type: true } });
      expect(data.result.test.category).toEqual({ type: "ATTESTATION" });
    });

    it("savol teglarini (attestatsiya bo'limi) so'raydi va qaytaradi", async () => {
      findUniqueResultMock.mockResolvedValue({
        id: "result1",
        userId: "user1",
        testId: "test1",
        sessionId: null,
        completedAt: new Date(),
        test: { id: "test1", categoryId: "cat1", questions: [baseQuestion({ tags: ["section:fizika"] })], subject: {} },
        session: null,
      });
      categoryFindUniqueMock.mockResolvedValue({ type: "ATTESTATION" });

      const { data } = await callGet();
      const args = findUniqueResultMock.mock.calls[0][0];
      expect(args.include.test.include.questions.select.tags).toBe(true);
      expect(data.result.test.questions[0].tags).toEqual(["section:fizika"]);
    });
  });

  describe("Sessiya tarmog'i (result.session bor, result.test yo'q)", () => {
    it("yozma yechim ochilmagan bo'lsa explanation: null qaytadi", async () => {
      findUniqueResultMock.mockResolvedValue({
        id: "result1",
        userId: "user1",
        testId: null,
        sessionId: "session1",
        test: null,
        session: { id: "session1", title: "Konstruktor testi", durationMin: 30, itemIds: ["item1"] },
      });
      itemFindManyMock.mockResolvedValue([
        {
          id: "item1",
          text: "2+2=?",
          images: [],
          options: [{ label: "A", text: "4", image: null }],
          correctAnswer: "A",
          type: "MULTIPLE_CHOICE",
          explanation: "Chunki 2+2=4",
          explanationImages: [],
          videoUrl: null,
          subject: { nameUz: "Matematika", nameRu: "Математика", nameEn: "Math" },
        },
      ]);

      const { status, data } = await callGet();
      expect(status).toBe(200);
      expect(data.result.test.questions[0].explanation).toBeNull();
      expect(data.result.test.questions[0].solutionKind).toBe("written");
    });

    it("SolutionUnlock mavjud bo'lsa (Item.id bilan) yozma yechim to'liq qaytadi", async () => {
      findUniqueResultMock.mockResolvedValue({
        id: "result1",
        userId: "user1",
        testId: null,
        sessionId: "session1",
        test: null,
        session: { id: "session1", title: "Konstruktor testi", durationMin: 30, itemIds: ["item1"] },
      });
      itemFindManyMock.mockResolvedValue([
        {
          id: "item1",
          text: "2+2=?",
          images: [],
          options: [{ label: "A", text: "4", image: null }],
          correctAnswer: "A",
          type: "MULTIPLE_CHOICE",
          explanation: "Chunki 2+2=4",
          explanationImages: [],
          videoUrl: null,
          subject: { nameUz: "Matematika", nameRu: "Математика", nameEn: "Math" },
        },
      ]);
      solutionUnlockFindManyMock.mockResolvedValue([{ itemId: "item1" }]);

      const { data } = await callGet();
      expect(data.result.test.questions[0].explanation).toBe("Chunki 2+2=4");
    });

    it("urinishlar tarixi va test turi yo'q", async () => {
      findUniqueResultMock.mockResolvedValue({
        id: "result1",
        userId: "user1",
        testId: null,
        sessionId: "session1",
        test: null,
        session: { id: "session1", title: "Konstruktor testi", durationMin: 30, itemIds: [] },
      });

      const { data } = await callGet();
      expect(data.attempts).toBeNull();
      expect(data.result.test.category).toBeNull();
      expect(resultFindManyMock).not.toHaveBeenCalled();
      expect(resultCountMock).not.toHaveBeenCalled();
    });
  });

  it("boshqa foydalanuvchining natijasiga 403 qaytaradi", async () => {
    findUniqueResultMock.mockResolvedValue({
      id: "result1",
      userId: "someone-else",
      testId: "test1",
      sessionId: null,
      test: { questions: [], subject: {} },
      session: null,
    });
    const { status } = await callGet();
    expect(status).toBe(403);
    // Boshqaning urinishlar tarixi ham so'ralmaydi
    expect(resultFindManyMock).not.toHaveBeenCalled();
    expect(resultCountMock).not.toHaveBeenCalled();
  });
});
