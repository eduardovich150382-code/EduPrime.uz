import { describe, expect, it } from "vitest";
import { draftNumbersOf, matchByOrder, type MapEntry, type MatchInput } from "../image-match";

function entry(index: number, images: string[] = [], numbers: string[] = []): MapEntry {
  return { index, order: index * 3, images, numbers };
}

function question(text: string, options: string[] = []): MatchInput {
  return { text, options };
}

describe("matchByOrder", () => {
  it("teng sonli oddiy holat: har rasm o'z indeksiga tushadi", () => {
    const entries = [entry(0, ["a.png"], ["8"]), entry(1, ["b.png", "c.png"], ["37"])];
    const result = matchByOrder(entries, [question("Kuch 8 N"), question("Massa 37 kg")]);

    expect(result.countMismatch).toBe(false);
    expect(result.pairs).toEqual([
      { index: 0, images: ["a.png"], score: 1, flagged: false },
      { index: 1, images: ["b.png", "c.png"], score: 1, flagged: false },
    ]);
    expect(result.leftover).toEqual([]);
    expect(result.attached).toBe(3);
  });

  it("sonlar teng emas → countMismatch, pairs bo'sh, rasmlilar leftover da", () => {
    const entries = [entry(0, ["a.png"]), entry(1), entry(2, ["b.png"])];
    const result = matchByOrder(entries, [question("bir"), question("ikki")]);

    expect(result.countMismatch).toBe(true);
    expect(result.pairs).toEqual([]);
    expect(result.leftover.map((e) => e.index)).toEqual([0, 2]);
    expect(result.attached).toBe(0);
  });

  it("rasmsiz draftlar tartibni SILJITMAYDI", () => {
    const entries = [0, 1, 2, 3, 4, 5].map((i) => entry(i, i === 5 ? ["besh.png"] : []));
    const questions = entries.map((_, i) => question(`savol ${i}`));

    const result = matchByOrder(entries, questions);

    expect(result.pairs[5]).toMatchObject({ index: 5, images: ["besh.png"] });
    expect(result.pairs.slice(0, 5).every((p) => p.images.length === 0)).toBe(true);
    expect(result.leftover).toEqual([]);
    expect(result.attached).toBe(1);
  });

  it("sonlar mos kelmagan juftlik flagged, lekin rasm baribir biriktirilgan", () => {
    const result = matchByOrder([entry(0, ["a.png"], ["8", "37", "0.6"])], [question("Tezlik 12 m/s", ["5", "0,6"])]);

    expect(result.pairs[0].score).toBeCloseTo(1 / 3);
    expect(result.pairs[0].flagged).toBe(true);
    expect(result.pairs[0].images).toEqual(["a.png"]);
    expect(result.attached).toBe(1);
  });

  it("variantdagi sonlar ham hisobga olinadi", () => {
    const result = matchByOrder([entry(0, [], ["8", "0.6"])], [question("Kuch 8 N", ["0,6", "0,8"])]);
    expect(result.pairs[0]).toMatchObject({ score: 1, flagged: false });
  });

  it("ball multiset bo'yicha: bitta son ikki marta hisoblanmaydi", () => {
    const result = matchByOrder([entry(0, [], ["2", "2"])], [question("2 ta olma")]);
    expect(result.pairs[0].score).toBe(0.5);
    expect(result.pairs[0].flagged).toBe(false);
  });

  it("draftda son yo'q → score null, bayroq yo'q", () => {
    const result = matchByOrder([entry(0, ["a.png"], [])], [question("Hech qanday son 42")]);
    expect(result.pairs[0]).toEqual({ index: 0, images: ["a.png"], score: null, flagged: false });
  });

  it("bo'sh kirish → bo'sh natija", () => {
    expect(matchByOrder([], [])).toEqual({ countMismatch: false, pairs: [], leftover: [], attached: 0 });
  });

  it("kirishni o'zgartirmaydi va har chaqiruvda bir xil natija", () => {
    const entries = [entry(0, ["a.png"], ["8"]), entry(1, ["b.png"], ["9"])];
    const questions = [question("8"), question("7")];
    const before = structuredClone({ entries, questions });

    const first = matchByOrder(entries, questions);
    first.pairs[0].images.push("buzildi.png");
    const second = matchByOrder(entries, questions);

    expect({ entries, questions }).toEqual(before);
    expect(second.pairs[0].images).toEqual(["a.png"]);
    expect(matchByOrder(entries, [questions[0]]).leftover[0]).not.toBe(entries[0]);
  });
});

describe("draftNumbersOf", () => {
  it("savol raqami BIR marta olib tashlanadi", () => {
    expect(draftNumbersOf("8. Kuch 8 N va 37 kg", 8)).toEqual(["37", "8"]);
  });

  it("rasm tokeni ichidagi raqamlar son emas", () => {
    expect(draftNumbersOf("Rasmga qarang [[IMG:cmu2gfe670005lc0438g6uky5]] 5 m", null)).toEqual(["5"]);
  });

  it("raqam son bo'lmasa hech narsa olib tashlanmaydi", () => {
    expect(draftNumbersOf("3 va 4", "3")).toEqual(["3", "4"]);
  });
});
