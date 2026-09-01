import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * S19 — AI tushuntirishni qayta qurish.
 *
 * - Test tarmog'i (testId → Question) VA sessiya tarmog'i (sessionId →
 *   TestSession.itemIds → Item) ikkalasi ham ishlashi shart (S19 kritik
 *   nuqson #1: eski kod faqat Question'ni bilar edi).
 * - AI FAQAT `solutionKind === 'none'`da chaqiriladi — mualliflik yozma/
 *   video yechimi bor joyda hech qachon chaqirilmaydi.
 * - Kesh kaliti (itemId, lang, forAnswer) — talabaning javobiga bog'liq.
 * - Kvota `DailyUsage.tutorMessages`da, `SystemSetting`da emas.
 */
const {
  findUniqueResultMock,
  findUniqueQuestionMock,
  itemFindUniqueMock,
  testSessionFindUniqueMock,
  itemExplanationFindUniqueMock,
  itemExplanationCreateMock,
  authMock,
  userFindUniqueMock,
  subscriptionFindManyMock,
  solutionUnlockFindUniqueMock,
  dailyUsageUpsertMock,
  streamExplainQuestionMock,
} = vi.hoisted(() => ({
  findUniqueResultMock: vi.fn(),
  findUniqueQuestionMock: vi.fn(),
  itemFindUniqueMock: vi.fn(),
  testSessionFindUniqueMock: vi.fn(),
  itemExplanationFindUniqueMock: vi.fn(),
  itemExplanationCreateMock: vi.fn(),
  authMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  subscriptionFindManyMock: vi.fn(),
  solutionUnlockFindUniqueMock: vi.fn(),
  dailyUsageUpsertMock: vi.fn(),
  streamExplainQuestionMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    testResult: { findUnique: (...args: unknown[]) => findUniqueResultMock(...args) },
    question: { findUnique: (...args: unknown[]) => findUniqueQuestionMock(...args) },
    item: { findUnique: (...args: unknown[]) => itemFindUniqueMock(...args) },
    testSession: { findUnique: (...args: unknown[]) => testSessionFindUniqueMock(...args) },
    itemExplanation: {
      findUnique: (...args: unknown[]) => itemExplanationFindUniqueMock(...args),
      create: (...args: unknown[]) => itemExplanationCreateMock(...args),
    },
    user: { findUnique: (...args: unknown[]) => userFindUniqueMock(...args) },
    subscription: { findMany: (...args: unknown[]) => subscriptionFindManyMock(...args) },
    solutionUnlock: { findUnique: (...args: unknown[]) => solutionUnlockFindUniqueMock(...args) },
    dailyUsage: { upsert: (...args: unknown[]) => dailyUsageUpsertMock(...args) },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: () => authMock(),
}));

vi.mock("@/lib/gemini", () => ({
  streamExplainQuestion: (...args: unknown[]) => streamExplainQuestionMock(...args),
}));

import { POST } from "../route";

async function* fakeChunks() {
  yield "AI tushuntirishi";
}

function baseQuestion(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "q1",
    testId: "test1",
    text: "2+2=?",
    options: [
      { label: "A", text: "4", image: null },
      { label: "B", text: "5", image: null },
    ],
    correctAnswer: "A",
    explanation: null,
    explanationImages: [],
    videoUrl: null,
    type: "MULTIPLE_CHOICE",
    ...overrides,
  };
}

function baseItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    text: "2+2=?",
    options: [
      { label: "A", text: "4", image: null },
      { label: "B", text: "5", image: null },
    ],
    correctAnswer: "A",
    explanation: null,
    explanationImages: [],
    videoUrl: null,
    type: "MULTIPLE_CHOICE",
    ...overrides,
  };
}

async function callPost(body: unknown, id = "result1") {
  const request = new Request(`http://localhost/api/results/${id}/ai-explain`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const response = await POST(request as any, { params: Promise.resolve({ id }) });
  return response;
}

async function readBody(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value);
  }
  return text;
}

