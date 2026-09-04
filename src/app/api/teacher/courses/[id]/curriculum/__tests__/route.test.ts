import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

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

describe("PUT /api/teacher/courses/[id]/curriculum — video nazorat nuqtalari (S23)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireTeacherMock.mockReturnValue({ user: { id: "teacher-user-1", role: "TEACHER" }, error: null });
    findUniqueCourseMock.mockResolvedValue({ id: "course1", teacherId: "teacherRow1", teacher: { userId: "teacher-user-1" } });
    findManySectionMock.mockResolvedValue([]);
    transactionMock.mockImplementation(async (fn: any) => fn(buildTx()));
  });

  function sectionsWithLessonCheckpoints(checkpoints: unknown) {
    return [{ titleUz: "Bo'lim 1", lessons: [{ titleUz: "Dars 1", type: "VIDEO", checkpoints, blocks: [] }] }];
  }

  it("dars videosi noto'g'ri shakldagi checkpoints bilan rad etiladi", async () => {
    const { status, data } = await callPut(sectionsWithLessonCheckpoints([{ atSeconds: -1, itemId: "item1" }]));
    expect(status).toBe(400);
    expect(data.error).toContain("nazorat nuqtalari");
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("bir xil vaqtga ikkita nuqta bilan rad etiladi", async () => {
    const { status } = await callPut(
      sectionsWithLessonCheckpoints([{ atSeconds: 10, itemId: "item1" }, { atSeconds: 10, itemId: "item2" }])
    );
    expect(status).toBe(400);
  });

  it("nashr etilmagan savolga ishora qilgan checkpoint rad etiladi", async () => {
    findManyItemMock.mockResolvedValue([]); // item1 topilmadi/nashr etilmagan
    const { status, data } = await callPut(sectionsWithLessonCheckpoints([{ atSeconds: 5, itemId: "item1" }]));
    expect(status).toBe(400);
    expect(data.error).toContain("nashr etilmagan");
  });

  it("to'g'ri checkpoints dars videosiga saqlanadi (vaqt bo'yicha tartiblanib)", async () => {
    findManyItemMock.mockResolvedValue([{ id: "item1" }, { id: "item2" }]);
    const tx = buildTx();
    transactionMock.mockImplementation(async (fn: any) => fn(tx));

    const { status } = await callPut(
      sectionsWithLessonCheckpoints([{ atSeconds: 20, itemId: "item2" }, { atSeconds: 5, itemId: "item1" }])
    );

    expect(status).toBe(200);
    expect(tx.courseLesson.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          checkpoints: [{ atSeconds: 5, itemId: "item1" }, { atSeconds: 20, itemId: "item2" }],
        }),
      })
    );
  });

  it("VIDEO_SOLUTION blokidagi checkpoints ham xuddi shunday saqlanadi", async () => {
    findManyItemMock.mockResolvedValue([{ id: "item1" }]);

    const { status } = await callPut(
      sectionsWithBlocks([{ type: "VIDEO_SOLUTION", videoUrl: "https://youtube.com/watch?v=x", checkpoints: [{ atSeconds: 5, itemId: "item1" }] }])
    );

    expect(status).toBe(200);
    expect(txLessonBlockCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "VIDEO_SOLUTION", checkpoints: [{ atSeconds: 5, itemId: "item1" }] }),
      })
    );
  });

  it("boshqa dars/blok turlarida checkpoints saqlanmaydi (null)", async () => {
    findManyItemMock.mockResolvedValue([]);
    const tx = buildTx();
    transactionMock.mockImplementation(async (fn: any) => fn(tx));

    const { status } = await callPut([{ titleUz: "Bo'lim 1", lessons: [{ titleUz: "Dars 1", type: "TEXT", content: "matn", blocks: [] }] }]);

    expect(status).toBe(200);
    expect(tx.courseLesson.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ checkpoints: Prisma.JsonNull }) })
    );
  });
});
