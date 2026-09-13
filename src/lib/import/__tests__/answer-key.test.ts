import { describe, expect, it } from "vitest";
import {
  extractInlineAnswer,
  findAnswerKeys,
  isKeyBlock,
  resolveAnswer,
  type KeyCandidateBlock,
} from "../answer-key";
import { flattenBlocks, groupIntoQuestions } from "../grouping";
import type { Manifest, ManifestBlock, ManifestPage } from "../manifest";

// A4, PDF nuqtalarida — grouping.test.ts bilan bir xil.
const W = 595.32;
const H = 841.92;

let nextIndex = 0;

function candidate(page: number, text: string): KeyCandidateBlock {
  return { page, bbox: { x: 40, y: 100, w: 500, h: 20 }, text, globalIndex: nextIndex++ };
}

function block(x: number, y: number, text: string, w = 500, h = 20): ManifestBlock {
  return { order: 0, bbox: { x, y, w, h }, text };
}

function page(n: number, blocks: ManifestBlock[]): ManifestPage {
  const sorted = [...blocks]
    .sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x)
    .map((item, order) => ({ ...item, order }));
  return { page: n, width: W, height: H, blocks: sorted, images: [] };
}

function manifest(...pages: ManifestPage[]): Manifest {
  return { version: 1, kind: "auto", sourceFile: "test.pdf", sourceLang: "tr", pageCount: pages.length, pages };
}

describe("isKeyBlock / findAnswerKeys", () => {
  it("nuqtali qator — oltita juftlik topiladi", () => {
    const keys = findAnswerKeys([candidate(1, "1. B  2.B  3.D  4.D  5.C  6.D")]);

    expect(keys).toHaveLength(1);
    expect([...keys[0].entries.entries()]).toEqual([
      [1, "B"],
      [2, "B"],
      [3, "D"],
      [4, "D"],
      [5, "C"],
      [6, "D"],
    ]);
  });

  it("tireli jadval ko'rinishi", () => {
    const keys = findAnswerKeys([candidate(3, "1-B 2-A 3-D 4-E 5-C")]);

    expect(keys).toHaveLength(1);
    expect(keys[0].entries.get(2)).toBe("A");
    expect(keys[0].page).toBe(3);
  });

  it("yorliq bilan boshlangan kalit ham topiladi — qamrov ORALIQ bo'yicha o'lchanadi", () => {
    expect(isKeyBlock("CEVAP ANAHTARI 1. B  2.B  3.D  4.D  5.C")).toBe(true);
  });

  it("matn ichidagi bitta juftlik kalit deb olinmaydi", () => {
    expect(isKeyBlock("1990-yilda B nuqtada harakat boshlandi")).toBe(false);
    expect(findAnswerKeys([candidate(1, "1990-yilda B nuqtada harakat boshlandi")])).toEqual([]);
  });

  it("nasriy matn tasodifan uchta juftlik bersa ham kalit emas — oraliq qamrovi past", () => {
    const prose =
      "1. Bosqichda A nuqtadan boshlanadi va uzoq vaqt davom etadi, " +
      "keyin 2. Bosqichda B nuqtaga yetadi, nihoyat 3. Bosqichda C nuqtada to'xtaydi";
    expect(isKeyBlock(prose)).toBe(false);
  });

  it("variant qatori kalit deb olinmaydi — harfdan keyingi yopuvchi qavs", () => {
    // Sonlari o'suvchi (1,2,3,4) va juftliklar zich — qavs tekshirilmasa
    // bu qator kalit bo'lib ko'rinardi.
    expect(isKeyBlock("1. A) 2 B) 3 C) 4 D) 5")).toBe(false);
    expect(isKeyBlock("A) 1,5 B) 2,5 C) 3,5 D) 4,5")).toBe(false);
  });

  it("kamayuvchi sonlar kalit emas", () => {
    expect(isKeyBlock("5. B 3. A 1. D")).toBe(false);
  });

  it("bitta raqamga ikki javob bergan blok — o'sha raqam tashlab yuboriladi", () => {
    // Sonlar o'suvchi bo'lishi shart, shuning uchun takror faqat oxirida
    // kelishi mumkin: "... 5.C 5.D" ni naqsh o'suvchi deb qabul qilmaydi,
    // ya'ni bunday blok umuman kalit bo'lmaydi.
    expect(isKeyBlock("1. B 2.C 3.D 3.A")).toBe(false);
  });
});

describe("extractInlineAnswer", () => {
  it("blok oxiridagi 'ans: B' topiladi va matndan olib tashlanadi", () => {
    const found = extractInlineAnswer("What is the speed of light?\nA) 1 B) 2 C) 3\nans: B");

    expect(found).not.toBeNull();
    expect(found!.letter).toBe("B");
    expect(found!.text).toBe("What is the speed of light?\nA) 1 B) 2 C) 3");
    expect(found!.text).not.toMatch(/ans/i);
  });

  it("nuqtasiz va katta harfli shakl ham", () => {
    expect(extractInlineAnswer("Question text ANS. D")!.letter).toBe("D");
  });

  it("matn o'rtasidagi 'ans' javob emas", () => {
    expect(extractInlineAnswer("ans: B is wrong, choose another")).toBeNull();
  });
});

