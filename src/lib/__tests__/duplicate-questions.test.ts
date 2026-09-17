import { describe, expect, it } from "vitest";
import {
  dropDuplicateQuestions,
  findDuplicateQuestions,
  normalizeQuestionText,
} from "../duplicate-questions";

describe("normalizeQuestionText", () => {
  it("chetdagi bo'shliqlarni kesadi va ichidagilarni bittaga siqadi", () => {
    expect(normalizeQuestionText("  2 + 2   =  ?  ")).toBe("2 + 2 = ?");
  });

  it("yangi qator, tab va uzilmas probelni oddiy probel deb qaraydi", () => {
    expect(normalizeQuestionText("2\n+\t2\u00a0= ?")).toBe("2 + 2 = ?");
  });

  it("registrni o'zgartirmaydi", () => {
    expect(normalizeQuestionText("Nechta?")).toBe("Nechta?");
  });
});

describe("findDuplicateQuestions", () => {
  it("bir xil matnli ikki savolni bitta guruhga yig'adi", () => {
    const groups = findDuplicateQuestions([
      { text: "2 + 2 = ?" },
      { text: "3 + 3 = ?" },
      { text: "2 + 2 = ?" },
    ]);
    expect(groups).toEqual([{ key: "2 + 2 = ?", indexes: [0, 2] }]);
  });

  it("faqat bo'shliqlari bilan farq qiluvchi matnlarni ham takror deb topadi", () => {
    const groups = findDuplicateQuestions([
      { text: "2 + 2 = ?" },
      { text: "  2\n+  2\u00a0=\t?  " },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].indexes).toEqual([0, 1]);
  });

  it("uchta nusxa uchun bitta guruh va uchta indeks beradi, o'sish tartibida", () => {
    const groups = findDuplicateQuestions([
      { text: "Takror" },
      { text: "Boshqa" },
      { text: "Takror" },
      { text: "Takror" },
    ]);
    expect(groups).toEqual([{ key: "Takror", indexes: [0, 2, 3] }]);
  });

  it("bo'sh va faqat bo'shliqdan iborat matnlarni umuman hisobga olmaydi", () => {
    expect(findDuplicateQuestions([{ text: "" }, { text: "   " }, { text: "\n\t" }])).toEqual([]);
  });

  it("takror bo'lmasa bo'sh ro'yxat qaytaradi", () => {
    expect(findDuplicateQuestions([{ text: "A" }, { text: "B" }])).toEqual([]);
  });

  it("bir nechta guruhni birinchi uchrash tartibida qaytaradi", () => {
    const groups = findDuplicateQuestions([
      { text: "B" },
      { text: "A" },
      { text: "B" },
      { text: "A" },
    ]);
    expect(groups.map((g) => g.key)).toEqual(["B", "A"]);
  });
});

describe("dropDuplicateQuestions", () => {
  it("har guruhdan birinchi nusxani qoldiradi va tartibni saqlaydi", () => {
    const questions = [
      { text: "A", id: "1" },
      { text: "B", id: "2" },
      { text: "A", id: "3" },
    ];
    expect(dropDuplicateQuestions(questions)).toEqual([
      { text: "A", id: "1" },
      { text: "B", id: "2" },
    ]);
  });

  it("bo'sh matnli savollarni o'chirmaydi — ular takror deb sanalmaydi", () => {
    const questions = [{ text: "" }, { text: "A" }, { text: "   " }];
    expect(dropDuplicateQuestions(questions)).toHaveLength(3);
  });

  it("idempotent — ikki marta qo'llash bir marta qo'llash bilan teng", () => {
    const questions = [{ text: "A" }, { text: "A" }, { text: "B" }, { text: "A" }];
    const once = dropDuplicateQuestions(questions);
    expect(dropDuplicateQuestions(once)).toEqual(once);
  });

  it("qoldirilgan savol obyektini nusxalamaydi", () => {
    const first = { text: "A" };
    const questions = [first, { text: "A" }];
    expect(dropDuplicateQuestions(questions)[0]).toBe(first);
  });

  it("takror yo'q bo'lsa ro'yxatni o'zgarishsiz qaytaradi", () => {
    const questions = [{ text: "A" }, { text: "B" }];
    expect(dropDuplicateQuestions(questions)).toEqual(questions);
  });
});
