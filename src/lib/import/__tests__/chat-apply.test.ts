import { describe, expect, it } from "vitest";
import { applyChatItem, parseChatJson, type ApplySource, type ChatItem } from "../chat-apply";

const ID_A = "[[IMG:cmu2gfe670005lc0438g6uky5]]";
const ID_B = "[[IMG:cmu2gfe670005lc0438g6uky6]]";

function source(overrides: Partial<ApplySource> = {}): ApplySource {
  return {
    sourceText: "Savol",
    tokenMap: {},
    answerKey: null,
    sourceNumber: null,
    sourceMode: null,
    ...overrides,
  };
}

function item(overrides: Partial<ChatItem> = {}): ChatItem {
  return { order: 12, text: "Savol", options: ["bir", "ikki", "uch"], answer: "B", ...overrides };
}

/** Testni qisqartiradi — yiqilmagan natijani tipi bilan qaytaradi. */
function ok(result: ReturnType<typeof applyChatItem>) {
  if (!result.ok) throw new Error(`kutilmagan yiqilish: ${result.code}`);
  return result;
}

describe("parseChatJson", () => {
  it("massivni o'qiydi", () => {
    const { items, problems } = parseChatJson([{ order: 3, text: "S", options: ["a", "b"], answer: "A" }]);

    expect(problems).toEqual([]);
    expect(items).toEqual([{ order: 3, text: "S", options: ["a", "b"], answer: "A" }]);
  });

  it("o'ralgan massivni ham o'qiydi", () => {
    // Chatdagi model javobni ko'pincha o'raydi — ustozni JSON ni qo'lda
    // ochishga majburlash o'rniga tanish kalitlar qabul qilinadi.
    for (const key of ["results", "questions", "items"]) {
      const { items } = parseChatJson({ [key]: [{ order: 1, text: "S", options: [], answer: "" }] });
      expect(items).toHaveLength(1);
    }
  });

  it("massiv bo'lmasa JSON_INVALID", () => {
    expect(parseChatJson(null).problems).toEqual([{ order: -1, code: "JSON_INVALID" }]);
    expect(parseChatJson("matn").problems).toEqual([{ order: -1, code: "JSON_INVALID" }]);
  });

  it("order butun son bo'lmasa element tashlanadi", () => {
    const { items, problems } = parseChatJson([{ order: "o'n ikki" }, { order: 5, text: "S" }]);

    expect(items).toHaveLength(1);
    expect(problems).toEqual([{ order: -1, code: "ORDER_INVALID" }]);
  });

  it("noto'g'ri turdagi maydonlar bo'sh qiymatga tushadi", () => {
    const { items } = parseChatJson([{ order: 1, text: 5, options: [1, "a"], answer: null }]);

    expect(items[0]).toEqual({ order: 1, text: "", options: ["", "a"], answer: "" });
  });
});

describe("applyChatItem — yiqitadigan tekshiruvlar", () => {
  it("variantlar soni 2 dan kam yoki 8 dan ko'p bo'lsa yiqiladi", () => {
    expect(applyChatItem(source(), item({ options: ["bitta"] }))).toEqual({
      ok: false,
      code: "OPTION_COUNT_INVALID",
    });
    const nine = Array.from({ length: 9 }, (_, i) => String(i));
    expect(applyChatItem(source(), item({ options: nine }))).toEqual({
      ok: false,
      code: "OPTION_COUNT_INVALID",
    });
  });

  it("2 va 8 ta variant qabul qilinadi", () => {
    expect(applyChatItem(source(), item({ options: ["a", "b"], answer: "B" })).ok).toBe(true);
    const eight = Array.from({ length: 8 }, (_, i) => String(i));
    expect(applyChatItem(source(), item({ options: eight, answer: "H" })).ok).toBe(true);
  });

  it("javob variantlar oralig'idan tashqarida bo'lsa yiqiladi", () => {
    for (const answer of ["F", "", "BC", "1"]) {
      expect(applyChatItem(source(), item({ options: ["a", "b", "c"], answer }))).toEqual({
        ok: false,
        code: "ANSWER_INVALID",
      });
    }
  });

  it("javob probel va kichik harf bilan kelsa ham qabul qilinadi", () => {
    expect(ok(applyChatItem(source(), item({ answer: " c " }))).correctAnswer).toBe("C");
  });
});

