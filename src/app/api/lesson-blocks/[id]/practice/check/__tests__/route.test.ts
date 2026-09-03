import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `@/lib/lesson-access`ni mock qilamiz (kirish tekshiruvi alohida
 * `lesson-access.test.ts`da sinaladi) — bu yerda faqat marshrutning o'zi:
 * to'g'ri baholash (gradeSubmission — HAQIQIY, mock emas), MATCHING/
 * FILL_BLANK to'g'ri ishlashi va TestResult HECH QACHON yaratilmasligi.
 */
const {
  loadPracticeBlockAccessMock,
  findUniqueSessionMock,
  findManyItemMock,
  requireAuthMock,
} = vi.hoisted(() => ({
  loadPracticeBlockAccessMock: vi.fn(),
  findUniqueSessionMock: vi.fn(),
  findManyItemMock: vi.fn(),
  requireAuthMock: vi.fn(),
}));

vi.mock("@/lib/lesson-access", () => ({
  loadPracticeBlockAccess: (...args: unknown[]) => loadPracticeBlockAccessMock(...args),
}));

vi.mock("@/lib/db", () => ({
  db: {
    testSession: { findUnique: (...args: unknown[]) => findUniqueSessionMock(...args) },
    item: { findMany: (...args: unknown[]) => findManyItemMock(...args) },
    // TestResult'ga hech qanday chaqiruv YO'Q — atayin mock qilinmagan, aks
    // holda kod tasodifan shu yerga murojaat qilsa test "is not a function"
    // bilan yiqiladi (bu ATAYLAB shunday — TestResult yaratilishi mumkin emas).
  },
}));

vi.mock("@/lib/api-auth", () => ({
  requireAuth: () => requireAuthMock(),
}));

import { POST } from "../route";
import { shuffleArray } from "@/lib/shuffle";
import { encodeMatchingAnswer, shuffleMatchingIndexOrder } from "@/lib/matching";
import { encodeFillBlankAnswer, encodeFillBlankCorrectAnswer } from "@/lib/fill-blank";

const LABELS = ["A", "B", "C", "D", "E"];
const SEED = 12345;

function buildAccess(itemIds: string[] = ["item1"]) {
  return { ok: true as const, block: { id: "block1", labelUz: "Mashq", itemIds } };
}

function buildSession(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "session1",
    userId: "user1",
    itemIds: ["item1"],
    seed: SEED,
    spec: { onlyItemIds: ["item1"] },
    ...overrides,
  };
}

