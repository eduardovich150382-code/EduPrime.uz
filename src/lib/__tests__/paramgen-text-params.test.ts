import { describe, expect, it } from "vitest";
import { generateVariants, type Template } from "../paramgen/paramgen";

// Tarix shablon: javob "set" ustunidan (fromParam) olinadi, chalg'ituvchilar
// esa shu ustunning boshqa qatorlaridan — "nearest" strategiyasi (yillar
// bir-biriga yaqinligi ma'noli bo'lgani uchun sanalar uchun mos).
const historyTemplate: Template = {
  id: "test-history-events",
  subject: "Tarix",
  topic: "Sohibqiron davri voqealari",
  difficulty: 2,
  params: [
    {
      name: "event",
      type: "set",
      names: ["eventName", "eventYear"],
      rows: [
        ["Amir Temur tug'ilgani", 1336],
        ["Sohibqiron taxtga chiqishi", 1370],
        ["Samarqand poytaxt qilingani", 1371],
        ["Bibixonim qurilishi boshlangani", 1399],
        ["Angliyaga elchi yuborilgani", 1404],
        ["Sohibqiron vafoti", 1405],
      ],
    },
  ],
  answer: { fromParam: "eventYear" },
  distractors: { fromColumn: "eventYear", strategy: "nearest", count: 3 },
  stem: { uz: "\"{eventName}\" voqeasi qaysi yilda sodir bo'lgan?" },
  solution: { uz: "\"{eventName}\" — {eventYear}-yilda." },
};

// Ona tili shablon: "sameGroup" — noyob toifalardan (so'z turkumlaridan)
// chalg'ituvchi tanlanadi.
const grammarTemplate: Template = {
  id: "test-grammar-categories",
  subject: "Ona tili",
  topic: "So'z turkumlari",
  difficulty: 1,
  params: [
    {
      name: "word",
      type: "set",
      names: ["wordText", "wordCategory"],
      rows: [
        ["kitob", "ot"],
        ["chiroyli", "sifat"],
        ["yugurmoq", "fe'l"],
        ["tez", "ravish"],
        ["besh", "son"],
        ["men", "olmosh"],
      ],
    },
  ],
  answer: { fromParam: "wordCategory" },
  distractors: { fromColumn: "wordCategory", strategy: "sameGroup", count: 3 },
  stem: { uz: '"{wordText}" so\'zi qaysi so\'z turkumiga tegishli?' },
  solution: { uz: '"{wordText}" — {wordCategory}.' },
};

// Huquqshunoslik shablon: "otherRows" — istalgan boshqa qatordan tasodifiy.
const lawTemplate: Template = {
  id: "test-law-articles",
  subject: "Huquqshunoslik",
  topic: "Konstitutsiya moddalari",
  difficulty: 3,
  params: [
    {
      name: "article",
      type: "set",
      names: ["articleNumber", "articleTitle"],
      rows: [
        [1, "Davlat mustaqilligi"],
        [2, "Davlat hokimiyati xalqqa tegishli"],
        [3, "Qonun ustuvorligi"],
        [4, "Davlat tili"],
        [5, "Fuqarolik jamiyati"],
        [6, "Mulkchilik shakllari"],
      ],
    },
  ],
  answer: { fromParam: "articleTitle" },
  distractors: { fromColumn: "articleTitle", strategy: "otherRows", count: 3 },
  stem: { uz: "{articleNumber}-modda nimaga bag'ishlangan?" },
  solution: { uz: '{articleNumber}-modda — "{articleTitle}".' },
};

describe("generateVariants — matnli javob (answer.fromParam)", () => {
  it("javob 'set' ustunidan to'g'ridan-to'g'ri olinadi, ifoda hisoblanmaydi", () => {
    const variants = generateVariants(historyTemplate, { count: 6, seed: 1 });
    expect(variants.length).toBeGreaterThan(0);
    for (const v of variants) {
      expect(v.answerValue).toBe(v.scope.eventYear);
      const correct = v.choices.find((c) => c.correct)!;
      expect(correct.text).toBe(String(v.scope.eventYear));
    }
  });

  it("stem/solution matnida matnli parametr {eventName} to'g'ri almashtiriladi", () => {
    const variants = generateVariants(historyTemplate, { count: 6, seed: 1 });
    for (const v of variants) {
      expect(v.stem).toContain(String(v.scope.eventName));
      expect(v.stem).not.toContain("{");
      expect(v.solution).toContain(String(v.scope.eventName));
    }
  });

  it("variantSig matnli ustunlarni ham hisobga oladi — har voqea uchun alohida signature", () => {
    const variants = generateVariants(historyTemplate, { count: 6, seed: 1 });
    const ids = variants.map((v) => v.variantId);
    expect(new Set(ids).size).toBe(ids.length);
    // 6 qatorli parametr fazosida ko'pi bilan 6 ta noyob variant bo'lishi mumkin
    expect(variants.length).toBeLessThanOrEqual(6);
  });
});