describe("applyChatItem — yozilishi", () => {
  it("yorliqlar INDEKSDAN qo'yiladi, chatdan so'ralmaydi", () => {
    const result = ok(applyChatItem(source(), item({ options: ["bir", "ikki", "uch"] })));

    expect(result.options).toEqual([
      { label: "A", text: "bir", imageToken: null },
      { label: "B", text: "ikki", imageToken: null },
      { label: "C", text: "uch", imageToken: null },
    ]);
  });

  it("muammosiz savolda bayroq yo'q", () => {
    const result = ok(applyChatItem(source({ sourceText: "Savol" }), item({ text: "Savol" })));

    expect(result.flags).toEqual([]);
  });
});

describe("applyChatItem — rasm tokenlari", () => {
  const tokenMap = { IMG1: ID_A, IMG2: ID_B };

  it("qisqa token haqiqiysiga qaytariladi", () => {
    const result = ok(
      applyChatItem(source({ tokenMap }), item({ text: "Grafik [[IMG1]] va [[IMG2]]" })),
    );

    expect(result.text).toBe(`Grafik ${ID_A} va ${ID_B}`);
    expect(result.flags).toEqual([]);
  });

  it("xaritada yo'q token O'CHIRILADI", () => {
    const result = ok(applyChatItem(source({ tokenMap: { IMG1: ID_A } }), item({ text: "Savol [[IMG9]]" })));

    expect(result.text).not.toContain("IMG9");
    expect(result.flags).toContain("IMAGE_TOKEN_INVALID");
    // Sarflanmagan IMG1 esa matn oxiriga qaytariladi — chiqishning token
    // to'plami manbanikiga HAR DOIM teng bo'lishi shart.
    expect(result.text).toBe(`Savol ${ID_A}`);
    expect(result.flags).toContain("IMAGE_TOKEN_MOVED");
  });

  it("takroriy token ikkinchi joyda o'chiriladi", () => {
    const result = ok(
      applyChatItem(source({ tokenMap: { IMG1: ID_A } }), item({ text: "[[IMG1]] va [[IMG1]]" })),
    );

    expect(result.text).toBe(`${ID_A} va `);
    expect(result.flags).toContain("IMAGE_TOKEN_INVALID");
  });

  it("tushib qolgan token matn OXIRIGA qaytariladi", () => {
    const result = ok(applyChatItem(source({ tokenMap }), item({ text: "Savol [[IMG1]]" })));

    expect(result.text).toBe(`Savol ${ID_A} ${ID_B}`);
    expect(result.flags).toContain("IMAGE_TOKEN_MOVED");
  });

  it("variant ichidagi qisqa token ham tiklanadi", () => {
    const result = ok(
      applyChatItem(source({ tokenMap: { IMG1: ID_A } }), item({ text: "Savol", options: ["[[IMG1]]", "b"] })),
    );

    expect(result.options[0].text).toBe(ID_A);
    expect(result.flags).toEqual([]);
  });

  it("token ichidagi cuid raqamlari son deb SANALMAYDI", () => {
    // `cmu2gfe670005lc0438g6uky5` ichida 670005, 0438, 5 bor. Manba matnida
    // (BLOCK bosqichi) token umuman yo'q — tozalamasdan solishtirilsa har
    // rasmli savol yolg'on NUMBER_MISMATCH olardi.
    const result = ok(
      applyChatItem(
        source({ sourceText: "Tezlik 40 m/s", tokenMap: { IMG1: ID_A } }),
        item({ text: "Tezlik 40 m/s [[IMG1]]" }),
      ),
    );

    expect(result.flags).toEqual([]);
  });
});