describe("resolveAnswer", () => {
  it("o'sha betdagi kalit — kind: page-key", () => {
    const keys = findAnswerKeys([candidate(7, "1. B  2.A  3.D  4.C")]);

    expect(resolveAnswer(3, 7, keys)).toEqual({
      answer: { letter: "D", source: { page: 7, kind: "page-key" } },
      issue: null,
    });
  });

  it("keyingi betdagi jadval — kind: table, 3 betgacha", () => {
    const keys = findAnswerKeys([candidate(10, "1-B 2-A 3-D 4-E")]);

    expect(resolveAnswer(2, 8, keys).answer).toEqual({
      letter: "A",
      source: { page: 10, kind: "table" },
    });
    // 4 bet uzoqda — yetib bormaydi.
    expect(resolveAnswer(2, 6, keys)).toEqual({ answer: null, issue: "NO_KEY_FOUND" });
  });

  it("oldingi bet — faqat bitta betgacha", () => {
    const keys = findAnswerKeys([candidate(5, "1-B 2-A 3-D 4-E")]);

    expect(resolveAnswer(1, 6, keys).answer).toEqual({
      letter: "B",
      source: { page: 5, kind: "table" },
    });
    expect(resolveAnswer(1, 7, keys)).toEqual({ answer: null, issue: "NO_KEY_FOUND" });
  });

  it("raqamlar qayta boshlangan kitob — kalit TO'G'RI betdan olinadi", () => {
    // 20-betda 1..10, 21-betda yana 1..10. Global qidiruvda 21-betdagi
    // 3-savolga 20-betning javobi tushardi.
    const keys = findAnswerKeys([
      candidate(20, "1.A 2.A 3.A 4.A 5.A 6.A 7.A 8.A 9.A 10.A"),
      candidate(21, "1.E 2.E 3.E 4.E 5.E 6.E 7.E 8.E 9.E 10.E"),
    ]);

    expect(resolveAnswer(3, 21, keys).answer).toEqual({
      letter: "E",
      source: { page: 21, kind: "page-key" },
    });
    expect(resolveAnswer(3, 20, keys).answer).toEqual({
      letter: "A",
      source: { page: 20, kind: "page-key" },
    });
  });

  it("teng masofadagi ikki nomzod — KEY_AMBIGUOUS, taxmin qilinmaydi", () => {
    const keys = findAnswerKeys([
      candidate(9, "1-B 2-A 3-D 4-E"),
      candidate(11, "1-C 2-C 3-C 4-C"),
    ]);

    expect(resolveAnswer(2, 10, keys)).toEqual({ answer: null, issue: "KEY_AMBIGUOUS" });
  });

  it("bir betda ikkita kalit bloki bo'lsa ham KEY_AMBIGUOUS", () => {
    const keys = findAnswerKeys([candidate(4, "1-B 2-A 3-D"), candidate(4, "1-C 2-C 3-C")]);

    expect(resolveAnswer(1, 4, keys)).toEqual({ answer: null, issue: "KEY_AMBIGUOUS" });
  });

  it("kalit topilmasa NO_KEY_FOUND — yiqilmaydi", () => {
    expect(resolveAnswer(12, 1, [])).toEqual({ answer: null, issue: "NO_KEY_FOUND" });
    expect(resolveAnswer(null, 1, [])).toEqual({ answer: null, issue: "NO_KEY_FOUND" });
  });
});

describe("preamble va furniture qamrovi", () => {
  it("bet tepasidagi kalit qatori savol bloklarida YO'Q, lekin flattenBlocks uni beradi", () => {
    // Turkcha kitob: kalit qatori betning eng tepasida, savollardan oldin.
    // "CEVAP:" yorlig'i bor — aks holda qator "1." bilan boshlanib savol
    // boshi sifatida qabul qilinardi.
    const doc = manifest(
      page(20, [
        block(40, 60, "CEVAP: 1. B  2.B  3.D  4.D  5.C"),
        block(40, 120, "1. Birinchi savol"),
        block(40, 160, "2. Ikkinchi savol"),
        block(40, 200, "3. Uchinchi savol"),
      ]),
    );

    const grouped = groupIntoQuestions(doc);
    const questionTexts = grouped.questions.flatMap((q) => q.blocks.map((b) => b.text));
    expect(questionTexts.some((t) => t.startsWith("CEVAP"))).toBe(false);
    expect(grouped.preamble.map((b) => b.text)).toEqual(["CEVAP: 1. B  2.B  3.D  4.D  5.C"]);

    const keys = findAnswerKeys(flattenBlocks(doc));
    expect(keys).toHaveLength(1);
    expect(resolveAnswer(3, 20, keys).answer).toEqual({
      letter: "D",
      source: { page: 20, kind: "page-key" },
    });
  });

  it("kolontitul tasmasidagi kalit ham topiladi", () => {
    // Kolontitul tasmasi — sahifa balandligining 5% i (~42 pt).
    const doc = manifest(
      page(31, [
        block(40, 120, "1. Birinchi savol"),
        block(40, 160, "2. Ikkinchi savol"),
        block(40, H - 25, "1-A 2-E 3-C"),
      ]),
    );

    const grouped = groupIntoQuestions(doc);
    expect(grouped.furniture.map((b) => b.text)).toContain("1-A 2-E 3-C");

    const keys = findAnswerKeys(flattenBlocks(doc));
    expect(resolveAnswer(2, 31, keys).answer).toEqual({
      letter: "E",
      source: { page: 31, kind: "page-key" },
    });
  });
});
