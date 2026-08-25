import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `db` va `auth`ni mock qilamiz — real baza va sessiya kerak emas.
 * `learn/__tests__/route.test.ts` bilan bir xil naqsh: `vi.hoisted` orqali
 * mocklar faylning eng boshiga ko'chiriladi, shu sababli quyidagi `../route`
 * importi baribir shu mock'langan `db`/`auth` bilan ishlaydi.
 */
const {
  findUniqueCourseMock,
  aggregateReviewMock,
  findUniqueEnrollmentMock,
  findManyTestResultMock,
  authMock,
} = vi.hoisted(() => ({
  findUniqueCourseMock: vi.fn(),
  aggregateReviewMock: vi.fn(),
  findUniqueEnrollmentMock: vi.fn(),
  findManyTestResultMock: vi.fn(),
  authMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    course: { findUnique: (...args: unknown[]) => findUniqueCourseMock(...args) },
    courseReview: { aggregate: (...args: unknown[]) => aggregateReviewMock(...args) },
    courseEnrollment: { findUnique: (...args: unknown[]) => findUniqueEnrollmentMock(...args) },
    testResult: { findMany: (...args: unknown[]) => findManyTestResultMock(...args) },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: () => authMock(),
}));

import { GET } from "../route";

// Bitta ochiq (isPreviewable) dars — QUIZ blok (test-quiz-1) + revealAfterQuiz=true
// bo'lgan VIDEO_SOLUTION blok. `learn/__tests__/route.test.ts`dagi fixture bilan
// bir xil g'oya, lekin `isPreviewable` maydoni bilan.
function buildCourse() {
  return {
    id: "course1",
    titleUz: "Test kursi",
    description: "Tavsif",
    coverImage: null,
    trailerVideoUrl: null,
    whatYoullLearn: null,
    prerequisites: null,
    isPublished: true,
    isFree: true,
    accessType: "FREE",
    price: null,
    difficulty: "BEGINNER",
    estimatedHours: 1,
    teacherId: "teacher1",
    subject: { nameUz: "Matematika", nameRu: null, nameEn: null, icon: null },
    teacher: { userId: "teacher1", user: { name: "Ustoz" } },
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
            isPreviewable: true,
            videoUrl: "https://youtube.com/watch?v=main",
            content: null,
            testId: null,
            fileUrl: null,
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
  const request = new Request("http://localhost/api/courses/course1");
  const response = await GET(request as never, { params: Promise.resolve({ id: "course1" }) });
  return response.json() as Promise<{ course: any }>;
}

function findVideoBlock(course: any) {
  return course.sections[0].lessons[0].blocks.find((b: any) => b.id === "block-video");
}

describe("GET /api/courses/[id] — revealAfterQuiz gating (preview endpoint)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUniqueCourseMock.mockResolvedValue(buildCourse());
    aggregateReviewMock.mockResolvedValue({ _avg: { rating: null }, _count: 0 });
  });

  it("autentifikatsiyasiz (foydalanuvchi yo'q) videoUrl: null qaytaradi", async () => {
    authMock.mockResolvedValue(null);

    const { course } = await callGet();
    const block = findVideoBlock(course);

    expect(block.videoUrl).toBeNull();
    // Gating uchun TestResult so'ralmadi — foydalanuvchi umuman yo'q.
    expect(findManyTestResultMock).not.toHaveBeenCalled();
  });

  it("QUIZ blokini topshirgan foydalanuvchiga videoUrl'ni ko'rsatadi", async () => {
    authMock.mockResolvedValue({ user: { id: "user1" } });
    findUniqueEnrollmentMock.mockResolvedValue({ id: "enr1" });
    findManyTestResultMock.mockResolvedValue([{ testId: "test-quiz-1" }]);

    const { course } = await callGet();
    const block = findVideoBlock(course);

    expect(block.videoUrl).toBe("https://youtube.com/watch?v=solution");
  });
});
