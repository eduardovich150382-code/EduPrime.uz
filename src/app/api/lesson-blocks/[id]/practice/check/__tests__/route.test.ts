import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `@/lib/lesson-access`ni mock qilamiz (kirish tekshiruvi alohida
 * `lesson-access.test.ts`da sinaladi) — bu yerda faqat marshrutning o'zi:
 * to'g'ri baholash (gradeSubmission — HAQIQIY, mock emas), MATCHING/
 * FILL_BLANK to'g'ri ishlashi, TestResult HECH QACHON yaratilmasligi VA
 * S17 paywall (`explanation`) `GET /api/results/[id]`dagi bilan bir xil
 * qulf ostida bo'lishi.
 */
const {
  loadPracticeBlockAccessMock,
  findUniqueSessionMock,
  findManyItemMock,
  requireAuthMock,
  hasActiveSubscriptionMock,
  isSolutionUnlockedMock,
} = vi.hoisted(() => ({
  loadPracticeBlockAccessMock: vi.fn(),
  findUniqueSessionMock: vi.fn(),
  findManyItemMock: vi.fn(),
  requireAuthMock: vi.fn(),
  hasActiveSubscriptionMock: vi.fn(),
  isSolutionUnlockedMock: vi.fn(),
}));

vi.mock("@/lib/lesson-access", () => ({
  loadPracticeBlockAccess: (...args: unknown[]) => loadPracticeBlockAccessMock(...args),
}));

vi.mock("@/lib/db", () => ({
  db: {
    testSession: { findUnique: (...args: unknown[]) => findUniqueSessionMock(...args) },
    item: { findMany: (...args: unknown[]) => findManyItemMock(...args) },
    // TestResult'ga VA Attempt'ga (S27) hech qanday chaqiruv YO'Q — atayin
    // mock qilinmagan, aks holda kod tasodifan shu yerga murojaat qilsa test
    // "is not a function" bilan yiqiladi (bu ATAYLAB shunday — mashq
    // javoblari na TestResult, na Attempt yaratishi mumkin emas, qarang
    // lib/attempts.ts — savol sifati statistikasi faqat "birinchi marta,
    // imtihon sharoitida" javoblardan o'lchanadi).
  },
}));

vi.mock("@/lib/api-auth", () => ({
  requireAuth: () => requireAuthMock(),
}));

vi.mock("@/lib/access", () => ({
  hasActiveSubscription: (...args: unknown[]) => hasActiveSubscriptionMock(...args),
}));

