import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUniqueSessionMock, findManyItemMock, requireAuthMock } = vi.hoisted(() => ({
  findUniqueSessionMock: vi.fn(),
  findManyItemMock: vi.fn(),
  requireAuthMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    testSession: { findUnique: (...args: unknown[]) => findUniqueSessionMock(...args) },
    item: { findMany: (...args: unknown[]) => findManyItemMock(...args) },
  },
}));

vi.mock("@/lib/api-auth", () => ({
  requireAuth: () => requireAuthMock(),
}));

import { GET } from "../route";

function buildSession(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "session1",
    userId: "user1",
    title: "Konstruktor testi",
    itemIds: ["item1", "item2"],
    seed: 42,
    mode: "FIXED",
    durationMin: 30,
    startedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 60_000),
    submittedAt: null,
    ...overrides,
  };
}

function buildItems() {
  return [
    {
      id: "item1", text: "1-savol", images: [], options: [{ label: "A", text: "x", image: null }],
      correctAnswer: "A", type: "MULTIPLE_CHOICE", explanation: "sir", explanationImages: [], videoUrl: null,
      subject: { nameUz: "Matematika", nameRu: "Математика", nameEn: "Math" },
    },
    {
      id: "item2", text: "2-savol", images: [], options: [{ label: "A", text: "y", image: null }],
      correctAnswer: "A", type: "MULTIPLE_CHOICE", explanation: null, explanationImages: [], videoUrl: null,
      subject: { nameUz: "Matematika", nameRu: "Математика", nameEn: "Math" },
    },
  ];
}

async function callGet() {
  const request = new Request("http://localhost/api/sessions/session1");
  const response = await GET(request as any, { params: Promise.resolve({ id: "session1" }) });
  return { status: response.status, data: await response.json() };
}

describe("GET /api/sessions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockReturnValue({ user: { id: "user1", role: "USER" }, error: null });
  });

  it("sessiya topilmasa 404 qaytaradi", async () => {
    findUniqueSessionMock.mockResolvedValue(null);
    const { status } = await callGet();
    expect(status).toBe(404);
  });

  it("boshqa foydalanuvchining sessiyasiga 403 qaytaradi", async () => {
    findUniqueSessionMock.mockResolvedValue(buildSession({ userId: "someone-else" }));
    const { status } = await callGet();
    expect(status).toBe(403);
  });

  it("admin boshqa foydalanuvchining sessiyasini ham ko'ra oladi", async () => {
    requireAuthMock.mockReturnValue({ user: { id: "admin1", role: "ADMIN" }, error: null });
    findUniqueSessionMock.mockResolvedValue(buildSession({ userId: "someone-else" }));
    findManyItemMock.mockResolvedValue(buildItems());
    const { status } = await callGet();
    expect(status).toBe(200);
  });

  it("savollarni to'g'ri javobsiz qaytaradi", async () => {
    findUniqueSessionMock.mockResolvedValue(buildSession());
    findManyItemMock.mockResolvedValue(buildItems());

    const { status, data } = await callGet();

    expect(status).toBe(200);
    expect(data.session.questionCount).toBe(2);
    for (const q of data.session.questions) {
      expect(q.correctAnswer).toBeUndefined();
      expect(q.explanation).toBeUndefined();
      expect(q.videoUrl).toBeUndefined();
    }
  });
});
