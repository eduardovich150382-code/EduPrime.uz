import { describe, expect, it } from "vitest";
import { generateVariants, paramSpaceSize, type Template } from "../paramgen/paramgen";

// Oddiy shablon: c = sqrt(a^2 + b^2), faqat butun natijali ("Pifagor
// uchligiga yaqin") kombinatsiyalar qabul qilinadi — constraint'ni real
// rad etadigan holatlar hosil qilish uchun ataylab shunday tanlangan.
const pythagoreanTemplate: Template = {
  id: "test-pythagoras",
  subject: "Matematika",
  topic: "Pifagor teoremasi",
  difficulty: 2,
  params: [
    { name: "a", type: "int", min: 1, max: 12 },
    { name: "b", type: "int", min: 1, max: 12 },
  ],
  derived: {
    cSquared: "a^2 + b^2",
    c: "sqrt(cSquared)",
  },
  // Faqat c butun son bo'lgan (haqiqiy Pifagor uchligi) kombinatsiyalar
  constraints: ["c == round(c)", "a != b"],
  answer: { expr: "c", round: 0 },
  distractors: [
    { expr: "a + b", why: {} },
    { expr: "c + 1", why: {} },
    { expr: "a * b", why: {} },
  ],
  stem: { uz: "Katetlari {a} va {b} bo'lgan to'g'ri burchakli uchburchakning gipotenuzasini toping." },
  solution: { uz: "c = sqrt(a^2+b^2) = {c}" },
};

describe("generateVariants — constraints", () => {
  it("constraints bajarilmagan kombinatsiyalar rad etiladi — faqat haqiqiy Pifagor uchliklari chiqadi", () => {
    const variants = generateVariants(pythagoreanTemplate, { count: 20, seed: 1 });
    expect(variants.length).toBeGreaterThan(0);
    for (const v of variants) {
      const { a, b } = v.scope;
      const c = Math.sqrt(a * a + b * b);
      expect(Number.isInteger(c)).toBe(true); // constraint: c == round(c)
      expect(a).not.toBe(b); // constraint: a != b
    }
  });

  it("cheklovga mos kelmaydigan shablon uchun umuman variant chiqarmaydi (bo'sh natija)", () => {
    const impossible: Template = {
      ...pythagoreanTemplate,
      constraints: ["a > 1000"], // parametr diapazonida hech qachon bajarilmaydi
    };
    const variants = generateVariants(impossible, { count: 5, seed: 1, maxTries: 50 });
    expect(variants).toEqual([]);
  });
});

describe("generateVariants — variantSig takrorlanmasligi", () => {
  it("bir xil parametr kombinatsiyasi (signature) ikki marta chiqmaydi", () => {
    const variants = generateVariants(pythagoreanTemplate, { count: 30, seed: 5 });
    const signatures = variants.map((v) => `${v.scope.a}|${v.scope.b}`);
    expect(new Set(signatures).size).toBe(signatures.length);
  });

  it("variantId ham har doim noyob", () => {
    const variants = generateVariants(pythagoreanTemplate, { count: 30, seed: 5 });
    const ids = variants.map((v) => v.variantId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("generateVariants — distraktorlar", () => {
  it("distraktor to'g'ri javobga hech qachon teng emas", () => {
    const variants = generateVariants(pythagoreanTemplate, { count: 20, seed: 9 });
    for (const v of variants) {
      const correct = v.choices.find((c) => c.correct);
      expect(correct).toBeDefined();
      for (const wrong of v.choices.filter((c) => !c.correct)) {
        expect(wrong.text).not.toBe(correct!.text);
      }
    }
  });

  it("har variantda aynan bitta to'g'ri javob bor", () => {
    const variants = generateVariants(pythagoreanTemplate, { count: 20, seed: 9 });
    for (const v of variants) {
      expect(v.choices.filter((c) => c.correct)).toHaveLength(1);
    }
  });

  it("variantlar soni optionCount ga teng, kalitlar A,B,C,D tartibida", () => {
    const variants = generateVariants(pythagoreanTemplate, { count: 10, seed: 3, optionCount: 4 });
    for (const v of variants) {
      expect(v.choices).toHaveLength(4);
      expect(v.choices.map((c) => c.key)).toEqual(["A", "B", "C", "D"]);
    }
  });
});

describe("generateVariants — determinizm", () => {
  it("bir xil seed uchun bir xil natija beradi", () => {
    const a = generateVariants(pythagoreanTemplate, { count: 10, seed: 42 });
    const b = generateVariants(pythagoreanTemplate, { count: 10, seed: 42 });
    expect(a.map((v) => v.variantId)).toEqual(b.map((v) => v.variantId));
  });
});

describe("paramSpaceSize", () => {
  it("int parametrlar uchun diapazon o'lchamlarini ko'paytiradi", () => {
    // a: 1..12 (12 ta), b: 1..12 (12 ta) -> 144
    expect(paramSpaceSize(pythagoreanTemplate)).toBe(144);
  });

  it("const parametrlar hisobga olinmaydi (ko'paytmaga ta'sir qilmaydi)", () => {
    const withConst: Template = {
      ...pythagoreanTemplate,
      params: [...pythagoreanTemplate.params, { name: "k", type: "const", value: 1 }],
    };
    expect(paramSpaceSize(withConst)).toBe(144);
  });

  it("choice parametr variantlar sonini qo'shimcha ko'paytiradi", () => {
    const withChoice: Template = {
      ...pythagoreanTemplate,
      params: [...pythagoreanTemplate.params, { name: "sign", type: "choice", values: [1, -1] }],
    };
    expect(paramSpaceSize(withChoice)).toBe(144 * 2);
  });
});
