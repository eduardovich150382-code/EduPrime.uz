import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * S17 — "teshik": AI tushuntirish yozma yechimning o'rnini bosadi, shuning
 * uchun XUDDI SHU qulfni (`resolveSolutionVisibility`) talab qiladi.
 * Naqsh `courses/[id]/__tests__/route.test.ts` bilan bir xil.
 */
const {
  findUniqueResultMock,
  findUniqueQuestionMock,
  updateQuestionMock,
  authMock,
  userFindUniqueMock,
  subscriptionFindManyMock,
  solutionUnlockFindUniqueMock,
  systemSettingFindUniqueMock,
  systemSettingUpsertMock,
  streamExplainQuestionMock,
} = vi.hoisted(() => ({
  findUniqueResultMock: vi.fn(),
  findUniqueQuestionMock: vi.fn(),
  updateQuestionMock: vi.fn(),
  authMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  subscriptionFindManyMock: vi.fn(),
  solutionUnlockFindUniqueMock: vi.fn(),
  systemSettingFindUniqueMock: vi.fn(),
  systemSettingUpsertMock: vi.fn(),
  streamExplainQuestionMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    testResult: { findUnique: (...args: unknown[]) => findUniqueResultMock(...args) },
    question: {
      findUnique: (...args: unknown[]) => findUniqueQuestionMock(...args),
      update: (...args: unknown[]) => updateQuestionMock(...args),
    },
    user: { findUnique: (...args: unknown[]) => userFindUniqueMock(...args) },
    subscription: { findMany: (...args: unknown[]) => subscriptionFindManyMock(...args) },
    solutionUnlock: { findUnique: (...args: unknown[]) => solutionUnlockFindUniqueMock(...args) },
    systemSetting: {
      findUnique: (...args: unknown[]) => systemSettingFindUniqueMock(...args),
      upsert: (...args: unknown[]) => systemSettingUpsertMock(...args),
    },
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
    options: [{ label: "A", text: "4", image: null }],
    correctAnswer: "A",
    explanation: "Chunki 2+2=4",
    videoUrl: null,
    type: "MULTIPLE_CHOICE",
    aiExplanations: null,
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
    systemSettingFindUniqueMock.mockResolvedValue(null);
    systemSettingUpsertMock.mockResolvedValue({});
    updateQuestionMock.mockResolvedValue({});
    streamExplainQuestionMock.mockReturnValue(fakeChunks());
    findUniqueResultMock.mockResolvedValue({ userId: "user1", testId: "test1" });
  });

  it("yechim ochilmagan savolda 403 (SOLUTION_LOCKED) qaytaradi", async () => {
    findUniqueQuestionMock.mockResolvedValue(baseQuestion());

    const response = await callPost({ questionId: "q1" });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.code).toBe("SOLUTION_LOCKED");
    expect(streamExplainQuestionMock).not.toHaveBeenCalled();
  });

  it("SolutionUnlock mavjud bo'lsa AI tushuntirishga ruxsat beradi", async () => {
    findUniqueQuestionMock.mockResolvedValue(baseQuestion());
    solutionUnlockFindUniqueMock.mockResolvedValue({ userId: "user1", itemId: "q1" });

    const response = await callPost({ questionId: "q1" });
    expect(response.status).toBe(200);
    const text = await readBody(response);
    expect(text).toBe("AI tushuntirishi");
  });

  it("PREMIUM obunachi uchun har doim ruxsat beradi", async () => {
    findUniqueQuestionMock.mockResolvedValue(baseQuestion());
    subscriptionFindManyMock.mockResolvedValue([{ plan: "PREMIUM" }]);

    const response = await callPost({ questionId: "q1" });
    expect(response.status).toBe(200);
  });

  it("savolda faqat video yechim bor (yozma yo'q), Premium emas — 403 qaytaradi", async () => {
    findUniqueQuestionMock.mockResolvedValue(
      baseQuestion({ explanation: null, videoUrl: "https://youtube.com/watch?v=x" })
    );

    const response = await callPost({ questionId: "q1" });
    const data = await response.json();
    expect(response.status).toBe(403);
    expect(data.code).toBe("SOLUTION_LOCKED");
  });

  it("savolda hech qanday yechim yo'q bo'lsa (solutionKind: none) cheklovsiz ruxsat beradi", async () => {
    findUniqueQuestionMock.mockResolvedValue(baseQuestion({ explanation: null, videoUrl: null }));

    const response = await callPost({ questionId: "q1" });
    expect(response.status).toBe(200);
  });
});
