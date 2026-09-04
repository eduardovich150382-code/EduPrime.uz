import { beforeEach, describe, expect, it, vi } from "vitest";

const { loadLessonAccessMock, loadBlockAccessMock, createSessionFromSpecMock, requireAuthMock } = vi.hoisted(() => ({
  loadLessonAccessMock: vi.fn(),
  loadBlockAccessMock: vi.fn(),
  createSessionFromSpecMock: vi.fn(),
  requireAuthMock: vi.fn(),
}));

vi.mock("@/lib/lesson-access", () => ({
  loadLessonVideoCheckpointAccess: (...args: unknown[]) => loadLessonAccessMock(...args),
  loadVideoSolutionCheckpointAccess: (...args: unknown[]) => loadBlockAccessMock(...args),
}));

vi.mock("@/lib/sessions", () => ({
  createSessionFromSpec: (...args: unknown[]) => createSessionFromSpecMock(...args),
}));

vi.mock("@/lib/api-auth", () => ({
  requireAuth: () => requireAuthMock(),
}));

import { POST } from "../route";

async function callStart(kind: string, id: string) {
  const request = new Request(`http://localhost/api/video-checkpoints/${kind}/${id}/start`, { method: "POST" });
  const response = await POST(request as any, { params: Promise.resolve({ kind, id }) });
  return { status: response.status, data: await response.json() };
}

describe("POST /api/video-checkpoints/[kind]/[id]/start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockReturnValue({ user: { id: "user1", role: "USER" }, error: null });
  });

  it("noto'g'ri kind uchun 400 qaytaradi", async () => {
    const { status } = await callStart("course", "x1");
    expect(status).toBe(400);
    expect(loadLessonAccessMock).not.toHaveBeenCalled();
    expect(loadBlockAccessMock).not.toHaveBeenCalled();
  });

  it("kind=lesson bo'lsa loadLessonVideoCheckpointAccess'ni chaqiradi", async () => {
    loadLessonAccessMock.mockResolvedValue({ ok: false, status: 403, error: "Siz bu kursga yozilmagansiz" });
    const { status, data } = await callStart("lesson", "lesson1");
    expect(status).toBe(403);
    expect(data.error).toBe("Siz bu kursga yozilmagansiz");
    expect(loadBlockAccessMock).not.toHaveBeenCalled();
  });

  it("kind=block bo'lsa loadVideoSolutionCheckpointAccess'ni chaqiradi", async () => {
    loadBlockAccessMock.mockResolvedValue({ ok: false, status: 404, error: "Blok topilmadi" });
    const { status } = await callStart("block", "block1");
    expect(status).toBe(404);
    expect(loadLessonAccessMock).not.toHaveBeenCalled();
  });

  it("checkpoints bo'sh bo'lsa 404 qaytaradi", async () => {
    loadLessonAccessMock.mockResolvedValue({ ok: true, access: { checkpoints: [], label: "Dars" } });
    const { status } = await callStart("lesson", "lesson1");
    expect(status).toBe(404);
    expect(createSessionFromSpecMock).not.toHaveBeenCalled();
  });

  it("createSessionFromSpec'ni countsAgainstQuota:false va onlyItemIds bilan chaqiradi, checkpoints javobda qaytadi", async () => {
    loadLessonAccessMock.mockResolvedValue({
      ok: true,
      access: { checkpoints: [{ atSeconds: 5, itemId: "item1" }, { atSeconds: 20, itemId: "item2" }], label: "Dars 1" },
    });
    createSessionFromSpecMock.mockResolvedValue({
      ok: true,
      session: { id: "session1", title: "Dars 1", mode: "FIXED", durationMin: 240, startedAt: new Date(), expiresAt: new Date(), questionCount: 2, questions: [{ id: "item1" }, { id: "item2" }] },
      relaxed: [],
    });

    const { status, data } = await callStart("lesson", "lesson1");

    expect(status).toBe(200);
    expect(data.sessionId).toBe("session1");
    expect(data.checkpoints).toEqual([{ atSeconds: 5, itemId: "item1" }, { atSeconds: 20, itemId: "item2" }]);
    expect(data.questions).toHaveLength(2);
    expect(createSessionFromSpecMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user1",
        spec: { onlyItemIds: ["item1", "item2"] },
        limit: 2,
        mode: "FIXED",
        countsAgainstQuota: false,
      })
    );
  });
});