vi.mock("@/lib/quota", () => ({
  isSolutionUnlocked: (...args: unknown[]) => isSolutionUnlockedMock(...args),
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

function buildMcItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
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
    // Standart holat — yechim OCHILMAGAN (S17): obuna yo'q, SolutionUnlock yo'q.
    hasActiveSubscriptionMock.mockResolvedValue({ premium: false, teacher: false });
    isSolutionUnlockedMock.mockResolvedValue(false);
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
    findManyItemMock.mockResolvedValue([buildMcItem()]);

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
  });

  it("noto'g'ri javobda isCorrect: false qaytaradi", async () => {
    loadPracticeBlockAccessMock.mockResolvedValue(buildAccess());
    findUniqueSessionMock.mockResolvedValue(buildSession());
    findManyItemMock.mockResolvedValue([buildMcItem({
      options: [{ label: "A", text: "3", image: null }, { label: "B", text: "4", image: null }],
      explanation: null,
    })]);

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

  describe("S17 paywall — yozma yechim (explanation)", () => {
    it("yechim ochilmagan bo'lsa explanation: null qaytaradi (obuna yo'q, SolutionUnlock yo'q)", async () => {
      loadPracticeBlockAccessMock.mockResolvedValue(buildAccess());
      findUniqueSessionMock.mockResolvedValue(buildSession());
      findManyItemMock.mockResolvedValue([buildMcItem()]);

      const optionSeed = SEED + 0 + 1;
      const shuffled = shuffleArray(
        [{ label: "A", text: "3" }, { label: "B", text: "4" }, { label: "C", text: "5" }],
        optionSeed
      );
      const studentLabel = LABELS[shuffled.findIndex((o: any) => o.text === "4")];

      const { data } = await callCheck({ sessionId: "session1", questionId: "item1", answer: studentLabel });

      expect(data.isCorrect).toBe(true);
      expect(data.explanation).toBeNull();
      expect(data.explanationImages).toEqual([]);
    });

    it("SolutionUnlock orqali ochilgan bo'lsa explanation qaytaradi", async () => {
      loadPracticeBlockAccessMock.mockResolvedValue(buildAccess());
      findUniqueSessionMock.mockResolvedValue(buildSession());
      findManyItemMock.mockResolvedValue([buildMcItem()]);
      isSolutionUnlockedMock.mockResolvedValue(true);

      const optionSeed = SEED + 0 + 1;
      const shuffled = shuffleArray(
        [{ label: "A", text: "3" }, { label: "B", text: "4" }, { label: "C", text: "5" }],
        optionSeed
      );
      const studentLabel = LABELS[shuffled.findIndex((o: any) => o.text === "4")];

      const { data } = await callCheck({ sessionId: "session1", questionId: "item1", answer: studentLabel });

      expect(data.explanation).toBe("2+2 hisoblash");
      expect(isSolutionUnlockedMock).toHaveBeenCalledWith("user1", "item1");
    });

    it("Premium obunachiga explanation cheklovsiz qaytadi", async () => {
      loadPracticeBlockAccessMock.mockResolvedValue(buildAccess());
      findUniqueSessionMock.mockResolvedValue(buildSession());
      findManyItemMock.mockResolvedValue([buildMcItem()]);
      hasActiveSubscriptionMock.mockResolvedValue({ premium: true, teacher: false });

      const optionSeed = SEED + 0 + 1;
      const shuffled = shuffleArray(
        [{ label: "A", text: "3" }, { label: "B", text: "4" }, { label: "C", text: "5" }],
        optionSeed
      );
      const studentLabel = LABELS[shuffled.findIndex((o: any) => o.text === "4")];

      const { data } = await callCheck({ sessionId: "session1", questionId: "item1", answer: studentLabel });

      expect(data.explanation).toBe("2+2 hisoblash");
      expect(isSolutionUnlockedMock).not.toHaveBeenCalled();
    });

    it("ADMIN'ga explanation cheklovsiz qaytadi", async () => {
      requireAuthMock.mockReturnValue({ user: { id: "admin1", role: "ADMIN" }, error: null });
      loadPracticeBlockAccessMock.mockResolvedValue(buildAccess());
      findUniqueSessionMock.mockResolvedValue(buildSession({ userId: "admin1" }));
      findManyItemMock.mockResolvedValue([buildMcItem()]);

      const optionSeed = SEED + 0 + 1;
      const shuffled = shuffleArray(
        [{ label: "A", text: "3" }, { label: "B", text: "4" }, { label: "C", text: "5" }],
        optionSeed
      );
      const studentLabel = LABELS[shuffled.findIndex((o: any) => o.text === "4")];

      const { data } = await callCheck({ sessionId: "session1", questionId: "item1", answer: studentLabel });
      expect(data.explanation).toBe("2+2 hisoblash");
    });
  });

  describe("S20a — bepul distraktor 'why' izohi", () => {
    it("noto'g'ri javobda, yechim ochilmagan bo'lsa ham, parametrik savolning distractorWhy'si qaytadi", async () => {
      loadPracticeBlockAccessMock.mockResolvedValue(buildAccess());
      findUniqueSessionMock.mockResolvedValue(buildSession());
      // Haqiqiy shablon kerak emas — getDistractorWhy shablon topilmasa
      // `null` qaytaradi, shu sababli bu yerda faqat "explanation ochiq
      // emas, lekin distractorWhy null (shablon yo'q)" ekanini tekshiramiz —
      // haqiqiy shablon bilan integratsiya paramgen'ning o'z testlarida bor.
      findManyItemMock.mockResolvedValue([buildMcItem({
        templateId: "no-such-template",
        variantSig: "no-such-variant",
        explanation: null,
      })]);

      const optionSeed = SEED + 0 + 1;
      const shuffled = shuffleArray([{ label: "A", text: "3" }, { label: "B", text: "4" }, { label: "C", text: "5" }], optionSeed);
      const wrongLabel = LABELS[shuffled.findIndex((o: any) => o.text === "3")];

      const { data } = await callCheck({ sessionId: "session1", questionId: "item1", answer: wrongLabel });

      expect(data.isCorrect).toBe(false);
      expect(data.explanation).toBeNull();
      // Shablon topilmagani uchun null — muhimi, marshrut chaqirdi va
      // yiqilmadi (shablon mavjud bo'lganda haqiqiy matn qaytishi paramgen
      // testlarida qamrab olingan).
      expect(data.distractorWhy).toBeNull();
    });

    it("to'g'ri javobda distractorWhy har doim null", async () => {
      loadPracticeBlockAccessMock.mockResolvedValue(buildAccess());
      findUniqueSessionMock.mockResolvedValue(buildSession());
      findManyItemMock.mockResolvedValue([buildMcItem({ templateId: "tpl1", variantSig: "v1", explanation: null })]);

      const optionSeed = SEED + 0 + 1;
      const shuffled = shuffleArray([{ label: "A", text: "3" }, { label: "B", text: "4" }, { label: "C", text: "5" }], optionSeed);
      const studentLabel = LABELS[shuffled.findIndex((o: any) => o.text === "4")];

      const { data } = await callCheck({ sessionId: "session1", questionId: "item1", answer: studentLabel });
      expect(data.isCorrect).toBe(true);
      expect(data.distractorWhy).toBeNull();
    });
  });
});
