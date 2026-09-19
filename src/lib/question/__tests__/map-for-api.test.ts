import { describe, expect, it } from "vitest";
import { mapQuestionForApi, type ApiQuestionInput } from "../map-for-api";

function question(overrides: Partial<ApiQuestionInput> = {}): ApiQuestionInput {
  return {
    text: "2 + 2 = ?",
    images: [],
    options: [
      { label: "A", text: "3", image: null },
      { label: "B", text: "4", image: null },
    ],
    correctAnswer: "B",
    explanation: "",
    explanationImages: [],
    type: "MULTIPLE_CHOICE",
    topic: "",
    bloomLevel: "",
    difficulty: null,
    blankAnswers: [""],
    matchingPairs: [{ left: "", right: "" }],
    videoUrl: "",
    points: 1,
    ...overrides,
  };
}

describe("mapQuestionForApi — baza maydonlari", () => {
  it("`bloomLevel` hamon O'ZGARISHSIZ yuboriladi", () => {
    // Bloom ustoz ekranidan olib tashlangan, LEKIN ustun o'qiladi
    // (`lib/item-picker.ts`) va AI uni jimgina to'ldiradi. Agar mapper uni
    // tushirib qoldirsa, savollar sekin-asta Bloom'siz to'lib boradi.
    expect(mapQuestionForApi(question({ bloomLevel: "TAHLIL" }), 0).bloomLevel).toBe("TAHLIL");
  });

  it("Bloom tanlanmagan bo'lsa `null` ketadi", () => {
    expect(mapQuestionForApi(question({ bloomLevel: "" }), 0).bloomLevel).toBeNull();
  });

  it("ustoz qiyinlikka tegmasa bazadagi ASL qiymat qaytib boradi", () => {
    // Uch pog'onali picker 2/3/4 yozadi, lekin eski savolda 5 turgan bo'lsa
    // va ustoz tugmani bosmasa — 5 bo'lib ketishi kerak.
    expect(mapQuestionForApi(question({ difficulty: 5 }), 0).difficulty).toBe(5);
    expect(mapQuestionForApi(question({ difficulty: 1 }), 0).difficulty).toBe(1);
  });

  it("mavzu bo'sh bo'lsa `null`, bor bo'lsa o'zi", () => {
    expect(mapQuestionForApi(question({ topic: "" }), 0).topic).toBeNull();
    expect(mapQuestionForApi(question({ topic: "Kvadrat tenglama" }), 0).topic).toBe("Kvadrat tenglama");
  });
});

describe("mapQuestionForApi — ID va tartib", () => {
  it("`id` va `order` yuboriladi", () => {
    // Serverdagi update shoxi shu ikkisiga tayanadi: `id` yuborilmasa savol
    // o'chirilib qaytadan yaratiladi va `TestResult.answers` dagi `questionId`
    // bog'lanishi uziladi (#170/#172).
    const mapped = mapQuestionForApi(question({ id: "q1" }), 3);
    expect(mapped.id).toBe("q1");
    expect(mapped.order).toBe(3);
  });

  it("birinchi saqlashdan oldin `id` undefined bo'ladi", () => {
    expect(mapQuestionForApi(question(), 0).id).toBeUndefined();
  });

  it("faqat UI ga tegishli maydonlar yuborilmaydi", () => {
    const mapped = mapQuestionForApi(question(), 0);
    expect(mapped).not.toHaveProperty("aiConfidence");
    expect(mapped).not.toHaveProperty("blankAnswers");
    expect(mapped).not.toHaveProperty("matchingPairs");
  });
});

describe("mapQuestionForApi — savol turlari", () => {
  it("OPEN_ENDED da variantlar bo'sh ketadi", () => {
    expect(mapQuestionForApi(question({ type: "OPEN_ENDED" }), 0).options).toEqual([]);
  });

  it("matnsiz variantlar chetlab o'tiladi", () => {
    const mapped = mapQuestionForApi(
      question({
        options: [
          { label: "A", text: "4", image: null },
          { label: "B", text: "", image: null },
        ],
      }),
      0,
    );
    expect(mapped.options).toHaveLength(1);
  });

  it("MATCHING da correctAnswer bo'sh, options juftliklardan yasaladi", () => {
    const mapped = mapQuestionForApi(
      question({
        type: "MATCHING",
        correctAnswer: "eskirgan",
        matchingPairs: [{ left: "2", right: "ikki" }],
      }),
      0,
    );
    expect(mapped.correctAnswer).toBe("");
    expect(mapped.options).toEqual({ left: ["2"], right: ["ikki"] });
  });
});