describe("POST /api/results/[id]/ai-explain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockReturnValue({ user: { id: "user1", role: "USER", lang: "uz" } });
    userFindUniqueMock.mockResolvedValue({ role: "USER" });
    subscriptionFindManyMock.mockResolvedValue([]);
    solutionUnlockFindUniqueMock.mockResolvedValue(null);
    itemExplanationFindUniqueMock.mockResolvedValue(null);
    itemExplanationCreateMock.mockResolvedValue({});
    dailyUsageUpsertMock.mockResolvedValue({ tutorMessages: 1 });
    streamExplainQuestionMock.mockReturnValue(fakeChunks());
    // Default: test tarmog'i, talaba "B" ni tanlagan (noto'g'ri)
    findUniqueResultMock.mockResolvedValue({
      userId: "user1",
      testId: "test1",
      sessionId: null,
      answers: [{ questionId: "q1", answer: "B", isCorrect: false }],
    });
    // Default: questionId hali Item'ga ko'chirilmagan
    itemFindUniqueMock.mockResolvedValue(null);
  });

  describe("ikkala tarmoq (Test va TestSession)", () => {
    it("test tarmog'ida (Question) ishlaydi", async () => {
      findUniqueQuestionMock.mockResolvedValue(baseQuestion());
      const response = await callPost({ questionId: "q1" });
      expect(response.status).toBe(200);
      expect(streamExplainQuestionMock).toHaveBeenCalled();
    });

    it("S19 kritik nuqson #1: sessiya natijasida (TestSession → Item) ham ishlaydi", async () => {
      findUniqueResultMock.mockResolvedValue({
        userId: "user1",
        testId: null,
        sessionId: "sess1",
        answers: [{ questionId: "item1", answer: "B", isCorrect: false }],
      });
      testSessionFindUniqueMock.mockResolvedValue({ itemIds: ["item1"] });
      itemFindUniqueMock.mockResolvedValue(baseItem());

      const response = await callPost({ questionId: "item1" });
      expect(response.status).toBe(200);
      expect(streamExplainQuestionMock).toHaveBeenCalled();
    });

    it("sessiyada itemIds tarkibida bo'lmagan itemId uchun 404", async () => {
      findUniqueResultMock.mockResolvedValue({
        userId: "user1", testId: null, sessionId: "sess1", answers: [],
      });
      testSessionFindUniqueMock.mockResolvedValue({ itemIds: ["other-item"] });

      const response = await callPost({ questionId: "item1" });
      expect(response.status).toBe(404);
      expect(streamExplainQuestionMock).not.toHaveBeenCalled();
    });
  });

  describe("mualliflik yechimi bor joyda AI CHAQIRILMAYDI", () => {
    it("yozma yechim ochilmagan bo'lsa 403 SOLUTION_LOCKED, AI chaqirilmaydi", async () => {
      findUniqueQuestionMock.mockResolvedValue(baseQuestion({ explanation: "Chunki 2+2=4" }));

      const response = await callPost({ questionId: "q1" });
      const data = await response.json();
      expect(response.status).toBe(403);
      expect(data.code).toBe("SOLUTION_LOCKED");
      expect(streamExplainQuestionMock).not.toHaveBeenCalled();
    });

    it("yozma yechim OCHILGAN bo'lsa ham AI chaqirilmaydi (400 AI_NOT_APPLICABLE)", async () => {
      findUniqueQuestionMock.mockResolvedValue(baseQuestion({ explanation: "Chunki 2+2=4" }));
      solutionUnlockFindUniqueMock.mockResolvedValue({ userId: "user1", itemId: "q1" });

      const response = await callPost({ questionId: "q1" });
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.code).toBe("AI_NOT_APPLICABLE");
      expect(streamExplainQuestionMock).not.toHaveBeenCalled();
    });

    it("video yechim OCHILGAN (Premium) bo'lsa ham AI chaqirilmaydi", async () => {
      findUniqueQuestionMock.mockResolvedValue(
        baseQuestion({ explanation: null, videoUrl: "https://youtube.com/watch?v=x" })
      );
      subscriptionFindManyMock.mockResolvedValue([{ plan: "PREMIUM" }]);

      const response = await callPost({ questionId: "q1" });
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.code).toBe("AI_NOT_APPLICABLE");
      expect(streamExplainQuestionMock).not.toHaveBeenCalled();
    });

    it("video yechim ochilmagan bo'lsa 403 SOLUTION_LOCKED", async () => {
      findUniqueQuestionMock.mockResolvedValue(
        baseQuestion({ explanation: null, videoUrl: "https://youtube.com/watch?v=x" })
      );

      const response = await callPost({ questionId: "q1" });
      const data = await response.json();
      expect(response.status).toBe(403);
      expect(data.code).toBe("SOLUTION_LOCKED");
    });

    it("mualliflik yechimi UMUMAN yo'q (solutionKind: none) bo'lsa cheklovsiz chaqiriladi", async () => {
      findUniqueQuestionMock.mockResolvedValue(baseQuestion());
      const response = await callPost({ questionId: "q1" });
      expect(response.status).toBe(200);
      expect(streamExplainQuestionMock).toHaveBeenCalled();
    });
  });

  describe("talaba javobiga moslashtirish va kesh kaliti", () => {
    it("talaba javobi va to'g'riligi streamExplainQuestion'ga uzatiladi", async () => {
      findUniqueQuestionMock.mockResolvedValue(baseQuestion());
      await callPost({ questionId: "q1" });

      expect(streamExplainQuestionMock).toHaveBeenCalledWith(
        expect.objectContaining({ userAnswer: "B) 5", answeredCorrectly: false })
      );
    });

    it("to'g'ri javob berilganda ohang moslashadi (answeredCorrectly: true)", async () => {
      findUniqueResultMock.mockResolvedValue({
        userId: "user1", testId: "test1", sessionId: null,
        answers: [{ questionId: "q1", answer: "A", isCorrect: true }],
      });
      findUniqueQuestionMock.mockResolvedValue(baseQuestion());
      await callPost({ questionId: "q1" });

      expect(streamExplainQuestionMock).toHaveBeenCalledWith(
        expect.objectContaining({ userAnswer: "A) 4", answeredCorrectly: true })
      );
    });

    it("Item topilgan bo'lsa (backfill qilingan) forAnswer=javob bilan keshlanadi", async () => {
      itemFindUniqueMock.mockResolvedValue({ id: "item-real" });
      findUniqueQuestionMock.mockResolvedValue(baseQuestion());

      const response = await callPost({ questionId: "q1" });
      await readBody(response);

      expect(itemExplanationFindUniqueMock).toHaveBeenCalledWith({
        where: { itemId_lang_forAnswer: { itemId: "item-real", lang: "uz", forAnswer: "B" } },
        include: { votes: { where: { userId: "user1" } } },
      });
      expect(itemExplanationCreateMock).toHaveBeenCalledWith({
        data: { id: expect.any(String), itemId: "item-real", lang: "uz", forAnswer: "B", text: "AI tushuntirishi" },
      });
    });

    it("to'g'ri javobda forAnswer='' (bo'sh satr) bilan keshlanadi — NULL emas, aks holda Postgres unique cheklovi bu holatni himoya qilmas edi", async () => {
      itemFindUniqueMock.mockResolvedValue({ id: "item-real" });
      findUniqueResultMock.mockResolvedValue({
        userId: "user1", testId: "test1", sessionId: null,
        answers: [{ questionId: "q1", answer: "A", isCorrect: true }],
      });
      findUniqueQuestionMock.mockResolvedValue(baseQuestion());

      const response = await callPost({ questionId: "q1" });
      await readBody(response);

      expect(itemExplanationFindUniqueMock).toHaveBeenCalledWith({
        where: { itemId_lang_forAnswer: { itemId: "item-real", lang: "uz", forAnswer: "" } },
        include: { votes: { where: { userId: "user1" } } },
      });
      expect(itemExplanationCreateMock).toHaveBeenCalledWith({
        data: { id: expect.any(String), itemId: "item-real", lang: "uz", forAnswer: "", text: "AI tushuntirishi" },
      });
    });

    it("kesh yozishda P2002 (poyga sharti) jimgina yutiladi — javob baribir talabaga yuborilgan", async () => {
      itemFindUniqueMock.mockResolvedValue({ id: "item-real" });
      findUniqueQuestionMock.mockResolvedValue(baseQuestion());
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      // Bir xil (itemId, lang, forAnswer) bilan parallel so'rov allaqachon
      // yozgan — DB unique cheklovi (forAnswer endi bo'sh satr, `null` emas,
      // shuning uchun bu cheklov haqiqatan ishlaydi) P2002 qaytaradi.
      itemExplanationCreateMock.mockRejectedValue({ code: "P2002" });

      const response = await callPost({ questionId: "q1" });
      const text = await readBody(response);

      expect(text).toBe("AI tushuntirishi"); // talaba baribir javobni oladi
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        "ItemExplanation cache write error:", expect.anything()
      );
      consoleErrorSpy.mockRestore();
    });

    it("Item topilmagan bo'lsa (hali backfill qilinmagan) AI chaqiriladi, lekin KESHLANMAYDI", async () => {
      itemFindUniqueMock.mockResolvedValue(null); // legacyQuestionId bo'yicha topilmadi
      findUniqueQuestionMock.mockResolvedValue(baseQuestion());

      const response = await callPost({ questionId: "q1" });
      await readBody(response);

      expect(streamExplainQuestionMock).toHaveBeenCalled();
      expect(itemExplanationFindUniqueMock).not.toHaveBeenCalled();
      expect(itemExplanationCreateMock).not.toHaveBeenCalled();
    });

    it("kesh mavjud bo'lsa AI UMUMAN chaqirilmaydi, kvota sarflanmaydi", async () => {
      itemFindUniqueMock.mockResolvedValue({ id: "item-real" });
      itemExplanationFindUniqueMock.mockResolvedValue({
        id: "expl1", text: "Keshdagi tushuntirish", upvotes: 3, downvotes: 1, votes: [{ value: 1 }],
      });
      findUniqueQuestionMock.mockResolvedValue(baseQuestion());

      const response = await callPost({ questionId: "q1" });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        explanation: "Keshdagi tushuntirish",
        cached: true,
        explanationId: "expl1",
        upvotes: 3,
        downvotes: 1,
        userVote: 1,
      });
      expect(streamExplainQuestionMock).not.toHaveBeenCalled();
      expect(dailyUsageUpsertMock).not.toHaveBeenCalled();
    });
  });

  describe("kvota — DailyUsage.tutorMessages", () => {
    it("kvota tugaganda 429 AI_QUOTA_EXCEEDED qaytaradi", async () => {
      findUniqueQuestionMock.mockResolvedValue(baseQuestion());
      dailyUsageUpsertMock.mockResolvedValue({ tutorMessages: 4 }); // FREE_DAILY_AI_EXPLAIN=3 dan oshgan

      const response = await callPost({ questionId: "q1" });
      const data = await response.json();
      expect(response.status).toBe(429);
      expect(data.code).toBe("AI_QUOTA_EXCEEDED");
      expect(streamExplainQuestionMock).not.toHaveBeenCalled();
    });

    it("kvota DailyUsage orqali sarflanadi (bumpDailyUsage → upsert)", async () => {
      findUniqueQuestionMock.mockResolvedValue(baseQuestion());
      await callPost({ questionId: "q1" });
      expect(dailyUsageUpsertMock).toHaveBeenCalled();
    });

    it("PREMIUM obunachi uchun kvota cheklovsiz (upsert chaqirilmaydi)", async () => {
      findUniqueQuestionMock.mockResolvedValue(baseQuestion());
      subscriptionFindManyMock.mockResolvedValue([{ plan: "PREMIUM" }]);

      const response = await callPost({ questionId: "q1" });
      expect(response.status).toBe(200);
      expect(dailyUsageUpsertMock).not.toHaveBeenCalled();
    });

    it("ADMIN uchun kvota tekshirilmaydi", async () => {
      authMock.mockReturnValue({ user: { id: "user1", role: "ADMIN", lang: "uz" } });
      findUniqueResultMock.mockResolvedValue({
        userId: "someone-else", testId: "test1", sessionId: null,
        answers: [{ questionId: "q1", answer: "B", isCorrect: false }],
      });
      findUniqueQuestionMock.mockResolvedValue(baseQuestion());

      const response = await callPost({ questionId: "q1" });
      expect(response.status).toBe(200);
      expect(dailyUsageUpsertMock).not.toHaveBeenCalled();
    });
  });
});
