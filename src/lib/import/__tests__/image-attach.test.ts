import { describe, expect, it } from "vitest";
import {
  addImage,
  applyPairs,
  pairStatus,
  removeImage,
  summarize,
  toMatchInput,
  unattached,
} from "../image-attach";
import { matchByOrder, type MapEntry, type Pair } from "../image-match";

interface Q {
  images: string[];
  text: string;
  options: { text: string }[];
  points: number;
}

function q(text: string, images: string[] = []): Q {
  return { text, images, options: [{ text: "1" }, { text: "2" }], points: 1 };
}

function entry(index: number, images: string[], numbers: string[] = []): MapEntry {
  return { index, order: index * 3, images, numbers };
}

function pair(index: number, images: string[], score: number | null, flagged = false): Pair {
  return { index, images, score, flagged };
}

const ENTRIES = [entry(0, ["u/a.png"]), entry(1, []), entry(2, ["u/b.png", "u/c.png"])];
const PAIRS = [pair(0, ["u/a.png"], 1), pair(1, [], null), pair(2, ["u/b.png", "u/c.png"], 0.8)];

describe("toMatchInput", () => {
  it("variantlarni matn massiviga aylantiradi", () => {
    expect(toMatchInput(q("Kuch 8 N"))).toEqual({ text: "Kuch 8 N", options: ["1", "2"] });
  });
});

describe("applyPairs", () => {
  it("juftlik rasmlarini yozadi va boshqa maydonlarni saqlaydi", () => {
    const next = applyPairs([q("a"), q("b"), q("c")], ENTRIES, PAIRS);
    expect(next.map((x) => x.images)).toEqual([["u/a.png"], [], ["u/b.png", "u/c.png"]]);
    expect(next.every((x) => x.points === 1)).toBe(true);
  });

  it("ikki marta chaqirilsa natija bir xil — URL takrorlanmaydi", () => {
    const once = applyPairs([q("a"), q("b"), q("c")], ENTRIES, PAIRS);
    const twice = applyPairs(once, ENTRIES, PAIRS);
    expect(twice).toEqual(once);
  });

  it("oldingi, jumladan qo'lda qilingan biriktirish ustiga yoziladi", () => {
    const manual = [q("a", ["u/c.png"]), q("b", ["u/b.png"]), q("c")];
    const next = applyPairs(manual, ENTRIES, PAIRS);
    expect(next.map((x) => x.images)).toEqual([["u/a.png"], [], ["u/b.png", "u/c.png"]]);
  });

  it("xaritada yo'q rasm (AI importniki) saqlanadi", () => {
    const next = applyPairs([q("a", ["ai/own.png"]), q("b"), q("c")], ENTRIES, PAIRS);
    expect(next[0].images).toEqual(["ai/own.png", "u/a.png"]);
  });

  it("o'zgarmagan savol o'sha obyekt bo'lib qaytadi", () => {
    const questions = [q("a"), q("b"), q("c")];
    expect(applyPairs(questions, ENTRIES, PAIRS)[1]).toBe(questions[1]);
  });

  it("soni mos kelmasa (countMismatch) hech narsa o'chirilmaydi", () => {
    const questions = [q("a", ["u/a.png"]), q("b")];
    const result = matchByOrder(ENTRIES, questions.map(toMatchInput));
    expect(result.countMismatch).toBe(true);
    expect(applyPairs(questions, ENTRIES, result.pairs)).toEqual(questions);
  });
});

describe("addImage / removeImage / unattached", () => {
  it("olib tashlangan rasm tasmaga qaytadi", () => {
    const attached = applyPairs([q("a"), q("b"), q("c")], ENTRIES, PAIRS);
    expect(unattached(ENTRIES, attached)).toEqual([]);

    const removed = removeImage(attached, 2, "u/b.png");
    expect(removed[2].images).toEqual(["u/c.png"]);
    expect(unattached(ENTRIES, removed)).toEqual(["u/b.png"]);
  });

  it("qo'lda qo'shish takrorlamaydi va tasmadan chiqaradi", () => {
    const start = [q("a"), q("b"), q("c")];
    expect(unattached(ENTRIES, start)).toEqual(["u/a.png", "u/b.png", "u/c.png"]);

    const once = addImage(start, 1, "u/b.png");
    const twice = addImage(once, 1, "u/b.png");
    expect(twice[1].images).toEqual(["u/b.png"]);
    expect(twice[0]).toBe(start[0]);
    expect(unattached(ENTRIES, twice)).toEqual(["u/a.png", "u/c.png"]);
  });

  it("savolda yo'q rasmni olib tashlash hech narsani o'zgartirmaydi", () => {
    const start = [q("a", ["u/a.png"])];
    expect(removeImage(start, 0, "u/zzz.png")[0]).toBe(start[0]);
  });
});

describe("pairStatus / summarize", () => {
  it("uch holat: null → unchecked, flagged → flagged, aks holda verified", () => {
    expect(pairStatus(pair(0, [], null))).toBe("unchecked");
    expect(pairStatus(pair(0, [], 0.4, true))).toBe("flagged");
    expect(pairStatus(pair(0, [], 0.5))).toBe("verified");
  });

  it("matchByOrder chegarasi bilan mos: 0.5 tekshirildi, undan pasti shubhali", () => {
    const entries = [entry(0, ["x"], ["1", "2"]), entry(1, ["y"], ["3", "4"])];
    const { pairs } = matchByOrder(entries, [
      { text: "1 va 9", options: [] },
      { text: "hech narsa", options: [] },
    ]);
    expect(pairs.map(pairStatus)).toEqual(["verified", "flagged"]);
  });

  it("unchecked faqat rasmi bor juftliklarni, flagged esa hammasini sanaydi", () => {
    const pairs = [
      pair(0, ["a"], null),
      pair(1, [], null),
      pair(2, [], 0.1, true),
      pair(3, ["b"], 0.2, true),
      pair(4, ["c"], 1),
    ];
    expect(summarize(pairs)).toEqual({ flagged: 2, unchecked: 1 });
  });
});
