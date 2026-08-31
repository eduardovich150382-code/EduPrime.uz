import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findUniqueResultMock,
  findUniqueQuestionMock,
  findUniqueTestSessionMock,
  findUniqueItemMock,
  authMock,
  userFindUniqueMock,
  subscriptionFindManyMock,
  solutionUnlockFindUniqueMock,
  solutionUnlockCreateMock,
  dailyUsageUpsertMock,
} = vi.hoisted(() => ({
  findUniqueResultMock: vi.fn(),
  findUniqueQuestionMock: vi.fn(),
  findUniqueTestSessionMock: vi.fn(),
  findUniqueItemMock: vi.fn(),
  authMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  subscriptionFindManyMock: vi.fn(),
  solutionUnlockFindUniqueMock: vi.fn(),
  solutionUnlockCreateMock: vi.fn(),
  dailyUsageUpsertMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    testResult: { findUnique: (...args: unknown[]) => findUniqueResultMock(...args) },
    question: { findUnique: (...args: unknown[]) => findUniqueQuestionMock(...args) },
    testSession: { findUnique: (...args: unknown[]) => findUniqueTestSessionMock(...args) },
    item: { findUnique: (...args: unknown[]) => findUniqueItemMock(...args) },
    user: { findUnique: (...args: unknown[]) => userFindUniqueMock(...args) },
    subscription: { findMany: (...args: unknown[]) => subscriptionFindManyMock(...args) },
    solutionUnlock: {
      findUnique: (...args: unknown[]) => solutionUnlockFindUniqueMock(...args),
      create: (...args: unknown[]) => solutionUnlockCreateMock(...args),
    },
    dailyUsage: { upsert: (...args: unknown[]) => dailyUsageUpsertMock(...args) },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: () => authMock(),
}));

import { POST } from "../route";

