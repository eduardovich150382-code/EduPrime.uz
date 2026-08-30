import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `checkOpenEndedEquivalence` Gemini'ga haqiqiy so'rov yuboradi — mock
 * qilinadi, aks holda test tarmoqqa bog'liq bo'lib qoladi. `vi.hoisted`
 * naqsh boshqa `__tests__` fayllarida ham ishlatilgan (masalan
 * `courses/[id]/learn/__tests__/route.test.ts`).
 */
const { checkOpenEndedEquivalenceMock } = vi.hoisted(() => ({
  checkOpenEndedEquivalenceMock: vi.fn(),
}));

vi.mock("../gemini", () => ({
  checkOpenEndedEquivalence: (...args: unknown[]) => checkOpenEndedEquivalenceMock(...args),
}));

import { gradeSubmission, type GradableQuestion } from "../grading";
import { generateSeed, shuffleArray } from "../shuffle";
import { shuffleMatchingIndexOrder, encodeMatchingAnswer } from "../matching";

const BASE_SEED = generateSeed("user1", "test1");
const LABELS = ["A", "B", "C", "D", "E"];

/**
 * grading.ts (submit) o'zi shuffledOptions'ni qayta relabel qilmaydi (faqat
 * shuffleTest — GET marshruti — buni qiladi). Talaba yuboradigan "A/B/C/D"
 * aslida POZITSIYA indeksi (labels.indexOf orqali) — shuning uchun testda
 * ham "matnga mos kelgan variant qaysi POZITSIYADA turibdi" topilib, o'sha
 * pozitsiyaga mos label (labels[index]) yuboriladi — .label maydoni EMAS.
 */
function labelAtShuffledPosition(options: { text: string }[], optionSeed: number, text: string): string {
  const shuffled = shuffleArray(options, optionSeed);
  return LABELS[shuffled.findIndex((o) => o.text === text)];
}

function mcQuestion(overrides: Partial<GradableQuestion> = {}): GradableQuestion {
  return {
    id: "q1",
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
    ...overrides,
  };
}

describe("gradeSubmission — MULTIPLE_CHOICE", () => {
  beforeEach(() => vi.clearAllMocks());

  it("aralashtirilgan variantlar orasida to'g'ri javobni to'g'ri baholaydi", async () => {
    const question = mcQuestion();
    // GET marshrutida ko'rsatiladigan aralashtirilgan variantlarni qayta
    // hosil qilamiz — talaba shundan "to'g'ri" (4 ga mos) labelni tanlaydi.
    const optionSeed = BASE_SEED + 0 + 1; // shuffleIndex=0 (yagona savol)
    const studentPickedLabel = labelAtShuffledPosition(question.options as any[], optionSeed, "4");

    const { answerResults, score, maxScore, percentage } = await gradeSubmission({
      questions: [question],
      answers: [{ questionId: "q1", answer: studentPickedLabel, timeSpent: 5 }],
      baseSeed: BASE_SEED,
      preserveOrder: false,
    });

    expect(answerResults[0].isCorrect).toBe(true);
    expect(answerResults[0].answer).toBe("B"); // original (unshuffled) label saqlanadi
    expect(score).toBe(1);
    expect(maxScore).toBe(1);
    expect(percentage).toBe(100);
  });

  it("noto'g'ri variant noto'g'ri deb baholanadi", async () => {
    const question = mcQuestion();
    const optionSeed = BASE_SEED + 0 + 1;
    const correctLabel = labelAtShuffledPosition(question.options as any[], optionSeed, "4");
    const wrongLabel = LABELS.find((l) => l !== correctLabel)!;

    const { answerResults, score } = await gradeSubmission({
      questions: [question],
      answers: [{ questionId: "q1", answer: wrongLabel, timeSpent: 0 }],
      baseSeed: BASE_SEED,
      preserveOrder: false,
    });
    expect(score).toBe(0);
    expect(answerResults[0].isCorrect).toBe(false);
  });

  it("javob berilmagan savol noto'g'ri va bo'sh javob bilan qaytadi", async () => {
    const question = mcQuestion();
    const { answerResults, score } = await gradeSubmission({
      questions: [question],
      answers: [],
      baseSeed: BASE_SEED,
      preserveOrder: false,
    });
    expect(answerResults[0].isCorrect).toBe(false);
    expect(answerResults[0].answer).toBe("");
    expect(score).toBe(0);
  });
});