async function callCheck(body: unknown) {
  const request = new Request("http://localhost/api/lesson-blocks/block1/practice/check", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const response = await POST(request as any, { params: Promise.resolve({ id: "block1" }) });
  return { status: response.status, data: await response.json() };
}

describe("POST /api/lesson-blocks/[id]/practice/check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockReturnValue({ user: { id: "user1", role: "USER" }, error: null });
  });

  it("blokka kirish rad etilsa xatoni to'g'ridan-to'g'ri qaytaradi", async () => {
    loadPracticeBlockAccessMock.mockResolvedValue({ ok: false, status: 403, error: "Siz bu kursga yozilmagansiz" });
    const { status } = await callCheck({ sessionId: "s1", questionId: "item1", answer: "A" });
    expect(status).toBe(403);
  });

  it("boshqa foydalanuvchining sessiyasi bilan 404 qaytaradi", async () => {
    loadPracticeBlockAccessMock.mockResolvedValue(buildAccess());
    findUniqueSessionMock.mockResolvedValue(buildSession({ userId: "someone-else" }));
    const { status } = await callCheck({ sessionId: "session1", questionId: "item1", answer: "A" });
    expect(status).toBe(404);
  });

  it("sessiya boshqa blokka tegishli bo'lsa (itemIds mos kelmasa) 403 qaytaradi", async () => {
    loadPracticeBlockAccessMock.mockResolvedValue(buildAccess(["item-from-this-block"]));
    findUniqueSessionMock.mockResolvedValue(buildSession({ itemIds: ["item-from-another-block"] }));
    const { status } = await callCheck({ sessionId: "session1", questionId: "item-from-another-block", answer: "A" });
    expect(status).toBe(403);
  });

  it("to'g'ri MULTIPLE_CHOICE javobini to'g'ri baholaydi (TestResult yaratmasdan)", async () => {
    loadPracticeBlockAccessMock.mockResolvedValue(buildAccess());
    findUniqueSessionMock.mockResolvedValue(buildSession());
    findManyItemMock.mockResolvedValue([{
      id: "item1",
      text: "2+2=?",
      images: [],
      options: [
        { label: "A", text: "3", image: null },
        { label: "B", text: "4", image: null },
        { label: "C", text: "5", image: null },
      ],
      correctAnswer: "B",
      type: "MULTIPLE_CHOICE",
      explanation: "2+2 hisoblash",
      explanationImages: [],
      videoUrl: null,
      templateId: null,
      variantSig: null,
      lang: "uz",
      subject: { nameUz: "Matematika", nameRu: "Математика", nameEn: "Math" },
    }]);

    // preserveOrder=true (spec.sections yo'q), shuffleIndex=0 — GET
    // paytida (start/route.ts, toPresentedQuestions) ishlatilgan XUDDI SHU
    // formuladan foydalanamiz.
    const optionSeed = SEED + 0 + 1;
    const shuffled = shuffleArray(
      [{ label: "A", text: "3" }, { label: "B", text: "4" }, { label: "C", text: "5" }],
      optionSeed
    );
    const studentLabel = LABELS[shuffled.findIndex((o: any) => o.text === "4")];

    const { status, data } = await callCheck({ sessionId: "session1", questionId: "item1", answer: studentLabel, timeSpent: 5 });

    expect(status).toBe(200);
    expect(data.isCorrect).toBe(true);
    expect(data.explanation).toBe("2+2 hisoblash");
  });

  it("noto'g'ri javobda isCorrect: false qaytaradi", async () => {
    loadPracticeBlockAccessMock.mockResolvedValue(buildAccess());
    findUniqueSessionMock.mockResolvedValue(buildSession());
    findManyItemMock.mockResolvedValue([{
      id: "item1", text: "2+2=?", images: [],
      options: [{ label: "A", text: "3", image: null }, { label: "B", text: "4", image: null }],
      correctAnswer: "B", type: "MULTIPLE_CHOICE", explanation: null, explanationImages: [],
      videoUrl: null, templateId: null, variantSig: null, lang: "uz",
      subject: { nameUz: "Matematika", nameRu: "Математика", nameEn: "Math" },
    }]);

    const optionSeed = SEED + 0 + 1;
    const shuffled = shuffleArray([{ label: "A", text: "3" }, { label: "B", text: "4" }], optionSeed);
    const wrongLabel = LABELS[shuffled.findIndex((o: any) => o.text === "3")];

    const { data } = await callCheck({ sessionId: "session1", questionId: "item1", answer: wrongLabel });
    expect(data.isCorrect).toBe(false);
  });

  it("MATCHING savolini to'g'ri baholaydi", async () => {
    loadPracticeBlockAccessMock.mockResolvedValue(buildAccess());
    findUniqueSessionMock.mockResolvedValue(buildSession());
    findManyItemMock.mockResolvedValue([{
      id: "item1", text: "Mosla", images: [],
      options: { left: ["Suv", "Olov"], right: ["H2O", "Yonish"] },
      correctAnswer: "", type: "MATCHING", explanation: null, explanationImages: [],
      videoUrl: null, templateId: null, variantSig: null, lang: "uz",
      subject: { nameUz: "Kimyo", nameRu: "Химия", nameEn: "Chemistry" },
    }]);

    const optionSeed = SEED + 0 + 1;
    const indexOrder = shuffleMatchingIndexOrder(2, optionSeed);
    const correctShuffledAnswer = [indexOrder.indexOf(0), indexOrder.indexOf(1)];

    const { data } = await callCheck({
      sessionId: "session1", questionId: "item1", answer: encodeMatchingAnswer(correctShuffledAnswer),
    });
    expect(data.isCorrect).toBe(true);
  });

  it("FILL_BLANK savolini to'g'ri baholaydi", async () => {
    loadPracticeBlockAccessMock.mockResolvedValue(buildAccess());
    findUniqueSessionMock.mockResolvedValue(buildSession());
    findManyItemMock.mockResolvedValue([{
      id: "item1", text: "2+2=___", images: [], options: [],
      correctAnswer: encodeFillBlankCorrectAnswer([["4", "to'rt"]]),
      type: "FILL_BLANK", explanation: null, explanationImages: [],
      videoUrl: null, templateId: null, variantSig: null, lang: "uz",
      subject: { nameUz: "Matematika", nameRu: "Математика", nameEn: "Math" },
    }]);

    const { data } = await callCheck({
      sessionId: "session1", questionId: "item1", answer: encodeFillBlankAnswer(["4"]),
    });
    expect(data.isCorrect).toBe(true);
  });

  it("sessionId yoki questionId berilmasa 400 qaytaradi", async () => {
    loadPracticeBlockAccessMock.mockResolvedValue(buildAccess());
    const { status } = await callCheck({ answer: "A" });
    expect(status).toBe(400);
    expect(findUniqueSessionMock).not.toHaveBeenCalled();
  });
});
