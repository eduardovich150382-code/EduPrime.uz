import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUniqueBlockMock, findUniqueEnrollmentMock, findManyProgressMock } = vi.hoisted(() => ({
  findUniqueBlockMock: vi.fn(),
  findUniqueEnrollmentMock: vi.fn(),
  findManyProgressMock: vi.fn(),
}));

vi.mock("../db", () => ({
  db: {
    lessonBlock: { findUnique: (...args: unknown[]) => findUniqueBlockMock(...args) },
    courseEnrollment: { findUnique: (...args: unknown[]) => findUniqueEnrollmentMock(...args) },
    lessonProgress: { findMany: (...args: unknown[]) => findManyProgressMock(...args) },
  },
}));

import { loadPracticeBlockAccess } from "../lesson-access";

function buildBlock(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "block1",
    type: "PRACTICE",
    labelUz: "Mashq",
    itemIds: ["item1"],
    lesson: {
      id: "lesson2",
      section: {
        course: {
          id: "course1",
          teacherId: "teacher1",
          sequentialUnlock: true,
          teacher: { userId: "teacher-user-1" },
          sections: [
            { lessons: [{ id: "lesson1", type: "VIDEO", minPassPercent: null }, { id: "lesson2", type: "VIDEO", minPassPercent: null }] },
          ],
        },
      },
    },
    ...overrides,
  };
}

describe("loadPracticeBlockAccess", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blok topilmasa 404 qaytaradi", async () => {
    findUniqueBlockMock.mockResolvedValue(null);
    const result = await loadPracticeBlockAccess("block1", "user1", "USER");
    expect(result).toEqual({ ok: false, status: 404, error: expect.any(String) });
  });

  it("blok PRACTICE bo'lmasa 404 qaytaradi", async () => {
    findUniqueBlockMock.mockResolvedValue(buildBlock({ type: "EMBED" }));
    const result = await loadPracticeBlockAccess("block1", "user1", "USER");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it("yozilmagan va egasi/admin bo'lmagan foydalanuvchiga 403 qaytaradi", async () => {
    findUniqueBlockMock.mockResolvedValue(buildBlock());
    findUniqueEnrollmentMock.mockResolvedValue(null);
    const result = await loadPracticeBlockAccess("block1", "some-student", "USER");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("kursning egasi (o'qituvchi) yozilmagan bo'lsa ham preview sifatida ko'ra oladi", async () => {
    findUniqueBlockMock.mockResolvedValue(buildBlock());
    findUniqueEnrollmentMock.mockResolvedValue(null);
    const result = await loadPracticeBlockAccess("block1", "teacher-user-1", "TEACHER");
    expect(result.ok).toBe(true);
  });

  it("ADMIN yozilmagan bo'lsa ham ko'ra oladi", async () => {
    findUniqueBlockMock.mockResolvedValue(buildBlock());
    findUniqueEnrollmentMock.mockResolvedValue(null);
    const result = await loadPracticeBlockAccess("block1", "some-admin", "ADMIN");
    expect(result.ok).toBe(true);
  });

  it("sequentialUnlock yoqilgan kursda oldingi dars tugatilmagan bo'lsa 403 (qulflangan)", async () => {
    findUniqueBlockMock.mockResolvedValue(buildBlock()); // block lesson2'da, lesson1 oldin turadi
    findUniqueEnrollmentMock.mockResolvedValue({ id: "enrollment1" });
    findManyProgressMock.mockResolvedValue([]); // lesson1 hali tugatilmagan
    const result = await loadPracticeBlockAccess("block1", "student1", "USER");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("oldingi dars tugatilgan bo'lsa PRACTICE blokiga kirish ochiladi", async () => {
    findUniqueBlockMock.mockResolvedValue(buildBlock());
    findUniqueEnrollmentMock.mockResolvedValue({ id: "enrollment1" });
    findManyProgressMock.mockResolvedValue([{ lessonId: "lesson1", completed: true, bestScorePercent: null }]);
    const result = await loadPracticeBlockAccess("block1", "student1", "USER");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.block.itemIds).toEqual(["item1"]);
  });

  it("sequentialUnlock o'chirilgan bo'lsa hech narsa qulflanmaydi", async () => {
    findUniqueBlockMock.mockResolvedValue(
      buildBlock({
        lesson: {
          id: "lesson2",
          section: {
            course: {
              id: "course1", teacherId: "teacher1", sequentialUnlock: false,
              teacher: { userId: "teacher-user-1" },
              sections: [{ lessons: [{ id: "lesson1", type: "VIDEO", minPassPercent: null }, { id: "lesson2", type: "VIDEO", minPassPercent: null }] }],
            },
          },
        },
      })
    );
    findUniqueEnrollmentMock.mockResolvedValue({ id: "enrollment1" });
    findManyProgressMock.mockResolvedValue([]);
    const result = await loadPracticeBlockAccess("block1", "student1", "USER");
    expect(result.ok).toBe(true);
  });
});
