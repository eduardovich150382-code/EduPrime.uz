import { describe, expect, it } from "vitest";
import { applyDefaultTopic } from "../default-topic";

describe("applyDefaultTopic — bo'sh mavzu to'ladi", () => {
  it("bo'sh satrli mavzu to'ladi", () => {
    const result = applyDefaultTopic([{ topic: "" }], "Kvadrat tenglama");
    expect(result[0].topic).toBe("Kvadrat tenglama");
  });

  it("`null` mavzu ham to'ladi", () => {
    // `Question.topic` sxemada `String?` — bazadan kelgan savolda `null` bo'ladi.
    const result = applyDefaultTopic([{ topic: null }], "Kvadrat tenglama");
    expect(result[0].topic).toBe("Kvadrat tenglama");
  });

  it("`undefined` mavzu ham to'ladi", () => {
    const result = applyDefaultTopic([{ topic: undefined as unknown as string }], "Mavzu");
    expect(result[0].topic).toBe("Mavzu");
  });

  it("faqat bo'shliqdan iborat mavzu bo'sh hisoblanadi", () => {
    const result = applyDefaultTopic([{ topic: "   " }], "Mavzu");
    expect(result[0].topic).toBe("Mavzu");
  });

  it("standart qiymatning atrofidagi bo'shliq kesiladi", () => {
    const result = applyDefaultTopic([{ topic: "" }], "  Mavzu  ");
    expect(result[0].topic).toBe("Mavzu");
  });
});

describe("applyDefaultTopic — mavjud mavzu O'ZGARMAYDI", () => {
  it("qo'lda kiritilgan mavzu ustidan yozilmaydi", () => {
    const result = applyDefaultTopic([{ topic: "Trigonometriya" }], "Kvadrat tenglama");
    expect(result[0].topic).toBe("Trigonometriya");
  });

  it("AI/JSON aniqlagan mavzu ustidan yozilmaydi, bo'shlari esa to'ladi", () => {
    const questions = [{ topic: "AI mavzusi" }, { topic: "" }, { topic: null }];
    const result = applyDefaultTopic(questions, "Standart");
    expect(result.map((q) => q.topic)).toEqual(["AI mavzusi", "Standart", "Standart"]);
  });

  it("boshqa maydonlar tegilmaydi", () => {
    const result = applyDefaultTopic([{ topic: "", text: "savol", id: "q1" }], "Mavzu");
    expect(result[0]).toEqual({ topic: "Mavzu", text: "savol", id: "q1" });
  });
});

describe("applyDefaultTopic — havola ayniyati", () => {
  it("standart qiymat bo'sh bo'lsa AYNAN o'sha massiv qaytadi", () => {
    // #175: obyekt nusxalansa `id` yo'qolishi mumkin, u holda keyingi saqlashda
    // savol o'chirilib qaytadan yaratiladi va `TestResult.answers` uziladi.
    const questions = [{ topic: "" }];
    for (const blank of ["", "   ", null, undefined]) {
      expect(applyDefaultTopic(questions, blank)).toBe(questions);
    }
  });

  it("hech bir savol o'zgarmasa ham AYNAN o'sha massiv qaytadi", () => {
    const questions = [{ topic: "Bor" }, { topic: "Yana bor" }];
    expect(applyDefaultTopic(questions, "Standart")).toBe(questions);
  });

  it("o'zgarmagan savollar AYNAN o'sha obyektlar bo'lib qoladi", () => {
    const kept = { id: "q1", topic: "Bor" };
    const blank = { id: "q2", topic: "" };
    const result = applyDefaultTopic([kept, blank], "Standart");
    expect(result[0]).toBe(kept);
    expect(result[1]).not.toBe(blank);
    expect(result[1].id).toBe("q2");
  });

  it("kirish massivi mutatsiya qilinmaydi", () => {
    const questions = [{ topic: "" }];
    applyDefaultTopic(questions, "Mavzu");
    expect(questions[0].topic).toBe("");
  });
});
