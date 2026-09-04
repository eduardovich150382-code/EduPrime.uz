import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findUniqueBlockMock, findUniqueEnrollmentMock, findManyProgressMock,
  findUniqueLessonMock, findManyTestResultMock,
} = vi.hoisted(() => ({
  findUniqueBlockMock: vi.fn(),
  findUniqueEnrollmentMock: vi.fn(),
  findManyProgressMock: vi.fn(),
  findUniqueLessonMock: vi.fn(),
  findManyTestResultMock: vi.fn(),
}));

vi.mock("../db", () => ({
  db: {
    lessonBlock: { findUnique: (...args: unknown[]) => findUniqueBlockMock(...args) },
    courseEnrollment: { findUnique: (...args: unknown[]) => findUniqueEnrollmentMock(...args) },
    lessonProgress: { findMany: (...args: unknown[]) => findManyProgressMock(...args) },
    courseLesson: { findUnique: (...args: unknown[]) => findUniqueLessonMock(...args) },
    testResult: { findMany: (...args: unknown[]) => findManyTestResultMock(...args) },
  },
}));

import { loadPracticeBlockAccess, loadLessonVideoCheckpointAccess, loadVideoSolutionCheckpointAccess } from "../lesson-access";

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

function buildCourseGate(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "course1",
    teacherId: "teacher1",
    sequentialUnlock: false,
    teacher: { userId: "teacher-user-1" },
    sections: [{ lessons: [{ id: "lesson1", type: "VIDEO", minPassPercent: null }] }],
    ...overrides,
  };
}

describe("loadLessonVideoCheckpointAccess", () => {
  beforeEach(() => vi.clearAllMocks());

  it("dars topilmasa 404 qaytaradi", async () => {
    findUniqueLessonMock.mockResolvedValue(null);
    const result = await loadLessonVideoCheckpointAccess("lesson1", "user1", "USER");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it("VIDEO turi bo'lmagan darsda 404 qaytaradi", async () => {
    findUniqueLessonMock.mockResolvedValue({ id: "lesson1", type: "TEXT", titleUz: "Dars", checkpoints: null, section: { course: buildCourseGate() } });
    const result = await loadLessonVideoCheckpointAccess("lesson1", "user1", "USER");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it("yozilmagan foydalanuvchiga 403 qaytaradi", async () => {
    findUniqueLessonMock.mockResolvedValue({ id: "lesson1", type: "VIDEO", titleUz: "Dars", checkpoints: null, section: { course: buildCourseGate() } });
    findUniqueEnrollmentMock.mockResolvedValue(null);
    const result = await loadLessonVideoCheckpointAccess("lesson1", "student1", "USER");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("qulflangan darsda 403 qaytaradi (sequentialUnlock)", async () => {
    findUniqueLessonMock.mockResolvedValue({
      id: "lesson2",
      type: "VIDEO",
      titleUz: "Dars 2",
      checkpoints: [{ atSeconds: 5, itemId: "item1" }],
      section: {
        course: buildCourseGate({
          sequentialUnlock: true,
          sections: [{ lessons: [{ id: "lesson1", type: "VIDEO", minPassPercent: null }, { id: "lesson2", type: "VIDEO", minPassPercent: null }] }],
        }),
      },
    });
    findUniqueEnrollmentMock.mockResolvedValue({ id: "enrollment1" });
    findManyProgressMock.mockResolvedValue([]); // lesson1 tugatilmagan
    const result = await loadLessonVideoCheckpointAccess("lesson2", "student1", "USER");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("ochiq darsda checkpoints'ni qaytaradi", async () => {
    findUniqueLessonMock.mockResolvedValue({
      id: "lesson1", type: "VIDEO", titleUz: "Dars 1",
      checkpoints: [{ atSeconds: 10, itemId: "item1" }],
      section: { course: buildCourseGate() },
    });
    findUniqueEnrollmentMock.mockResolvedValue({ id: "enrollment1" });
    findManyProgressMock.mockResolvedValue([]);
    const result = await loadLessonVideoCheckpointAccess("lesson1", "student1", "USER");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.access.checkpoints).toEqual([{ atSeconds: 10, itemId: "item1" }]);
  });
});

describe("loadVideoSolutionCheckpointAccess", () => {
  beforeEach(() => vi.clearAllMocks());

  function buildSolutionBlock(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: "block1",
      type: "VIDEO_SOLUTION",
      labelUz: "Yechim",
      revealAfterQuiz: false,
      checkpoints: [{ atSeconds: 5, itemId: "item1" }],
      lesson: {
        id: "lesson1",
        type: "VIDEO",
        testId: null,
        blocks: [],
        section: { course: buildCourseGate() },
      },
      ...overrides,
    };
  }

  it("blok topilmasa yoki VIDEO_SOLUTION bo'lmasa 404 qaytaradi", async () => {
    findUniqueBlockMock.mockResolvedValue(null);
    const result = await loadVideoSolutionCheckpointAccess("block1", "user1", "USER");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it("revealAfterQuiz yoqilgan va tekshiruv topshirilmagan bo'lsa 403 qaytaradi — checkpoints sizib chiqmaydi", async () => {
    findUniqueBlockMock.mockResolvedValue(buildSolutionBlock({
      revealAfterQuiz: true,
      lesson: { id: "lesson1", type: "VIDEO", testId: null, blocks: [{ type: "QUIZ", testId: "quiz1" }], section: { course: buildCourseGate() } },
    }));
    findUniqueEnrollmentMock.mockResolvedValue({ id: "enrollment1" });
    findManyProgressMock.mockResolvedValue([]);
    findManyTestResultMock.mockResolvedValue([]); // topshirilmagan
    const result = await loadVideoSolutionCheckpointAccess("block1", "student1", "USER");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("revealAfterQuiz yoqilgan va tekshiruv topshirilgan bo'lsa checkpoints ochiladi", async () => {
    findUniqueBlockMock.mockResolvedValue(buildSolutionBlock({
      revealAfterQuiz: true,
      lesson: { id: "lesson1", type: "VIDEO", testId: null, blocks: [{ type: "QUIZ", testId: "quiz1" }], section: { course: buildCourseGate() } },
    }));
    findUniqueEnrollmentMock.mockResolvedValue({ id: "enrollment1" });
    findManyProgressMock.mockResolvedValue([]);
    findManyTestResultMock.mockResolvedValue([{ testId: "quiz1" }]); // topshirilgan
    const result = await loadVideoSolutionCheckpointAccess("block1", "student1", "USER");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.access.checkpoints).toEqual([{ atSeconds: 5, itemId: "item1" }]);
  });

  it("revealAfterQuiz o'chiq bo'lsa har doim ochiq", async () => {
    findUniqueBlockMock.mockResolvedValue(buildSolutionBlock({ revealAfterQuiz: false }));
    findUniqueEnrollmentMock.mockResolvedValue({ id: "enrollment1" });
    findManyProgressMock.mockResolvedValue([]);
    const result = await loadVideoSolutionCheckpointAccess("block1", "student1", "USER");
    expect(result.ok).toBe(true);
    expect(findManyTestResultMock).not.toHaveBeenCalled();
  });
});
