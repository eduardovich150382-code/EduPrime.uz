import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `@/lib/lesson-access` va `@/lib/sessions#createSessionFromSpec`ni mock
 * qilamiz — marshrutning o'zi shu ikkisini TO'G'RI parametrlar bilan
 * chaqirayotganini tekshiramiz (eng muhimi: `countsAgainstQuota: false` —
 * PRACTICE hech qachon kunlik konstruktor test kvotasini sarflamasin).
 */
const { loadPracticeBlockAccessMock, createSessionFromSpecMock, requireAuthMock } = vi.hoisted(() => ({
  loadPracticeBlockAccessMock: vi.fn(),
  createSessionFromSpecMock: vi.fn(),
  requireAuthMock: vi.fn(),
}));

vi.mock("@/lib/lesson-access", () => ({
  loadPracticeBlockAccess: (...args: unknown[]) => loadPracticeBlockAccessMock(...args),
}));

vi.mock("@/lib/sessions", () => ({
  createSessionFromSpec: (...args: unknown[]) => createSessionFromSpecMock(...args),
}));

vi.mock("@/lib/api-auth", () => ({
  requireAuth: () => requireAuthMock(),
}));

import { POST } from "../route";

async function callStart() {
  const request = new Request("http://localhost/api/lesson-blocks/block1/practice/start", { method: "POST" });
  const response = await POST(request as any, { params: Promise.resolve({ id: "block1" }) });
  return { status: response.status, data: await response.json() };
}

describe("POST /api/lesson-blocks/[id]/practice/start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockReturnValue({ user: { id: "user1", role: "USER" }, error: null });
  });

  it("kirish rad etilsa shu xatoni qaytaradi", async () => {
    loadPracticeBlockAccessMock.mockResolvedValue({ ok: false, status: 403, error: "Siz bu kursga yozilmagansiz" });
    const { status, data } = await callStart();
    expect(status).toBe(403);
    expect(data.error).toBe("Siz bu kursga yozilmagansiz");
    expect(createSessionFromSpecMock).not.toHaveBeenCalled();
  });

  it("blok hali savolsiz bo'lsa 404 qaytaradi", async () => {
    loadPracticeBlockAccessMock.mockResolvedValue({ ok: true, block: { id: "block1", labelUz: "Mashq", itemIds: [] } });
    const { status } = await callStart();
    expect(status).toBe(404);
    expect(createSessionFromSpecMock).not.toHaveBeenCalled();
  });

  it("createSessionFromSpec'ni countsAgainstQuota:false bilan chaqiradi (kvota sarflanmaydi) va TestSession itemIds'ni onlyItemIds sifatida beradi", async () => {
    loadPracticeBlockAccessMock.mockResolvedValue({
      ok: true,
      block: { id: "block1", labelUz: "Fizika mashqi", itemIds: ["item1", "item2"] },
    });
    createSessionFromSpecMock.mockResolvedValue({
      ok: true,
      session: { id: "session1", title: "Fizika mashqi", mode: "FIXED", durationMin: 240, startedAt: new Date(), expiresAt: new Date(), questionCount: 2, questions: [{ id: "item1" }, { id: "item2" }] },
      relaxed: [],
    });

    const { status, data } = await callStart();

    expect(status).toBe(200);
    expect(data.sessionId).toBe("session1");
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

  it("createSessionFromSpec xato qaytarsa shu status/xabar bilan javob beradi", async () => {
    loadPracticeBlockAccessMock.mockResolvedValue({
      ok: true,
      block: { id: "block1", labelUz: "Mashq", itemIds: ["item1"] },
    });
    createSessionFromSpecMock.mockResolvedValue({
      ok: false,
      error: { status: 404, error: "Berilgan filtrga mos savol topilmadi" },
    });

    const { status, data } = await callStart();
    expect(status).toBe(404);
    expect(data.error).toBe("Berilgan filtrga mos savol topilmadi");
  });
});
