import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireTeacherMock, findTeacherMock, findTestMock, createTestMock } = vi.hoisted(() => ({
  requireTeacherMock: vi.fn(),
  findTeacherMock: vi.fn(),
  findTestMock: vi.fn(),
  createTestMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    teacher: { findUnique: (...args: unknown[]) => findTeacherMock(...args) },
    test: {
      findUnique: (...args: unknown[]) => findTestMock(...args),
      create: (...args: unknown[]) => createTestMock(...args),
    },
  },
}));
vi.mock("@/lib/api-auth", () => ({ requireTeacher: () => requireTeacherMock() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

import { POST } from "../route";

const question = (over: Record<string, unknown> = {}) => ({
  text: "Savol",
  images: [],
  options: [{ label: "A", text: "1" }],
  correctAnswer: "A",
  type: "MULTIPLE_CHOICE",
  explanation: null,
  explanationImages: [],
  videoUrl: null,
  points: 1,
  order: 0,
  tags: [],
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  requireTeacherMock.mockResolvedValue({ user: { id: "user1", role: "TEACHER" }, error: null });
  findTeacherMock.mockResolvedValue({ id: "teacher1" });
  createTestMock.mockResolvedValue({
    id: "copy1",
    titleUz: "Attestatsiya (nusxa)",
    subject: { nameUz: "Fizika", icon: null },
    isPublished: false,
    isFree: false,
  });
});

async function callDuplicate() {
  const request = new Request("http://localhost/api/teacher/tests/t1/duplicate", { method: "POST" });
  return POST(request as never, { params: Promise.resolve({ id: "t1" }) });
}

describe("POST /api/teacher/tests/[id]/duplicate", () => {
  it.each([true, false])('mock belgisi %s nusxada saqlanadi', async (isMock) => {
    findTestMock.mockResolvedValue({ id: 't1', titleUz: 'Attestatsiya', teacherId: 'teacher1', isMock, questions: [] });
    expect((await callDuplicate()).status).toBe(200);
    expect(createTestMock.mock.calls[0][0].data.isMock).toBe(isMock);
  });

  it("savollarning teglari (attestatsiya bo'limlari) nusxaga ko'chadi", async () => {
    findTestMock.mockResolvedValue({
      id: "t1",
      titleUz: "Attestatsiya",
      titleRu: null,
      titleEn: null,
      teacherId: "teacher1",
      questions: [
        question({ order: 0, tags: ["section:fizika", "boshqa"] }),
        question({ order: 1, tags: ["section:pedagogika"] }),
      ],
    });

    const response = await callDuplicate();

    expect(response.status).toBe(200);
    const created = createTestMock.mock.calls[0][0].data.questions.create;
    expect(created.map((q: { tags: string[] }) => q.tags)).toEqual([
      ["section:fizika", "boshqa"],
      ["section:pedagogika"],
    ]);
  });

  it("begona ustozning testini nusxalamaydi", async () => {
    findTestMock.mockResolvedValue({ id: "t1", teacherId: "boshqa", questions: [] });

    const response = await callDuplicate();

    expect(response.status).toBe(403);
    expect(createTestMock).not.toHaveBeenCalled();
  });
});