describe("gradeSubmission — MULTI_SELECT", () => {
  beforeEach(() => vi.clearAllMocks());

  it("to'liq to'g'ri to'plam tanlansa to'g'ri deb hisoblanadi (tartib muhim emas)", async () => {
    const question: GradableQuestion = {
      id: "q1",
      text: "Tub sonlarni tanlang",
      correctAnswer: "A,C",
      points: 2,
      type: "MULTI_SELECT",
      options: [
        { label: "A", text: "2", image: null },
        { label: "B", text: "4", image: null },
        { label: "C", text: "3", image: null },
        { label: "D", text: "6", image: null },
      ],
    };
    const optionSeed = BASE_SEED + 0 + 1;
    const label2 = labelAtShuffledPosition(question.options as any[], optionSeed, "2");
    const label3 = labelAtShuffledPosition(question.options as any[], optionSeed, "3");

    const { answerResults, score } = await gradeSubmission({
      questions: [question],
      answers: [{ questionId: "q1", answer: [label3, label2].join(","), timeSpent: 0 }],
      baseSeed: BASE_SEED,
      preserveOrder: false,
    });

    expect(answerResults[0].isCorrect).toBe(true);
    expect(score).toBe(2);
  });

  it("qisman to'g'ri to'plam noto'g'ri deb hisoblanadi", async () => {
    const question: GradableQuestion = {
      id: "q1",
      text: "Tub sonlarni tanlang",
      correctAnswer: "A,C",
      points: 2,
      type: "MULTI_SELECT",
      options: [
        { label: "A", text: "2", image: null },
        { label: "B", text: "4", image: null },
        { label: "C", text: "3", image: null },
        { label: "D", text: "6", image: null },
      ],
    };
    const optionSeed = BASE_SEED + 0 + 1;
    const label2 = labelAtShuffledPosition(question.options as any[], optionSeed, "2");

    const { answerResults, score } = await gradeSubmission({
      questions: [question],
      answers: [{ questionId: "q1", answer: label2, timeSpent: 0 }],
      baseSeed: BASE_SEED,
      preserveOrder: false,
    });

    expect(answerResults[0].isCorrect).toBe(false);
    expect(score).toBe(0);
  });
});

describe("gradeSubmission — MATCHING", () => {
  beforeEach(() => vi.clearAllMocks());

  it("hamma juftlikni to'g'ri moslasa to'g'ri deb baholaydi", async () => {
    const question: GradableQuestion = {
      id: "q1",
      text: "Mosla",
      correctAnswer: "",
      points: 1,
      type: "MATCHING",
      options: { left: ["Suv", "Olov"], right: ["H2O", "Yonish"] },
    };
    const shuffleIndex = 0;
    const optionSeed = BASE_SEED + shuffleIndex + 1;
    const indexOrder = shuffleMatchingIndexOrder(2, optionSeed);
    // Talaba i-chap uchun shuffledPos = indexOrder.indexOf(i) ni tanlaydi — bu to'g'ri javob.
    const studentShuffledAnswer = [indexOrder.indexOf(0), indexOrder.indexOf(1)];

    const { answerResults, score } = await gradeSubmission({
      questions: [question],
      answers: [{ questionId: "q1", answer: encodeMatchingAnswer(studentShuffledAnswer), timeSpent: 0 }],
      baseSeed: BASE_SEED,
      preserveOrder: false,
    });

    expect(answerResults[0].isCorrect).toBe(true);
    expect(score).toBe(1);
  });

  it("bitta juftlik noto'g'ri bo'lsa savol noto'g'ri deb baholanadi", async () => {
    const question: GradableQuestion = {
      id: "q1",
      text: "Mosla",
      correctAnswer: "",
      points: 1,
      type: "MATCHING",
      options: { left: ["Suv", "Olov"], right: ["H2O", "Yonish"] },
    };
    const optionSeed = BASE_SEED + 0 + 1;
    const indexOrder = shuffleMatchingIndexOrder(2, optionSeed);
    const wrongShuffledAnswer = [indexOrder.indexOf(1), indexOrder.indexOf(0)]; // almashtirilgan

    const { answerResults, score } = await gradeSubmission({
      questions: [question],
      answers: [{ questionId: "q1", answer: encodeMatchingAnswer(wrongShuffledAnswer), timeSpent: 0 }],
      baseSeed: BASE_SEED,
      preserveOrder: false,
    });

    expect(answerResults[0].isCorrect).toBe(false);
    expect(score).toBe(0);
  });
});