describe("applyChatItem — yiqitmaydigan bayroqlar", () => {
  it("$ soni toq bo'lsa LATEX_UNBALANCED", () => {
    const result = ok(applyChatItem(source(), item({ text: "Tezlik $v = 2" })));

    expect(result.flags).toContain("LATEX_UNBALANCED");
    expect(result.text).toBe("Tezlik $v = 2");
  });

  it("juft $ bayroq bermaydi", () => {
    expect(ok(applyChatItem(source({ sourceText: "$v = 2$" }), item({ text: "$v = 2$" }))).flags).toEqual([]);
  });

  it("son o'zgarsa NUMBER_MISMATCH", () => {
    const result = ok(
      applyChatItem(source({ sourceText: "Tezlik 40 m/s" }), item({ text: "Tezlik 45 m/s" })),
    );

    expect(result.flags).toContain("NUMBER_MISMATCH");
  });

  it("variantlardagi sonlar ham hisobga olinadi", () => {
    const src = source({ sourceText: "Savol\n2\n3" });

    expect(ok(applyChatItem(src, item({ text: "Savol", options: ["2", "3"] }))).flags).toEqual([]);
    expect(
      ok(applyChatItem(src, item({ text: "Savol", options: ["2", "4"] }))).flags,
    ).toContain("NUMBER_MISMATCH");
  });

  it("kitob kaliti farq qilsa ANSWER_MISMATCH, lekin chat javobi YOZILADI", () => {
    const result = ok(applyChatItem(source({ answerKey: "D" }), item({ answer: "B" })));

    expect(result.correctAnswer).toBe("B");
    expect(result.flags).toContain("ANSWER_MISMATCH");
  });

  it("kalit mos kelsa bayroq yo'q", () => {
    expect(ok(applyChatItem(source({ answerKey: "B" }), item({ answer: "B" }))).flags).toEqual([]);
  });

  it("savol raqami son solishtiruvidan chiqariladi", () => {
    // Xom blok matni raqam bilan BOSHLANADI, chat javobi esa undan tozalangan.
    // Tekshirmasa deyarli har savol yolg'on NUMBER_MISMATCH olardi.
    const src = source({ sourceText: "12. Tezlik 40 m/s", sourceNumber: 12 });

    expect(ok(applyChatItem(src, item({ text: "Tezlik 40 m/s" }))).flags).toEqual([]);
    // Chat raqamni saqlab qolsa ham xato emas.
    expect(ok(applyChatItem(src, item({ text: "12. Tezlik 40 m/s" }))).flags).toEqual([]);
    // Haqiqiy farq esa baribir tutiladi.
    expect(ok(applyChatItem(src, item({ text: "Tezlik 45 m/s" }))).flags).toContain("NUMBER_MISMATCH");
  });

  it("skan va qo'lda terilgan sahifada sonlar UMUMAN solishtirilmaydi", () => {
    // OCR matni ishonchsiz, chat esa uni sahifa rasmiga qarab tuzatadi —
    // farq bu yerda kutilgan holat, bayroq esa shovqin.
    for (const mode of ["skan", "qol"]) {
      const src = source({ sourceText: "Tezlik 4O m/s", sourceMode: mode });

      expect(ok(applyChatItem(src, item({ text: "Tezlik 40 m/s" }))).flags).toEqual([]);
    }
  });

  it("boshqa rejimlarda solishtiruv avvalgidek", () => {
    const src = source({ sourceText: "Tezlik 40 m/s", sourceMode: "rasm" });

    expect(ok(applyChatItem(src, item({ text: "Tezlik 45 m/s" }))).flags).toContain("NUMBER_MISMATCH");
  });

  it("rejimi yo'q eski draftda ham solishtiruv bajariladi", () => {
    const src = source({ sourceText: "Tezlik 40 m/s", sourceMode: null });

    expect(ok(applyChatItem(src, item({ text: "Tezlik 45 m/s" }))).flags).toContain("NUMBER_MISMATCH");
  });

  it("skan rejimi boshqa bayroqlarni o'chirmaydi", () => {
    const src = source({ sourceText: "Tezlik 40 m/s", sourceMode: "skan", answerKey: "D" });
    const result = ok(applyChatItem(src, item({ text: "Tezlik $v = 45", answer: "B" })));

    expect(result.flags).toEqual(expect.arrayContaining(["LATEX_UNBALANCED", "ANSWER_MISMATCH"]));
    expect(result.flags).not.toContain("NUMBER_MISMATCH");
  });
});
