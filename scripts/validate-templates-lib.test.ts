import { describe, expect, it } from "vitest";
import type { Template, Variant } from "../src/lib/paramgen/paramgen";
import {
  validateAllTemplates,
  validateTemplate,
  validateTemplateMeta,
  validateVariants,
} from "./validate-templates-lib";
import templatesJson from "../src/lib/paramgen/templates.json";

const realTemplates = templatesJson as unknown as Template[];

// To'liq to'g'ri shablon — har bir alohida test shundan bitta joyini
// buzadi, qolgani sof qoladi (shu bilan har tekshiruv izolyatsiyada
// sinaladi).
const goodTemplate: Template = {
  id: "test-valid-template",
  subject: "Matematika",
  topic: "Test mavzu",
  grade: [9, 10],
  exams: ["DTM"],
  difficulty: 2,
  params: [
    { name: "a", type: "int", min: 2, max: 9 },
    { name: "b", type: "int", min: 2, max: 9 },
  ],
  constraints: ["a != b"],
  answer: { expr: "a + b" },
  distractors: [
    { expr: "a - b", why: { uz: "ayirish bilan aralashtirilgan" } },
    { expr: "a * b", why: { uz: "ko'paytirish bilan aralashtirilgan" } },
    { expr: "a + b + 1", why: { uz: "bittaga xato qo'shilgan" } },
  ],
  stem: { uz: "{a} + {b} nechaga teng?" },
  solution: { uz: "{a} + {b} = {ans}" },
};

function makeVariant(overrides: Partial<Variant> = {}): Variant {
  return {
    variantId: "test-valid-template#v1",
    templateId: "test-valid-template",
    subject: "Matematika",
    topic: "Test mavzu",
    difficulty: 2,
    lang: "uz",
    stem: "2 + 3 nechaga teng?",
    choices: [
      { key: "A", text: "5", correct: true },
      { key: "B", text: "6", correct: false },
      { key: "C", text: "7", correct: false },
      { key: "D", text: "8", correct: false },
    ],
    answerValue: 5,
    solution: "2 + 3 = 5",
    hints: [],
    scope: { a: 2, b: 3, ans: 5 },
    ...overrides,
  };
}

describe("validateTemplateMeta", () => {
  it("to'liq shablon uchun xato bermaydi", () => {
    expect(validateTemplateMeta(goodTemplate)).toEqual([]);
  });

  it("topic bo'sh bo'lsa xato beradi", () => {
    const issues = validateTemplateMeta({ ...goodTemplate, topic: "" });
    expect(issues.map((i) => i.check)).toContain("topic");
  });

  it("difficulty berilmagan bo'lsa xato beradi", () => {
    const issues = validateTemplateMeta({ ...goodTemplate, difficulty: undefined as unknown as number });
    expect(issues.map((i) => i.check)).toContain("difficulty");
  });

  it("grade bo'sh bo'lsa xato beradi", () => {
    const issues = validateTemplateMeta({ ...goodTemplate, grade: [] });
    expect(issues.map((i) => i.check)).toContain("grade");
  });

  it("exams berilmagan bo'lsa xato beradi", () => {
    const issues = validateTemplateMeta({ ...goodTemplate, exams: undefined });
    expect(issues.map((i) => i.check)).toContain("exams");
  });

  it("raqamli (expr) distraktorda why bo'lmasa xato beradi", () => {
    const issues = validateTemplateMeta({
      ...goodTemplate,
      distractors: [{ expr: "a - b", why: {} }],
    });
    expect(issues.map((i) => i.check)).toContain("distractor-why");
  });

  it("fromColumn distraktorlarda why talab qilinmaydi (raqamli emas)", () => {
    const withFromColumn: Template = {
      ...goodTemplate,
      distractors: { fromColumn: "a", strategy: "otherRows" },
    };
    expect(validateTemplateMeta(withFromColumn).map((i) => i.check)).not.toContain("distractor-why");
  });
});

