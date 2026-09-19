import { describe, expect, it } from "vitest";
import { mapQuestionForBank } from "../question-form";
import type { QuestionCoreFields } from "@/types";

function question(overrides: Partial<QuestionCoreFields> = {}): QuestionCoreFields {
  return {
    text: "2 + 2 = ?",
    images: [],
    options: [{ label: "A", text: "4", image: null }],
    correctAnswer: "A",
    explanation: "",
    explanationImages: [],
    type: "MULTIPLE_CHOICE",
    topic: "",
    bloomLevel: "",
    difficulty: null,
    blankAnswers: [""],
    matchingPairs: [{ left: "", right: "" }],
    ...overrides,
  };
}

describe("mapQuestionForBank — Bloom ustunga tegilmaydi", () => {
  it("`bloomLevel` o'zgarishsiz yuboriladi", () => {
    // Bloom ustoz ekranidan olib tashlangan, lekin savollar bazasiga
    // saqlashda ham ustun to'ldirilishi davom etadi.
    expect(mapQuestionForBank(question({ bloomLevel: "QOLLASH" }), "s1").bloomLevel).toBe("QOLLASH");
  });

  it("ustoz tegmagan qiyinlik asl qiymatida ketadi", () => {
    expect(mapQuestionForBank(question({ difficulty: 5 }), "s1").difficulty).toBe(5);
  });
});
