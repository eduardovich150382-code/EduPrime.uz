import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyItemMock, createSessionMock, requireAuthMock } = vi.hoisted(() => ({
  findManyItemMock: vi.fn(),
  createSessionMock: vi.fn(),
  requireAuthMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    testSession: { create: (...args: unknown[]) => createSessionMock(...args) },
    item: { findMany: (...args: unknown[]) => findManyItemMock(...args) },
  },
}));

vi.mock("@/lib/api-auth", () => ({
  requireAuth: () => requireAuthMock(),
}));

import { POST } from "../route";

function pickableItem(id: string, difficulty = 3) {
  return { id, templateId: null, difficulty };
}

function fullItem(id: string) {
  return {
    id, text: `Savol ${id}`, images: [], options: [{ label: "A", text: "x", image: null }],
    correctAnswer: "A", type: "MULTIPLE_CHOICE", explanation: null, explanationImages: [], videoUrl: null,
    subject: { nameUz: "Matematika", nameRu: "Математика", nameEn: "Math" },
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
});
