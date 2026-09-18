import { describe, expect, it } from "vitest";
import { applyServerQuestionIds } from "@/lib/question-form";

interface Q {
  id?: string;
  text: string;
}

describe("applyServerQuestionIds", () => {
  it("ID larni `order` bo'yicha moslashtiradi, holat indeksi bo'yicha emas", () => {
    // Holatda 3 savol, o'rtadagisi yaroqsiz — serverga faqat 0 va 2 ketgan
    const questions: Q[] = [{ text: "a" }, { text: "" }, { text: "c" }];
    const sent = [0, 2];
    const result = applyServerQuestionIds(questions, sent, [
      { id: "q-a", order: 0 },
      { id: "q-c", order: 1 },
    ]);

    expect(result.map((q) => q.id)).toEqual(["q-a", undefined, "q-c"]);
    expect(result.map((q) => q.text)).toEqual(["a", "", "c"]);
  });

  it("server javobi tartibsiz kelsa ham to'g'ri joylashtiradi", () => {
    const questions: Q[] = [{ text: "a" }, { text: "b" }, { text: "c" }];
    const result = applyServerQuestionIds(questions, [0, 1, 2], [
      { id: "q-c", order: 2 },
      { id: "q-a", order: 0 },
      { id: "q-b", order: 1 },
    ]);

    expect(result.map((q) => q.id)).toEqual(["q-a", "q-b", "q-c"]);
  });

  it("dublikat tashlab yuborilganda qolgan savollar to'g'ri ID oladi", () => {
    // Holat: [a, a-dublikat, b]; serverga dublikatsiz [a, b] ketgan
    const questions: Q[] = [{ text: "a" }, { text: "a" }, { text: "b" }];
    const result = applyServerQuestionIds(questions, [0, 2], [
      { id: "q-a", order: 0 },
      { id: "q-b", order: 1 },
    ]);

    expect(result.map((q) => q.id)).toEqual(["q-a", undefined, "q-b"]);
  });

  it("mavjud ID ni o'zgartirmaydi va o'sha obyektni qaytaradi (qayta render bo'lmasin)", () => {
    const questions: Q[] = [{ id: "q-a", text: "a" }];
    const result = applyServerQuestionIds(questions, [0], [{ id: "q-a", order: 0 }]);

    expect(result[0]).toBe(questions[0]);
  });

  it("server ID qaytarmasa holat o'zgarmaydi", () => {
    const questions: Q[] = [{ text: "a" }];
    expect(applyServerQuestionIds(questions, [0], [])).toBe(questions);
  });

  it("buzilgan javob yozuvlarini e'tiborsiz qoldiradi", () => {
    const questions: Q[] = [{ text: "a" }, { text: "b" }];
    const result = applyServerQuestionIds(questions, [0, 1], [
      { id: "q-a", order: 0 },
      // `order` yo'q/yaroqsiz — tashlab yuboriladi, `id` esa taxmin qilinmaydi
      { id: "q-b", order: undefined as unknown as number },
    ]);

    expect(result.map((q) => q.id)).toEqual(["q-a", undefined]);
  });

  it("serverdan holatda yo'q `order` kelsa yiqilmaydi", () => {
    const questions: Q[] = [{ text: "a" }];
    const result = applyServerQuestionIds(questions, [0], [
      { id: "q-a", order: 0 },
      { id: "q-x", order: 5 },
    ]);

    expect(result.map((q) => q.id)).toEqual(["q-a"]);
  });
});
