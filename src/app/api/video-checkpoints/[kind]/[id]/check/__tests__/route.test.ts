import { beforeEach, describe, expect, it, vi } from "vitest";

const { loadLessonAccessMock, loadBlockAccessMock, checkPracticeAnswerMock, requireAuthMock } = vi.hoisted(() => ({
  loadLessonAccessMock: vi.fn(),
  loadBlockAccessMock: vi.fn(),
  checkPracticeAnswerMock: vi.fn(),
  requireAuthMock: vi.fn(),
}));

vi.mock("@/lib/lesson-access", () => ({
  loadLessonVideoCheckpointAccess: (...args: unknown[]) => loadLessonAccessMock(...args),
  loadVideoSolutionCheckpointAccess: (...args: unknown[]) => loadBlockAccessMock(...args),
}));

vi.mock("@/lib/practice-answer-check", () => ({
  checkPracticeAnswer: (...args: unknown[]) => checkPracticeAnswerMock(...args),
}));

vi.mock("@/lib/api-auth", () => ({
  requireAuth: () => requireAuthMock(),
}));

import { POST } from "../route";

async function callCheck(kind: string, id: string, body: unknown) {
  const request = new Request(`http://localhost/api/video-checkpoints/${kind}/${id}/check`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const response = await POST(request as any, { params: Promise.resolve({ kind, id }) });
  return { status: response.status, data: await response.json() };
}

describe("POST /api/video-checkpoints/[kind]/[id]/check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockReturnValue({ user: { id: "user1", role: "USER" }, error: null });
  });

  it("noto'g'ri kind uchun 400 qaytaradi", async () => {
    const { status } = await callCheck("course", "x1", { sessionId: "s1", questionId: "item1", answer: "A" });
    expect(status).toBe(400);
  });

  it("kirish rad etilsa xatoni to'g'ridan-to'g'ri qaytaradi", async () => {
    loadBlockAccessMock.mockResolvedValue({ ok: false, status: 403, error: "Bu blok hali qulflangan" });
    const { status, data } = await callCheck("block", "block1", { sessionId: "s1", questionId: "item1", answer: "A" });
    expect(status).toBe(403);
    expect(data.error).toBe("Bu blok hali qulflangan");
    expect(checkPracticeAnswerMock).not.toHaveBeenCalled();
  });

  it("sessionId yoki questionId berilmasa 400 qaytaradi", async () => {
    loadLessonAccessMock.mockResolvedValue({ ok: true, access: { checkpoints: [{ atSeconds: 5, itemId: "item1" }], label: "Dars" } });
    const { status } = await callCheck("lesson", "lesson1", { answer: "A" });
    expect(status).toBe(400);
    expect(checkPracticeAnswerMock).not.toHaveBeenCalled();
  });

  it("checkPracticeAnswer'ni to'g'ri poolItemIds bilan chaqiradi va natijasini qaytaradi", async () => {
    loadLessonAccessMock.mockResolvedValue({
      ok: true,
      access: { checkpoints: [{ atSeconds: 5, itemId: "item1" }, { atSeconds: 20, itemId: "item2" }], label: "Dars" },
    });
    checkPracticeAnswerMock.mockResolvedValue({
      ok: true,
      result: { isCorrect: true, correctAnswer: "B", explanation: null, explanationImages: [], distractorWhy: null },
    });

    const { status, data } = await callCheck("lesson", "lesson1", { sessionId: "session1", questionId: "item1", answer: "B", timeSpent: 3 });

    expect(status).toBe(200);
    expect(data.isCorrect).toBe(true);
    expect(checkPracticeAnswerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user1",
        sessionId: "session1",
        questionId: "item1",
        answer: "B",
        poolItemIds: ["item1", "item2"],
      })
    );
  });

  it("checkPracticeAnswer xato qaytarsa shu status/xabar bilan javob beradi", async () => {
    loadBlockAccessMock.mockResolvedValue({ ok: true, access: { checkpoints: [{ atSeconds: 5, itemId: "item1" }], label: "Blok" } });
    checkPracticeAnswerMock.mockResolvedValue({ ok: false, status: 404, error: "Sessiya topilmadi" });

    const { status, data } = await callCheck("block", "block1", { sessionId: "session1", questionId: "item1", answer: "A" });
    expect(status).toBe(404);
    expect(data.error).toBe("Sessiya topilmadi");
  });
});