describe("gradeSubmission — FILL_BLANK", () => {
  beforeEach(() => vi.clearAllMocks());

  it("aniq mos kelgan javobni AI'ga murojaat qilmasdan to'g'ri deb baholaydi", async () => {
    const question: GradableQuestion = {
      id: "q1",
      text: "Poytaxt ___",
      correctAnswer: JSON.stringify([["Toshkent", "Tashkent"]]),
      points: 1,
      type: "FILL_BLANK",
      options: [],
    };
    const { answerResults, score } = await gradeSubmission({
      questions: [question],
      answers: [{ questionId: "q1", answer: JSON.stringify(["toshkent"]), timeSpent: 0 }],
      baseSeed: BASE_SEED,
      preserveOrder: false,
    });

    expect(answerResults[0].isCorrect).toBe(true);
    expect(score).toBe(1);
    expect(checkOpenEndedEquivalenceMock).not.toHaveBeenCalled();
  });

  it("aniq mos kelmasa AI ekvivalentlik tekshiruviga murojaat qiladi va TRUE bo'lsa to'g'rilaydi", async () => {
    checkOpenEndedEquivalenceMock.mockResolvedValue(true);
    const question: GradableQuestion = {
      id: "q1",
      text: "Poytaxt ___",
      correctAnswer: JSON.stringify([["Toshkent"]]),
      points: 1,
      type: "FILL_BLANK",
      options: [],
    };
    const { answerResults, score } = await gradeSubmission({
      questions: [question],
      answers: [{ questionId: "q1", answer: JSON.stringify(["Toshkent shahri"]), timeSpent: 0 }],
      baseSeed: BASE_SEED,
      preserveOrder: false,
    });

    expect(checkOpenEndedEquivalenceMock).toHaveBeenCalledTimes(1);
    expect(answerResults[0].isCorrect).toBe(true);
    expect(score).toBe(1);
  });

  it("AI FALSE qaytarsa noto'g'ri bo'lib qoladi", async () => {
    checkOpenEndedEquivalenceMock.mockResolvedValue(false);
    const question: GradableQuestion = {
      id: "q1",
      text: "Poytaxt ___",
      correctAnswer: JSON.stringify([["Toshkent"]]),
      points: 1,
      type: "FILL_BLANK",
      options: [],
    };
    const { answerResults, score } = await gradeSubmission({
      questions: [question],
      answers: [{ questionId: "q1", answer: JSON.stringify(["Samarqand"]), timeSpent: 0 }],
      baseSeed: BASE_SEED,
      preserveOrder: false,
    });

    expect(answerResults[0].isCorrect).toBe(false);
    expect(score).toBe(0);
  });
});

describe("gradeSubmission — OPEN_ENDED", () => {
  beforeEach(() => vi.clearAllMocks());

  it("katta-kichik harf va probel farqi bilan aniq mos kelsa AI'siz to'g'ri deb baholaydi", async () => {
    const question: GradableQuestion = {
      id: "q1",
      text: "1+1 nechaga teng?",
      correctAnswer: "Ikki",
      points: 1,
      type: "OPEN_ENDED",
      options: [],
    };
    const { answerResults } = await gradeSubmission({
      questions: [question],
      answers: [{ questionId: "q1", answer: "  ikki  ", timeSpent: 0 }],
      baseSeed: BASE_SEED,
      preserveOrder: false,
    });

    expect(answerResults[0].isCorrect).toBe(true);
    expect(checkOpenEndedEquivalenceMock).not.toHaveBeenCalled();
  });

  it("aniq mos kelmasa AI ekvivalentlikka murojaat qiladi", async () => {
    checkOpenEndedEquivalenceMock.mockResolvedValue(true);
    const question: GradableQuestion = {
      id: "q1",
      text: "1/2 nechaga teng?",
      correctAnswer: "0.5",
      points: 1,
      type: "OPEN_ENDED",
      options: [],
    };
    const { answerResults } = await gradeSubmission({
      questions: [question],
      answers: [{ questionId: "q1", answer: "0,5", timeSpent: 0 }],
      baseSeed: BASE_SEED,
      preserveOrder: false,
    });

    expect(checkOpenEndedEquivalenceMock).toHaveBeenCalledWith("1/2 nechaga teng?", "0.5", "0,5");
    expect(answerResults[0].isCorrect).toBe(true);
  });
});

describe("gradeSubmission — preserveOrder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("preserveOrder=true bo'lganda savol tartibi aralashtirilmaydi (shuffleIndex = DB tartibi)", async () => {
    const q1 = mcQuestion({ id: "q1" });
    const q2 = mcQuestion({ id: "q2", correctAnswer: "A" });

    // preserveOrder=true bo'lsa shuffledQuestions === [q1, q2] (DB tartibida),
    // ya'ni q1 shuffleIndex=0, q2 shuffleIndex=1 — optionSeed shunga qarab hisoblanadi.
    const optionSeedQ2 = BASE_SEED + 1 + 1;
    const studentPickedLabel = labelAtShuffledPosition(q2.options as any[], optionSeedQ2, "3");

    const { answerResults } = await gradeSubmission({
      questions: [q1, q2],
      answers: [{ questionId: "q2", answer: studentPickedLabel, timeSpent: 0 }],
      baseSeed: BASE_SEED,
      preserveOrder: true,
    });

    expect(answerResults[1].isCorrect).toBe(true);
  });
});
