import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findUniqueCourseMock,
  findManyTestMock,
  findManyItemMock,
  findManySectionMock,
  transactionMock,
  requireTeacherMock,
  txLessonBlockCreateMock,
  txLessonBlockUpdateMock,
} = vi.hoisted(() => ({
  findUniqueCourseMock: vi.fn(),
  findManyTestMock: vi.fn(),
  findManyItemMock: vi.fn(),
  findManySectionMock: vi.fn(),
  transactionMock: vi.fn(),
  requireTeacherMock: vi.fn(),
  txLessonBlockCreateMock: vi.fn(),
  txLessonBlockUpdateMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    course: { findUnique: (...args: unknown[]) => findUniqueCourseMock(...args) },
    test: { findMany: (...args: unknown[]) => findManyTestMock(...args) },
    item: { findMany: (...args: unknown[]) => findManyItemMock(...args) },
    courseSection: { findMany: (...args: unknown[]) => findManySectionMock(...args) },
    $transaction: (fn: any) => transactionMock(fn),
  },
}));

vi.mock("@/lib/api-auth", () => ({
  requireTeacher: () => requireTeacherMock(),
}));

import { PUT } from "../route";

function buildTx() {
  return {
    courseSection: {
      deleteMany: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({ id: "section1" }),
      update: vi.fn().mockResolvedValue({}),
    },
    courseLesson: {
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({ id: "lesson1" }),
      update: vi.fn().mockResolvedValue({}),
    },
    lessonBlock: {
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({}),
      create: (...args: unknown[]) => txLessonBlockCreateMock(...args),
      update: (...args: unknown[]) => txLessonBlockUpdateMock(...args),
    },
  };
}

function sectionsWithBlocks(blocks: any[]) {
  return [{ titleUz: "Bo'lim 1", lessons: [{ titleUz: "Dars 1", type: "VIDEO", blocks }] }];
}

async function callPut(sections: any[]) {
  const request = new Request("http://localhost/api/teacher/courses/course1/curriculum", {
    method: "PUT",
    body: JSON.stringify({ sections }),
  });
  const response = await PUT(request as any, { params: Promise.resolve({ id: "course1" }) });
  return { status: response.status, data: await response.json() };
}

describe("PUT /api/teacher/courses/[id]/curriculum — EMBED/PRACTICE", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireTeacherMock.mockReturnValue({ user: { id: "teacher-user-1", role: "TEACHER" }, error: null });
    findUniqueCourseMock.mockResolvedValue({ id: "course1", teacherId: "teacherRow1", teacher: { userId: "teacher-user-1" } });
    findManySectionMock.mockResolvedValue([]);
    transactionMock.mockImplementation(async (fn: any) => fn(buildTx()));
  });

  it("ruxsat etilmagan EMBED domenini SERVER tomonda rad etadi", async () => {
    const { status, data } = await callPut(
      sectionsWithBlocks([{ type: "EMBED", embedUrl: "https://phet.colorado.edu/en/sim/x" }])
    );
    expect(status).toBe(400);
    expect(data.error).toContain("ruxsat etilmagan");
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("javascript: sxemasini rad etadi", async () => {
    const { status } = await callPut(sectionsWithBlocks([{ type: "EMBED", embedUrl: "javascript:alert(1)" }]));
    expect(status).toBe(400);
  });

  it("http (https emas) havolani rad etadi", async () => {
    const { status } = await callPut(sectionsWithBlocks([{ type: "EMBED", embedUrl: "http://www.geogebra.org/m/x" }]));
    expect(status).toBe(400);
  });

  it("PRACTICE bloki bo'sh itemIds bilan rad etiladi", async () => {
    const { status, data } = await callPut(sectionsWithBlocks([{ type: "PRACTICE", itemIds: [] }]));
    expect(status).toBe(400);
    expect(data.error).toContain("kamida bitta savol");
  });

  it("PRACTICE bloki chegaradan ko'p savol bilan rad etiladi", async () => {
    const itemIds = Array.from({ length: 31 }, (_, i) => `item${i}`);
    const { status, data } = await callPut(sectionsWithBlocks([{ type: "PRACTICE", itemIds }]));
    expect(status).toBe(400);
    expect(data.error).toContain("30");
  });

  it("PRACTICE bloki nashr etilmagan/topilmagan savolga ishora qilsa rad etiladi", async () => {
    findManyItemMock.mockResolvedValue([{ id: "item1" }]); // item2 topilmadi/nashr etilmagan
    const { status, data } = await callPut(sectionsWithBlocks([{ type: "PRACTICE", itemIds: ["item1", "item2"] }]));
    expect(status).toBe(400);
    expect(data.error).toContain("nashr etilmagan");
  });

  it("to'g'ri EMBED va PRACTICE bloklarini saqlaydi", async () => {
    findManyItemMock.mockResolvedValue([{ id: "item1" }, { id: "item2" }]);

    const { status } = await callPut(
      sectionsWithBlocks([
        { type: "EMBED", embedUrl: "https://www.geogebra.org/m/abc" },
        { type: "PRACTICE", itemIds: ["item1", "item2"] },
      ])
    );

    expect(status).toBe(200);
    expect(txLessonBlockCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "EMBED", embedUrl: "https://www.geogebra.org/m/abc", itemIds: [] }),
      })
    );
    expect(txLessonBlockCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "PRACTICE", itemIds: ["item1", "item2"], embedUrl: null }),
      })
    );
  });
});