describe("generateVariants — distraktor strategiyalari", () => {
  it("'nearest': chalg'ituvchilar to'g'ri javobga eng yaqin yillar (sanalar uchun)", () => {
    const variants = generateVariants(historyTemplate, { count: 6, seed: 2 });
    expect(variants.length).toBeGreaterThan(0);
    const historyParam0 = historyTemplate.params[0];
    const allYears =
      historyParam0.type === "set" && "rows" in historyParam0
        ? historyParam0.rows.map((r) => r[1] as number)
        : [];

    for (const v of variants) {
      const ansYear = Number(v.answerValue);
      const wrongYears = v.choices.filter((c) => !c.correct).map((c) => Number(c.text));
      expect(wrongYears).toHaveLength(3);
      // Takrorlanmagan va to'g'ri javobga teng emas
      expect(new Set(wrongYears).size).toBe(3);
      expect(wrongYears).not.toContain(ansYear);

      const otherYears = allYears.filter((y) => y !== ansYear);
      const excluded = otherYears.filter((y) => !wrongYears.includes(y));
      const maxChosenDist = Math.max(...wrongYears.map((y) => Math.abs(y - ansYear)));
      for (const y of excluded) {
        // Tanlanmagan har bir yil, tanlangan eng "uzoq" distraktordan yaqin bo'lmasligi kerak
        expect(Math.abs(y - ansYear)).toBeGreaterThanOrEqual(maxChosenDist);
      }
    }
  });

  it("'sameGroup': chalg'ituvchilar noyob toifalardan, to'g'ri javobdan boshqa", () => {
    const variants = generateVariants(grammarTemplate, { count: 6, seed: 3 });
    expect(variants.length).toBeGreaterThan(0);
    for (const v of variants) {
      const ansCategory = String(v.answerValue);
      const wrong = v.choices.filter((c) => !c.correct).map((c) => c.text);
      expect(wrong).toHaveLength(3);
      expect(new Set(wrong).size).toBe(3); // noyob
      expect(wrong).not.toContain(ansCategory);
    }
  });

  it("'otherRows': chalg'ituvchilar boshqa qatorlardan, to'g'ri javobga teng emas", () => {
    const variants = generateVariants(lawTemplate, { count: 6, seed: 4 });
    expect(variants.length).toBeGreaterThan(0);
    const lawParam0 = lawTemplate.params[0];
    const allTitles = lawParam0.type === "set" && "rows" in lawParam0 ? lawParam0.rows.map((r) => r[1] as string) : [];
    for (const v of variants) {
      const ansTitle = String(v.answerValue);
      const wrong = v.choices.filter((c) => !c.correct).map((c) => c.text);
      expect(wrong).toHaveLength(3);
      expect(new Set(wrong).size).toBe(3);
      expect(wrong).not.toContain(ansTitle);
      for (const w of wrong) expect(allTitles).toContain(w);
    }
  });
});

describe("generateVariants — matnli parametrni mathjs ifodasida ishlatish taqiqlangan", () => {
  it("derived ifodasida matnli parametr ishlatilsa, aniq xato beriladi", () => {
    const bad: Template = {
      ...historyTemplate,
      id: "test-bad-derived",
      derived: { doubled: "eventYear * 2 + length(eventName)" },
    };
    expect(() => generateVariants(bad, { count: 1 })).toThrow(/matnli parametr "eventName"/);
  });

  it("answer.expr ifodasida matnli parametr ishlatilsa, aniq xato beriladi", () => {
    const bad: Template = {
      ...historyTemplate,
      id: "test-bad-answer-expr",
      answer: { expr: "eventYear + eventName" },
    };
    expect(() => generateVariants(bad, { count: 1 })).toThrow(/matnli parametr "eventName"/);
  });

  it("noto'g'ri fromColumn (set parametrida yo'q ustun nomi) aniq xato beradi", () => {
    const bad: Template = {
      ...historyTemplate,
      id: "test-bad-fromcolumn",
      distractors: { fromColumn: "noSuchColumn", strategy: "otherRows" },
    };
    expect(() => generateVariants(bad, { count: 1 })).toThrow(/fromColumn="noSuchColumn"/);
  });
});

// Korpusga asoslangan "set" parametr — qatorlar shablon ichida emas,
// `src/lib/paramgen/corpora/<corpus>.json` faylida. Bu yerda faqat
// generatorning fayl o'qish/xato holatlari tekshiriladi — real korpuslar
// bilan ishlaydigan haqiqiy shablonlar `paramgen-corpus-templates.test.ts`da.
describe("generateVariants — 'set' parametr korpusdan (corpus) o'qilganda", () => {
  const corpusTemplate: Template = {
    id: "test-corpus-history",
    subject: "Tarix",
    topic: "Test korpus",
    difficulty: 2,
    params: [{ name: "event", type: "set", corpus: "tarix-voqealar" }],
    answer: { fromParam: "yil" },
    distractors: { fromColumn: "yil", strategy: "nearest", count: 3 },
    stem: { uz: "\"{voqea}\" voqeasi qaysi yilda sodir bo'lgan?" },
    solution: { uz: "\"{voqea}\" — {yil}-yilda." },
  };

  it("mavjud korpus fayldan o'qib, oddiy inline 'set' bilan bir xil ishlaydi", () => {
    const variants = generateVariants(corpusTemplate, { count: 5, seed: 1 });
    expect(variants.length).toBeGreaterThan(0);
    for (const v of variants) {
      expect(v.answerValue).toBe(v.scope.yil);
      expect(v.stem).not.toContain("{");
      expect(v.choices.filter((c) => c.correct)).toHaveLength(1);
    }
  });

  it("mavjud bo'lmagan korpus nomi uchun aniq xato beradi", () => {
    const bad: Template = {
      ...corpusTemplate,
      id: "test-bad-corpus",
      params: [{ name: "event", type: "set", corpus: "yoq-shunday-korpus" }],
    };
    expect(() => generateVariants(bad, { count: 1 })).toThrow(/Korpus topilmadi: "yoq-shunday-korpus"/);
  });
});
