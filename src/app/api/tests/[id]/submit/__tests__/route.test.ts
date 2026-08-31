import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `db` va `auth`ni mock qilamiz — real baza va sessiya kerak emas. Naqsh
 * `sessions/[id]/submit/__tests__/route.test.ts` bilan bir xil.
 */
const { findUniqueTestMock, createResultMock, authMock } = vi.hoisted(() => ({
  findUniqueTestMock: vi.fn(),
  createResultMock: vi.fn(),
  authMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    test: { findUnique: (...args: unknown[]) => findUniqueTestMock(...args) },
    testResult: { create: (...args: unknown[]) => createResultMock(...args) },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: () => authMock(),
}));

import { POST } from "../route";
import { generateSeed, shuffleArray } from "@/lib/shuffle";

const LABELS = ["A", "B", "C", "D", "E"];
// Backfill'da gen_random_uuid()::text bilan yaratilgan Item id'lar aynan
// shunday 36 belgili UUID formatida — cuid (25 belgi) bilan sinalsa bu
// regressiya bilinmay qoladi (CLAUDE.md: id 30 belgida kesilgan edi).
const UUID_QUESTION_ID = "3f9a1c2e-7b44-4d5a-9e21-6f0c8a2b5d17";

function buildTest(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "test1",
    isFree: true,
    accessType: "free",
    courseLessons: [] as unknown[],
    questions: [
      {
        id: UUID_QUESTION_ID,
        text: "2+2=?",
        correctAnswer: "B",
        points: 1,
        type: "MULTIPLE_CHOICE",
        options: [
          { label: "A", text: "3", image: null },
          { label: "B", text: "4", image: null },
          { label: "C", text: "5", image: null },
          { label: "D", text: "6", image: null },
        ],
        subjectId: null,
      },
    ],
    ...overrides,
  };
}

async function callSubmit(body: unknown) {
  const request = new Request("http://localhost/api/tests/test1/submit", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const response = await POST(request as any, { params: Promise.resolve({ id: "test1" }) });
  return { status: response.status, data: await response.json() };
}

describe("POST /api/tests/[id]/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockReturnValue({ user: { id: "user1" } });
  });

  it("36 belgili UUID questionId kesilmasdan saqlanadi va to'g'ri baholanadi", async () => {
    const test = buildTest();
    findUniqueTestMock.mockResolvedValue(test);
    createResultMock.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: "result1", ...data })
    );

    const baseSeed = generateSeed("user1", "test1");
    const optionSeed = baseSeed + 0 + 1;
    const shuffled = shuffleArray(test.questions[0].options as any[], optionSeed);
    const studentPickedLabel = LABELS[shuffled.findIndex((o: any) => o.text === "4")];

    const { status, data } = await callSubmit({
      answers: [{ questionId: UUID_QUESTION_ID, answer: studentPickedLabel, timeSpent: 7 }],
      timeSpent: 10,
    });

    expect(status).toBe(200);
    // Kesilgan id grading.ts'dagi `answers.find(a => a.questionId === question.id)`
    // bilan mos kelmay qolsa — bo'sh javob va timeSpent:0 qaytadi.
    expect(data.result.answers[0].answer).not.toBe("");
    expect(data.result.answers[0].isCorrect).toBe(true);
    expect(data.result.answers[0].timeSpent).toBe(7);
    expect(data.result.score).toBe(1);
  });
});