async function callPost(body: unknown, id = "result1") {
  const request = new Request(`http://localhost/api/results/${id}/unlock-solution`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const response = await POST(request as any, { params: Promise.resolve({ id }) });
  return { status: response.status, data: await response.json() };
}

describe("POST /api/results/[id]/unlock-solution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockReturnValue({ user: { id: "user1", role: "USER" } });
    userFindUniqueMock.mockResolvedValue({ role: "USER" });
    subscriptionFindManyMock.mockResolvedValue([]);
    solutionUnlockFindUniqueMock.mockResolvedValue(null);
    solutionUnlockCreateMock.mockResolvedValue({});
    dailyUsageUpsertMock.mockResolvedValue({ solutionsUnlocked: 1 });
    findUniqueItemMock.mockResolvedValue({ explanation: "Item yechimi", explanationImages: [], videoUrl: null });
  });

  it("questionId bo'lmasa 400 qaytaradi", async () => {
    findUniqueResultMock.mockResolvedValue({ userId: "user1", testId: "test1", sessionId: null });
    const { status } = await callPost({});
    expect(status).toBe(400);
  });

  it("natija topilmasa 404 qaytaradi", async () => {
    findUniqueResultMock.mockResolvedValue(null);
    const { status } = await callPost({ questionId: "q1" });
    expect(status).toBe(404);
  });

  it("boshqa foydalanuvchining natijasiga 403 qaytaradi", async () => {
    findUniqueResultMock.mockResolvedValue({ userId: "someone-else", testId: "test1", sessionId: null });
    const { status } = await callPost({ questionId: "q1" });
    expect(status).toBe(403);
  });

  it("questionId natijaning testiga tegishli bo'lmasa 404 qaytaradi (Test tarmog'i)", async () => {
    findUniqueResultMock.mockResolvedValue({ userId: "user1", testId: "test1", sessionId: null });
    findUniqueQuestionMock.mockResolvedValue({ testId: "boshqa-test", explanation: null, explanationImages: [], videoUrl: null });
    const { status } = await callPost({ questionId: "q1" });
    expect(status).toBe(404);
  });

  it("Test tarmog'ida to'g'ri questionId bilan yechimni ochadi va matnini qaytaradi", async () => {
    findUniqueResultMock.mockResolvedValue({ userId: "user1", testId: "test1", sessionId: null });
    findUniqueQuestionMock.mockResolvedValue({
      testId: "test1",
      explanation: "Yechim matni",
      explanationImages: ["img1"],
      videoUrl: null,
    });

    const { status, data } = await callPost({ questionId: "q1" });
    expect(status).toBe(200);
    expect(data.unlocked).toBe(true);
    expect(data.explanation).toBe("Yechim matni");
    expect(data.explanationImages).toEqual(["img1"]);
    expect(solutionUnlockCreateMock).toHaveBeenCalledWith({ data: { userId: "user1", itemId: "q1" } });
  });

  it("video yechim mavjud bo'lsa 403 VIDEO_ONLY qaytadi va kvota sarflanmaydi", async () => {
    findUniqueResultMock.mockResolvedValue({ userId: "user1", testId: "test1", sessionId: null });
    findUniqueQuestionMock.mockResolvedValue({
      testId: "test1",
      explanation: "Yechim matni",
      explanationImages: [],
      videoUrl: "https://youtube.com/watch?v=x",
    });

    const { status, data } = await callPost({ questionId: "q1" });
    expect(status).toBe(403);
    expect(data.code).toBe("VIDEO_ONLY");
    expect(dailyUsageUpsertMock).not.toHaveBeenCalled();
    expect(solutionUnlockCreateMock).not.toHaveBeenCalled();
  });

  it("savolda yechim umuman bo'lmasa 404 NO_SOLUTION qaytadi va kvota sarflanmaydi", async () => {
    findUniqueResultMock.mockResolvedValue({ userId: "user1", testId: "test1", sessionId: null });
    findUniqueQuestionMock.mockResolvedValue({
      testId: "test1",
      explanation: null,
      explanationImages: [],
      videoUrl: null,
    });

    const { status, data } = await callPost({ questionId: "q1" });
    expect(status).toBe(404);
    expect(data.code).toBe("NO_SOLUTION");
    expect(dailyUsageUpsertMock).not.toHaveBeenCalled();
    expect(solutionUnlockCreateMock).not.toHaveBeenCalled();
  });

  it("legacyQuestionId orqali Item'ga ko'chirilgan savol uchun SolutionUnlock Item.id bilan yoziladi", async () => {
    findUniqueResultMock.mockResolvedValue({ userId: "user1", testId: "test1", sessionId: null });
    findUniqueQuestionMock.mockResolvedValue({
      testId: "test1",
      explanation: "Yechim matni",
      explanationImages: [],
      videoUrl: null,
    });
    // resolveUnlockKey — legacyQuestionId "q1" bo'yicha Item topiladi.
    findUniqueItemMock.mockResolvedValue({ id: "item-migrated-1" });

    const { status } = await callPost({ questionId: "q1" });
    expect(status).toBe(200);
    expect(solutionUnlockCreateMock).toHaveBeenCalledWith({ data: { userId: "user1", itemId: "item-migrated-1" } });
  });

  it("Sessiya tarmog'ida itemIds ichida bo'lmagan itemId uchun 404 qaytaradi", async () => {
    findUniqueResultMock.mockResolvedValue({ userId: "user1", testId: null, sessionId: "session1" });
    findUniqueTestSessionMock.mockResolvedValue({ itemIds: ["item1", "item2"] });
    const { status } = await callPost({ questionId: "item-not-in-session" });
    expect(status).toBe(404);
  });

  it("Sessiya tarmog'ida itemIds ichidagi itemId bilan yechimni ochadi", async () => {
    findUniqueResultMock.mockResolvedValue({ userId: "user1", testId: null, sessionId: "session1" });
    findUniqueTestSessionMock.mockResolvedValue({ itemIds: ["item1", "item2"] });

    const { status, data } = await callPost({ questionId: "item1" });
    expect(status).toBe(200);
    expect(data.unlocked).toBe(true);
  });

  it("kunlik yechim kvotasi tugagan bo'lsa 429 qaytaradi", async () => {
    findUniqueResultMock.mockResolvedValue({ userId: "user1", testId: "test1", sessionId: null });
    findUniqueQuestionMock.mockResolvedValue({ testId: "test1", explanation: "Yechim matni", explanationImages: [], videoUrl: null });
    dailyUsageUpsertMock.mockResolvedValue({ solutionsUnlocked: 11 }); // FREE_DAILY_SOLUTIONS (10) dan oshgan

    const { status, data } = await callPost({ questionId: "q1" });
    expect(status).toBe(429);
    expect(data.code).toBe("SOLUTION_QUOTA_EXCEEDED");
    expect(solutionUnlockCreateMock).not.toHaveBeenCalled();
  });

  it("allaqachon ochilgan savol kvotani sarflamasdan 200 qaytaradi", async () => {
    findUniqueResultMock.mockResolvedValue({ userId: "user1", testId: "test1", sessionId: null });
    findUniqueQuestionMock.mockResolvedValue({ testId: "test1", explanation: "Yechim matni", explanationImages: [], videoUrl: null });
    solutionUnlockFindUniqueMock.mockResolvedValue({ userId: "user1", itemId: "q1" });

    const { status, data } = await callPost({ questionId: "q1" });
    expect(status).toBe(200);
    expect(data.alreadyUnlocked).toBe(true);
    expect(dailyUsageUpsertMock).not.toHaveBeenCalled();
  });
});
