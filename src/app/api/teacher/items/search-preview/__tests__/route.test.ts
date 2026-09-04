import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyItemMock, requireTeacherMock } = vi.hoisted(() => ({
  findManyItemMock: vi.fn(),
  requireTeacherMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { item: { findMany: (...args: unknown[]) => findManyItemMock(...args) } },
}));

vi.mock("@/lib/api-auth", () => ({
  requireTeacher: () => requireTeacherMock(),
}));

import { POST } from "../route";

async function callSearch(body: unknown) {
  const request = new Request("http://localhost/api/teacher/items/search-preview", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const response = await POST(request as any);
  return { status: response.status, data: await response.json() };
}

describe("POST /api/teacher/items/search-preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireTeacherMock.mockReturnValue({ user: { id: "teacher1", role: "TEACHER" }, error: null });
  });

  it("o'qituvchi bo'lmagan foydalanuvchiga xatoni to'g'ridan-to'g'ri qaytaradi", async () => {
    const forbidden = new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    requireTeacherMock.mockReturnValue({ user: null, error: forbidden });
    const { status } = await callSearch({ subjectIds: ["sub1"] });
    expect(status).toBe(403);
    expect(findManyItemMock).not.toHaveBeenCalled();
  });

  it("subjectIds bo'lmasa 400 qaytaradi", async () => {
    const { status, data } = await callSearch({ query: "test" });
    expect(status).toBe(400);
    expect(data.error).toContain("subjectIds");
    expect(findManyItemMock).not.toHaveBeenCalled();
  });

  it("PUBLISHED/PUBLIC havzadan qidiradi va matnni qisqartiradi", async () => {
    const longText = "a".repeat(200);
    findManyItemMock.mockResolvedValue([
      { id: "item1", text: longText, difficulty: 3, type: "MULTIPLE_CHOICE" },
      { id: "item2", text: "qisqa savol", difficulty: null, type: "OPEN_ENDED" },
    ]);

    const { status, data } = await callSearch({ subjectIds: ["sub1"], query: "savol" });

    expect(status).toBe(200);
    expect(findManyItemMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PUBLISHED",
          visibility: "PUBLIC",
          subjectId: { in: ["sub1"] },
          text: { contains: "savol", mode: "insensitive" },
        }),
      })
    );
    expect(data.items[0].text.length).toBeLessThanOrEqual(161); // 160 + "…"
    expect(data.items[0].text.endsWith("…")).toBe(true);
    expect(data.items[1].text).toBe("qisqa savol");
  });
});
