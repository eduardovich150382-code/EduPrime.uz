import { describe, expect, it } from "vitest";
import {
  MAX_PASTE_CHARS,
  MAX_PASTED_QUESTIONS,
  parsePastedQuestions,
  stripCodeFences,
} from "../pasted-json";

/** Chat shaklidagi bitta to'g'ri savol. */
function chatItem(over: Record<string, unknown> = {}) {
  return { order: 1, text: "2+2=?", options: ["3", "4", "5"], answer: "B", ...over };
}

/** `/api/ai/import` shaklidagi bitta to'g'ri savol. */
function apiItem(over: Record<string, unknown> = {}) {
  return {
    text: "2+2=?",
    options: [
      { label: "A", text: "3", image: null },
      { label: "B", text: "4", image: null },
    ],
    correctAnswer: "B",
    confidence: 0.9,
    ...over,
  };
}

describe("stripCodeFences", () => {
  it("json qobig'ini olib tashlaydi", () => {
    expect(stripCodeFences("```json\n[1]\n```")).toBe("[1]");
  });

  it("qobiqsiz matnni faqat trim qiladi", () => {
    expect(stripCodeFences("  [1]  ")).toBe("[1]");
  });
});

describe("parsePastedQuestions — chat shakli", () => {
  it("harf javobni correctAnswer ga o'giradi va yorliqlarni indeksdan qo'yadi", () => {
    const result = parsePastedQuestions(JSON.stringify([chatItem()]));
    expect(result.problems).toEqual([]);
    expect(result.questions).toHaveLength(1);
    const q = result.questions[0];
    expect(q.options.map((o) => o.label)).toEqual(["A", "B", "C"]);
    expect(q.correctAnswer).toBe("B");
    expect(q.type).toBe("MULTIPLE_CHOICE");
    expect(q.confidence).toBe(1);
  });

  it("qobiq bilan kelgan javobni o'qiydi", () => {
    const result = parsePastedQuestions("```json\n" + JSON.stringify([chatItem()]) + "\n```");
    expect(result.questions).toHaveLength(1);
  });

  it("order maydoni tartibni O'ZGARTIRMAYDI — tartib massivdagi o'rin", () => {
    // Rasm biriktirish N-savol ↔ N-draft indeksiga tayanadi, shuning uchun
    // `order` bo'yicha qayta tartiblash hamma rasmni siljitardi.
    const raw = JSON.stringify([
      chatItem({ order: 99, text: "birinchi" }),
      chatItem({ order: 1, text: "ikkinchi" }),
    ]);
    expect(parsePastedQuestions(raw).questions.map((q) => q.text)).toEqual([
      "birinchi",
      "ikkinchi",
    ]);
  });
});

describe("parsePastedQuestions — API shakli", () => {
  it("yorliqlarni indeksdan qayta qo'yadi va ixtiyoriy maydonlarni o'tkazadi", () => {
    const raw = JSON.stringify({
      questions: [
        apiItem({
          options: [
            { label: "X", text: "3", image: null },
            { label: "Y", text: "4", image: null },
          ],
          topic: "Algebra",
          difficulty: 3,
          explanation: "chunki",
        }),
      ],
    });
    const q = parsePastedQuestions(raw).questions[0];
    expect(q.options.map((o) => o.label)).toEqual(["A", "B"]);
    expect(q.topic).toBe("Algebra");
    expect(q.difficulty).toBe(3);
    expect(q.explanation).toBe("chunki");
  });

  it("OPEN_ENDED variantsiz kelishi HALOKATLI emas", () => {
    // `/api/ai/import` javobida ochiq javobli savol qonuniy ravishda
    // `options: []` bilan keladi.
    const raw = JSON.stringify([
      { text: "Tushuntiring", options: [], type: "OPEN_ENDED", correctAnswer: "javob" },
    ]);
    const result = parsePastedQuestions(raw);
    expect(result.problems).toEqual([]);
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].options).toEqual([]);
  });
});

