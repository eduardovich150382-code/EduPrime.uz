import { describe, expect, it } from "vitest";
import {
  encodeMatchingAnswer,
  isMatchingCorrect,
  isMatchingRowCorrect,
  parseMatchingAnswer,
  parseMatchingPairs,
  shuffleMatchingIndexOrder,
  translateMatchingToCanonical,
} from "../matching";

describe("shuffleMatchingIndexOrder", () => {
  it("0..n-1 ning to'liq permutatsiyasini qaytaradi", () => {
    const order = shuffleMatchingIndexOrder(5, 99);
    expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
  });

  it("bir xil seed uchun bir xil tartibni qaytaradi", () => {
    const a = shuffleMatchingIndexOrder(6, 42);
    const b = shuffleMatchingIndexOrder(6, 42);
    expect(a).toEqual(b);
  });
});

describe("shuffleMatchingIndexOrder -> translateMatchingToCanonical aylanishi", () => {
  it("talaba HAMMA juftlikni to'g'ri tanlasa, canonical natija identity (to'g'ri) bo'ladi", () => {
    const pairCount = 4;
    const seed = 777;
    const indexOrder = shuffleMatchingIndexOrder(pairCount, seed);

    // Talaba har chap elementga (i) to'g'ri kelgan o'ng elementni tanlaydi:
    // o'ng element aralashtirilgan `indexOrder` massivida turibdi, shuning
    // uchun talaba i-chap uchun shuffledPos = indexOrder.indexOf(i) ni tanlaydi.
    const studentShuffledAnswer = Array.from({ length: pairCount }, (_, i) => indexOrder.indexOf(i));

    const canonical = translateMatchingToCanonical(studentShuffledAnswer, indexOrder);

    expect(canonical).toEqual([0, 1, 2, 3]);
    expect(isMatchingCorrect(canonical, pairCount)).toBe(true);
    for (let i = 0; i < pairCount; i++) {
      expect(isMatchingRowCorrect(canonical, i)).toBe(true);
    }
  });

  it("noto'g'ri javob noto'g'ri deb baholanadi", () => {
    const pairCount = 4;
    const indexOrder = shuffleMatchingIndexOrder(pairCount, 777);

    // To'g'ri javobni oldin hisoblab, keyin bitta juftlikni ataylab
    // almashtiramiz — natija noto'g'ri bo'lishi shart.
    const correctShuffledAnswer = Array.from({ length: pairCount }, (_, i) => indexOrder.indexOf(i));
    const wrongShuffledAnswer = [...correctShuffledAnswer];
    [wrongShuffledAnswer[0], wrongShuffledAnswer[1]] = [wrongShuffledAnswer[1], wrongShuffledAnswer[0]];

    const canonical = translateMatchingToCanonical(wrongShuffledAnswer, indexOrder);

    expect(isMatchingCorrect(canonical, pairCount)).toBe(false);
    expect(isMatchingRowCorrect(canonical, 0)).toBe(false);
    expect(isMatchingRowCorrect(canonical, 1)).toBe(false);
    // Tegilmagan qatorlar hamon to'g'ri
    expect(isMatchingRowCorrect(canonical, 2)).toBe(true);
    expect(isMatchingRowCorrect(canonical, 3)).toBe(true);
  });

  it("javob berilmagan (null) pozitsiya null bo'lib qoladi", () => {
    const indexOrder = shuffleMatchingIndexOrder(3, 5);
    const canonical = translateMatchingToCanonical([null, 0, null], indexOrder);
    expect(canonical[0]).toBeNull();
    expect(canonical[2]).toBeNull();
  });

  it("diapazondan tashqari pozitsiya null'ga aylanadi", () => {
    const indexOrder = shuffleMatchingIndexOrder(3, 5);
    const canonical = translateMatchingToCanonical([-1, 99], indexOrder);
    expect(canonical).toEqual([null, null]);
  });
});

describe("isMatchingCorrect", () => {
  it("pairCount 0 bo'lsa yoki uzunlik mos kelmasa noto'g'ri deb hisoblanadi", () => {
    expect(isMatchingCorrect([], 0)).toBe(false);
    expect(isMatchingCorrect([0, 1], 3)).toBe(false);
  });
});

describe("encodeMatchingAnswer / parseMatchingAnswer", () => {
  it("kodlash va yechish round-trip qiladi", () => {
    const original = [2, 0, null, 1];
    const encoded = encodeMatchingAnswer(original);
    const decoded = parseMatchingAnswer(encoded);
    expect(decoded).toEqual(original);
  });

  it("noto'g'ri yoki bo'sh JSON uchun bo'sh massiv qaytaradi", () => {
    expect(parseMatchingAnswer(null)).toEqual([]);
    expect(parseMatchingAnswer(undefined)).toEqual([]);
    expect(parseMatchingAnswer("not json")).toEqual([]);
    expect(parseMatchingAnswer('{"a":1}')).toEqual([]);
  });
});

describe("parseMatchingPairs", () => {
  it("to'g'ri formatdagi options'ni parse qiladi", () => {
    const pairs = parseMatchingPairs({ left: ["A", "B"], right: ["1", "2"] });
    expect(pairs).toEqual({ left: ["A", "B"], right: ["1", "2"] });
  });

  it("noto'g'ri yoki mos kelmaydigan formatda bo'sh natija qaytaradi", () => {
    expect(parseMatchingPairs(null)).toEqual({ left: [], right: [] });
    expect(parseMatchingPairs({ left: ["A"], right: ["1", "2"] })).toEqual({ left: [], right: [] });
    expect(parseMatchingPairs({})).toEqual({ left: [], right: [] });
  });
});