describe("validateVariants", () => {
  it("to'g'ri variant uchun xato bermaydi", () => {
    expect(validateVariants(goodTemplate, [makeVariant()])).toEqual([]);
  });

  it("variantlar ro'yxati bo'sh bo'lsa 'no-variants' beradi", () => {
    const issues = validateVariants(goodTemplate, []);
    expect(issues).toHaveLength(1);
    expect(issues[0].check).toBe("no-variants");
  });

  it("ikkita variant bir xil variantId'ga ega bo'lsa xato beradi", () => {
    const issues = validateVariants(goodTemplate, [
      makeVariant({ variantId: "dup" }),
      makeVariant({ variantId: "dup" }),
    ]);
    expect(issues.map((i) => i.check)).toContain("variant-sig-unique");
  });

  it("javob NaN bo'lsa xato beradi", () => {
    const issues = validateVariants(goodTemplate, [makeVariant({ answerValue: NaN })]);
    expect(issues.map((i) => i.check)).toContain("answer-computed");
  });

  it("javob Infinity bo'lsa xato beradi", () => {
    const issues = validateVariants(goodTemplate, [makeVariant({ answerValue: Infinity })]);
    expect(issues.map((i) => i.check)).toContain("answer-computed");
  });

  it("bo'sh matnli javob xato beradi", () => {
    const issues = validateVariants(goodTemplate, [makeVariant({ answerValue: "" })]);
    expect(issues.map((i) => i.check)).toContain("answer-computed");
  });

  it("to'g'ri javob soni 1 dan farq qilsa xato beradi", () => {
    const issues = validateVariants(goodTemplate, [
      makeVariant({
        choices: [
          { key: "A", text: "5", correct: true },
          { key: "B", text: "6", correct: true },
          { key: "C", text: "7", correct: false },
          { key: "D", text: "8", correct: false },
        ],
      }),
    ]);
    expect(issues.map((i) => i.check)).toContain("single-correct");
  });

  it("to'g'ri javob distraktorlardan biriga teng bo'lsa xato beradi", () => {
    const issues = validateVariants(goodTemplate, [
      makeVariant({
        choices: [
          { key: "A", text: "5", correct: true },
          { key: "B", text: "5", correct: false },
          { key: "C", text: "7", correct: false },
          { key: "D", text: "8", correct: false },
        ],
      }),
    ]);
    expect(issues.map((i) => i.check)).toContain("answer-not-distractor");
  });

  it("distraktorlar o'zaro takrorlansa xato beradi", () => {
    const issues = validateVariants(goodTemplate, [
      makeVariant({
        choices: [
          { key: "A", text: "5", correct: true },
          { key: "B", text: "6", correct: false },
          { key: "C", text: "6", correct: false },
          { key: "D", text: "8", correct: false },
        ],
      }),
    ]);
    expect(issues.map((i) => i.check)).toContain("distractors-unique");
  });

  it("constraint bajarilmagan scope uchun xato beradi", () => {
    const issues = validateVariants(goodTemplate, [makeVariant({ scope: { a: 3, b: 3, ans: 6 } })]); // a != b buzilgan
    expect(issues.map((i) => i.check)).toContain("constraints");
  });

  it("stem'da to'ldirilmagan {param} qolsa xato beradi", () => {
    const issues = validateVariants(goodTemplate, [makeVariant({ stem: "{noSuchParam} nechaga teng?" })]);
    expect(issues.map((i) => i.check)).toContain("stem-unfilled");
  });

  it("solution'da to'ldirilmagan {param} qolsa xato beradi", () => {
    const issues = validateVariants(goodTemplate, [makeVariant({ solution: "javob {noSuchParam}" })]);
    expect(issues.map((i) => i.check)).toContain("solution-unfilled");
  });

  it("unit berilgan bo'lsa va javob matnida ko'rinmasa xato beradi", () => {
    const withUnit: Template = { ...goodTemplate, answer: { expr: "a + b", unit: "sm" } };
    const issues = validateVariants(withUnit, [
      makeVariant({
        choices: [
          { key: "A", text: "5", correct: true }, // "sm" yo'q
          { key: "B", text: "6 sm", correct: false },
          { key: "C", text: "7 sm", correct: false },
          { key: "D", text: "8 sm", correct: false },
        ],
      }),
    ]);
    expect(issues.map((i) => i.check)).toContain("unit-visible");
  });

  it("unit javob matnida ko'rinsa xato bermaydi", () => {
    const withUnit: Template = { ...goodTemplate, answer: { expr: "a + b", unit: "sm" } };
    const issues = validateVariants(withUnit, [
      makeVariant({
        choices: [
          { key: "A", text: "5 sm", correct: true },
          { key: "B", text: "6 sm", correct: false },
          { key: "C", text: "7 sm", correct: false },
          { key: "D", text: "8 sm", correct: false },
        ],
      }),
    ]);
    expect(issues.map((i) => i.check)).not.toContain("unit-visible");
  });
});

describe("validateTemplate — to'liq oqim (haqiqiy generateVariants orqali)", () => {
  it("to'g'ri shablon uchun xato bermaydi", () => {
    expect(validateTemplate(goodTemplate)).toEqual([]);
  });

  it("ataylab buzilgan shablon (imkonsiz constraint) uchun xato qaytaradi", () => {
    const impossible: Template = { ...goodTemplate, constraints: ["a > 1000"] };
    const issues = validateTemplate(impossible);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((i) => i.check === "no-variants")).toBe(true);
  });

  it("ataylab buzilgan shablon (bir nechta metama'lumot yetishmayapti) uchun bir nechta xato qaytaradi", () => {
    const broken: Template = {
      ...goodTemplate,
      topic: "",
      grade: [],
      distractors: [{ expr: "a - b", why: {} }],
    };
    const issues = validateTemplate(broken);
    const checks = issues.map((i) => i.check);
    expect(checks).toContain("topic");
    expect(checks).toContain("grade");
    expect(checks).toContain("distractor-why");
  });
});

describe("validateAllTemplates — mavjud 60 ta real shablon", () => {
  it("hech qanday xato qaytarmaydi (bazaga yozishga tayyor)", () => {
    const issues = validateAllTemplates(realTemplates);
    if (issues.length > 0) {
      console.error(issues.slice(0, 20));
    }
    expect(issues).toEqual([]);
  });
});
