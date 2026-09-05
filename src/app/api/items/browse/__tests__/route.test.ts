import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyItemMock, countItemMock, requireTeacherMock } = vi.hoisted(() => ({
  findManyItemMock: vi.fn(),
  countItemMock: vi.fn(),
  requireTeacherMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    item: {
      findMany: (...args: unknown[]) => findManyItemMock(...args),
      count: (...args: unknown[]) => countItemMock(...args),
    },
  },
}));

vi.mock("@/lib/api-auth", () => ({
  requireTeacher: () => requireTeacherMock(),
}));

import { POST } from "../route";

async function callBrowse(body: unknown) {
  const request = new Request("http://localhost/api/items/browse", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const response = await POST(request as any);
  return { status: response.status, data: await response.json() };
}

function mcqItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "item1",
    text: "2 + 2 nechiga teng?",
    type: "MULTIPLE_CHOICE",
    difficulty: 2,
    correctAnswer: "B",
    options: [
      { label: "A", text: "3" },
      { label: "B", text: "4" },
      { label: "C", text: "5" },
    ],
    topics: [{ topic: { path: "arifmetika/qoshish" } }],
    ...overrides,
  };
}

describe("POST /api/items/browse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireTeacherMock.mockReturnValue({ user: { id: "teacher1", role: "TEACHER" }, error: null });
    countItemMock.mockResolvedValue(0);
    findManyItemMock.mockResolvedValue([]);
  });

  it("oddiy foydalanuvchi (o'qituvchi bo'lmagan) uchun requireTeacher xatosini to'g'ridan-to'g'ri qaytaradi", async () => {
    const forbidden = new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    requireTeacherMock.mockReturnValue({ user: null, error: forbidden });

    const { status } = await callBrowse({ subjectIds: ["sub1"] });

    expect(status).toBe(403);
    expect(findManyItemMock).not.toHaveBeenCalled();
  });

  it("fan + mavzu tanlanganda savollarni MATNI bilan qaytaradi", async () => {
    findManyItemMock.mockResolvedValue([mcqItem()]);
    countItemMock.mockResolvedValue(1);

    const { status, data } = await callBrowse({ subjectIds: ["sub1"], topicPaths: ["arifmetika"] });

    expect(status).toBe(200);
    expect(data.total).toBe(1);
    expect(data.page).toBe(1);
    expect(data.items[0]).toMatchObject({
      id: "item1",
      text: "2 + 2 nechiga teng?",
      type: "MULTIPLE_CHOICE",
      difficulty: 2,
      topicPath: "arifmetika/qoshish",
    });
    // To'g'ri javob (B) optionsPreview'da belgilangan — o'qituvchi darhol ko'radi.
    expect(data.items[0].optionsPreview).toEqual([
      { label: "A", text: "3", correct: false },
      { label: "B", text: "4", correct: true },
      { label: "C", text: "5", correct: false },
    ]);
  });

  it("MULTI_SELECT uchun bir nechta to'g'ri labelni (vergul bilan) to'g'ri belgilaydi", async () => {
    findManyItemMock.mockResolvedValue([
      mcqItem({
        type: "MULTI_SELECT",
        correctAnswer: "A,C",
        options: [{ label: "A", text: "1" }, { label: "B", text: "2" }, { label: "C", text: "3" }],
      }),
    ]);

    const { data } = await callBrowse({ subjectIds: ["sub1"] });

    expect(data.items[0].optionsPreview).toEqual([
      { label: "A", text: "1", correct: true },
      { label: "B", text: "2", correct: false },
      { label: "C", text: "3", correct: true },
    ]);
  });

  it("MATCHING kabi mos kelmaydigan options shaklida bo'sh optionsPreview qaytaradi (buzilmaydi)", async () => {
    findManyItemMock.mockResolvedValue([
      mcqItem({ type: "MATCHING", options: { left: ["a"], right: ["b"] }, correctAnswer: "0" }),
    ]);

    const { status, data } = await callBrowse({ subjectIds: ["sub1"] });

    expect(status).toBe(200);
    expect(data.items[0].optionsPreview).toEqual([]);
  });

  it("matn qidiruvi (q) contains + insensitive bilan where'ga qo'shiladi", async () => {
    await callBrowse({ subjectIds: ["sub1"], q: "Pifagor" });

    expect(findManyItemMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PUBLISHED",
          visibility: "PUBLIC",
          subjectId: { in: ["sub1"] },
          text: { contains: "Pifagor", mode: "insensitive" },
        }),
      })
    );
  });

  it("q berilmasa where'ga text filtri qo'shilmaydi", async () => {
    await callBrowse({ subjectIds: ["sub1"] });

    const where = findManyItemMock.mock.calls[0][0].where;
    expect(where.text).toBeUndefined();
  });

  it("sahifalash ishlaydi — page/pageSize skip/take'ga to'g'ri o'tadi", async () => {
    await callBrowse({ subjectIds: ["sub1"], page: 3, pageSize: 10 });

    expect(findManyItemMock).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 })
    );
  });

  it("pageSize 50 dan katta bo'lsa 400 qaytaradi", async () => {
    const { status, data } = await callBrowse({ subjectIds: ["sub1"], pageSize: 51 });
    expect(status).toBe(400);
    expect(data.error).toContain("pageSize");
    expect(findManyItemMock).not.toHaveBeenCalled();
  });

  it("page 0 yoki manfiy bo'lsa 400 qaytaradi", async () => {
    const { status } = await callBrowse({ subjectIds: ["sub1"], page: 0 });
    expect(status).toBe(400);
  });

  it("bo'sh natijada ham 200 va bo'sh items qaytaradi (frontend aniq xabar ko'rsatadi)", async () => {
    countItemMock.mockResolvedValue(0);
    findManyItemMock.mockResolvedValue([]);

    const { status, data } = await callBrowse({ subjectIds: ["sub1"], topicPaths: ["yoq-mavzu"] });

    expect(status).toBe(200);
    expect(data.items).toEqual([]);
    expect(data.total).toBe(0);
  });
});