describe("parsePastedQuestions — halokatli xatolar", () => {
  it("bitta savol buzuq bo'lsa HECH BIRI qo'shilmaydi", () => {
    const raw = JSON.stringify([
      chatItem({ text: "bir" }),
      chatItem({ text: "ikki" }),
      chatItem({ text: "uch" }),
      chatItem({ text: "   " }),
    ]);
    const result = parsePastedQuestions(raw);
    expect(result.questions).toEqual([]);
    expect(result.problems).toEqual([{ order: 4, code: "TEXT_EMPTY" }]);
    expect(result.totalSeen).toBe(4);
  });

  it("variantlar soni 2-8 dan tashqarida bo'lsa xato", () => {
    const one = parsePastedQuestions(JSON.stringify([chatItem({ options: ["a"] })]));
    expect(one.problems).toEqual([{ order: 1, code: "OPTION_COUNT_INVALID" }]);

    const nine = parsePastedQuestions(
      JSON.stringify([chatItem({ options: ["a", "b", "c", "d", "e", "f", "g", "h", "i"] })]),
    );
    expect(nine.problems).toEqual([{ order: 1, code: "OPTION_COUNT_INVALID" }]);
  });

  it("2 va 8 ta variant qabul qilinadi (chegara)", () => {
    const two = parsePastedQuestions(JSON.stringify([chatItem({ options: ["a", "b"] })]));
    expect(two.questions).toHaveLength(1);

    const eight = parsePastedQuestions(
      JSON.stringify([chatItem({ options: ["a", "b", "c", "d", "e", "f", "g", "h"] })]),
    );
    expect(eight.questions).toHaveLength(1);
  });

  it("kesilgan JSON alohida kod oladi", () => {
    // Ustoz uchun butunlay boshqa vaziyat: tuzatadigan narsa yo'q, chatdan
    // davomini so'rash kerak.
    const result = parsePastedQuestions('[{"text":"a","options":["x","y"],');
    expect(result.problems).toEqual([{ order: -1, code: "JSON_TRUNCATED" }]);
  });

  it("umuman JSON bo'lmagan matn JSON_INVALID", () => {
    expect(parsePastedQuestions("salom").problems).toEqual([
      { order: -1, code: "JSON_INVALID" },
    ]);
  });

  it("massiv topilmasa NOT_ARRAY", () => {
    expect(parsePastedQuestions('{"a":1}').problems).toEqual([
      { order: -1, code: "NOT_ARRAY" },
    ]);
  });

  it("chegaradan uzun matn tahlil qilinmaydi", () => {
    const result = parsePastedQuestions("a".repeat(MAX_PASTE_CHARS + 1));
    expect(result.problems).toEqual([{ order: -1, code: "TOO_LARGE" }]);
  });

  it("500 dan ortiq savol qabul qilinmaydi", () => {
    const raw = JSON.stringify(
      Array.from({ length: MAX_PASTED_QUESTIONS + 1 }, (_, i) => chatItem({ text: `s${i}` })),
    );
    const result = parsePastedQuestions(raw);
    expect(result.problems).toEqual([{ order: -1, code: "TOO_MANY" }]);
    expect(result.questions).toEqual([]);
  });
});

describe("parsePastedQuestions — ogohlantirishlar (savol qoladi)", () => {
  it("javob yo'q bo'lsa correctAnswer bo'sh qoladi, savol tashlanmaydi", () => {
    const result = parsePastedQuestions(JSON.stringify([chatItem({ answer: "" })]));
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].correctAnswer).toBe("");
    expect(result.warnings).toEqual([{ order: 1, code: "ANSWER_MISSING" }]);
    expect(result.questions[0].confidence).toBe(0.5);
  });

  it("javob variantlar ichida bo'lmasa ANSWER_UNKNOWN", () => {
    const result = parsePastedQuestions(JSON.stringify([chatItem({ answer: "Z" })]));
    expect(result.questions[0].correctAnswer).toBe("");
    expect(result.warnings).toEqual([{ order: 1, code: "ANSWER_UNKNOWN" }]);
  });

  it("toq $ soni LATEX_UNBALANCED beradi, savol qoladi", () => {
    const result = parsePastedQuestions(JSON.stringify([chatItem({ text: "$x=1 ni yeching" })]));
    expect(result.questions).toHaveLength(1);
    expect(result.warnings).toEqual([{ order: 1, code: "LATEX_UNBALANCED" }]);
  });

  it("rasm tokeni matndan VA variant ichidan olib tashlanadi", () => {
    const raw = JSON.stringify([
      chatItem({ text: "Rasmga qarang [[IMG:abc123]] va javob bering", options: ["[[IMG:d4]] bir", "ikki"] }),
    ]);
    const result = parsePastedQuestions(raw);
    const q = result.questions[0];
    expect(q.text).not.toContain("[[IMG");
    expect(q.text).toBe("Rasmga qarang va javob bering");
    expect(q.options[0].text).toBe("bir");
    expect(result.warnings).toEqual([{ order: 1, code: "IMAGE_TOKEN_STRIPPED" }]);
  });
});

describe("parsePastedQuestions — confidence", () => {
  it("AI bergan past ishonch KO'TARILMAYDI", () => {
    // 0.4 li savol ogohlantirishsiz ham 0.4 bo'lib qoladi: AI ning "buni
    // tekshiring" signali yo'qolmasligi kerak.
    const result = parsePastedQuestions(JSON.stringify([apiItem({ confidence: 0.4 })]));
    expect(result.warnings).toEqual([]);
    expect(result.questions[0].confidence).toBe(0.4);
  });

  it("yuqori ishonch ogohlantirish bilan 0.5 gacha tushadi", () => {
    const result = parsePastedQuestions(
      JSON.stringify([apiItem({ confidence: 0.9, correctAnswer: "" })]),
    );
    expect(result.questions[0].confidence).toBe(0.5);
  });

  it("past ishonch ogohlantirish bilan yanada pasaymaydi", () => {
    const result = parsePastedQuestions(
      JSON.stringify([apiItem({ confidence: 0.3, correctAnswer: "" })]),
    );
    expect(result.questions[0].confidence).toBe(0.3);
  });
});
