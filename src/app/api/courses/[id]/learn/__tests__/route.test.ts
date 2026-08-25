import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `db` va `requireAuth`ni mock qilamiz — real baza va sessiya kerak emas.
 * `access.test.ts` bilan bir xil naqsh: `vi.hoisted` orqali mocklar faylning
 * eng boshiga ko'chiriladi, shu sababli quyidagi `../route` importi baribir
 * shu mock'langan `db`/`requireAuth` bilan ishlaydi.
 */
const {
  findUniqueCourseMock,
  findUniqueEnrollmentMock,
  findManyProgressMock,
  findManyTestResultMock,
  requireAuthMock,
} = vi.hoisted(() => ({
  findUniqueCourseMock: vi.fn(),
  findUniqueEnrollmentMock: vi.fn(),
  findManyProgressMock: vi.fn(),
  findManyTestResultMock: vi.fn(),
  requireAuthMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    course: { findUnique: (...args: unknown[]) => findUniqueCourseMock(...args) },
    courseEnrollment: { findUnique: (...args: unknown[]) => findUniqueEnrollmentMock(...args) },
    lessonProgress: { findMany: (...args: unknown[]) => findManyProgressMock(...args) },
    testResult: { findMany: (...args: unknown[]) => findManyTestResultMock(...args) },
  },
}));

vi.mock("@/lib/api-auth", () => ({
  requireAuth: () => requireAuthMock(),
}));

import { GET } from "../route";

// Bitta dars — QUIZ blok (test-quiz-1) + revealAfterQuiz=true bo'lgan
// VIDEO_SOLUTION blok. Dars o'zi qulflanmagan (sequentialUnlock o'chiq).
function buildCourse() {
  return {
    id: "course1",
    titleUz: "Test kursi",
    subject: { nameUz: "Matematika", icon: null },
    teacher: { userId: "teacher1", user: { name: "Ustoz" } },
    sequentialUnlock: false,
    sections: [
      {
        id: "sec1",
        titleUz: "Bo'lim 1",
        lessons: [
          {
            id: "lesson1",
            titleUz: "Dars 1",
            type: "VIDEO",
            durationMinutes: 10,
            videoUrl: "https://youtube.com/watch?v=main",
            content: null,
            testId: null,
            fileUrl: null,
            minPassPercent: null,
            test: null,
            blocks: [
              {
                id: "block-quiz",
                type: "QUIZ",
                order: 0,
                labelUz: "Mashq",
                fileUrl: null,
                videoUrl: null,
                testId: "test-quiz-1",
                revealAfterQuiz: false,
                test: { id: "test-quiz-1", titleUz: "Mashq testi", questionCount: 5, duration: 10 },
              },
              {
                id: "block-video",
                type: "VIDEO_SOLUTION",
                order: 1,
                labelUz: "Yechim videosi",
                fileUrl: null,
                videoUrl: "https://youtube.com/watch?v=solution",
                testId: null,
                revealAfterQuiz: true,
                test: null,
              },
            ],
          },
        ],
      },
    ],
  };
}

async function callGet() {
  const request = new Request("http://localhost/api/courses/course1/learn");
  const response = await GET(request, { params: Promise.resolve({ id: "course1" }) });
  return response.json() as Promise<{ course: any }>;
}

function findVideoBlock(course: any) {
  return course.sections[0].lessons[0].blocks.find((b: any) => b.id === "block-video");
}

describe("GET /api/courses/[id]/learn — revealAfterQuiz gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockReturnValue({ user: { id: "user1", role: "USER" }, error: null });
    findUniqueCourseMock.mockResolvedValue(buildCourse());
    findUniqueEnrollmentMock.mockResolvedValue({ id: "enr1", completedAt: null });
    findManyProgressMock.mockResolvedValue([]);
  });

  it("QUIZ blokini topshirmagan foydalanuvchiga videoUrl: null qaytaradi", async () => {
    findManyTestResultMock.mockResolvedValue([]); // hech qanday TestResult yo'q — topshirilmagan

    const { course } = await callGet();
    const block = findVideoBlock(course);

    expect(block.videoUrl).toBeNull();
  });

  it("QUIZ blokini topshirgan foydalanuvchiga videoUrl'ni ko'rsatadi", async () => {
    findManyTestResultMock.mockResolvedValue([{ testId: "test-quiz-1" }]); // topshirilgan

    const { course } = await callGet();
    const block = findVideoBlock(course);

    expect(block.videoUrl).toBe("https://youtube.com/watch?v=solution");
  });

  it("revealAfterQuiz o'chiq bo'lgan blok har doim ko'rinadi (eski xatti-harakat)", async () => {
    const course = buildCourse();
    course.sections[0].lessons[0].blocks[1].revealAfterQuiz = false;
    findUniqueCourseMock.mockResolvedValue(course);
    findManyTestResultMock.mockResolvedValue([]);

    const { course: result } = await callGet();
    const block = findVideoBlock(result);

    expect(block.videoUrl).toBe("https://youtube.com/watch?v=solution");
  });

  it("boshqa testni topshirgan bo'lish yetarli emas — faqat shu darsning testi hisoblanadi", async () => {
    findManyTestResultMock.mockResolvedValue([{ testId: "boshqa-test-id" }]);

    const { course } = await callGet();
    const block = findVideoBlock(course);

    expect(block.videoUrl).toBeNull();
  });
});
