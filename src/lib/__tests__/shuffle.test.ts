import { describe, expect, it } from "vitest";
import { generateSeed, getShuffledQuestionIndices, shuffleArray } from "../shuffle";

describe("shuffleArray", () => {
  it("bir xil seed uchun bir xil natijani qaytaradi", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const a = shuffleArray(input, 42);
    const b = shuffleArray(input, 42);
    expect(a).toEqual(b);
  });

  it("boshqa seed odatda boshqa tartib beradi", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const a = shuffleArray(input, 1);
    const b = shuffleArray(input, 2);
    expect(a).not.toEqual(b);
  });

  it("asl massivni o'zgartirmaydi (mutatsiyasiz)", () => {
    const input = [1, 2, 3, 4, 5];
    const snapshot = [...input];
    shuffleArray(input, 7);
    expect(input).toEqual(snapshot);
  });

  it("barcha elementlarni saqlaydi — yo'qolmaydi, takrorlanmaydi", () => {
    const input = Array.from({ length: 50 }, (_, i) => i);
    const result = shuffleArray(input, 123);

    expect(result).toHaveLength(input.length);
    expect(new Set(result).size).toBe(input.length);
    expect([...result].sort((x, y) => x - y)).toEqual(input);
  });

  it("bo'sh va bir elementli massivlar bilan ham ishlaydi", () => {
    expect(shuffleArray([], 5)).toEqual([]);
    expect(shuffleArray(["yagona"], 5)).toEqual(["yagona"]);
  });

  it("10 000 marta aralashtirilganda har pozitsiya taxminan teng chastotada uchraydi", () => {
    const n = 6;
    const trials = 10_000;
    const input = Array.from({ length: n }, (_, i) => i);
    // positionCounts[originalValue][finalPosition]
    const counts: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

    for (let seed = 0; seed < trials; seed++) {
      const result = shuffleArray(input, seed);
      for (let pos = 0; pos < n; pos++) {
        counts[result[pos]][pos]++;
      }
    }

    const expected = trials / n; // har katakcha uchun kutilgan chastota
    // Oddiy chegara — chi-kvadrat emas, ±30% og'ish ruxsat etiladi. Nomuvofiq
    // taqqoslash funksiyasi bilan (Math.random() - 0.5) bu chegara ancha
    // keng buzilgan bo'lardi (ba'zi katakchalar 2x dan ko'proq farq qiladi).
    const tolerance = expected * 0.3;
    for (let value = 0; value < n; value++) {
      for (let pos = 0; pos < n; pos++) {
        expect(Math.abs(counts[value][pos] - expected)).toBeLessThan(tolerance);
      }
    }
  });
});

describe("generateSeed", () => {
  it("bir xil userId+testId uchun bir xil seed qaytaradi", () => {
    const a = generateSeed("user-1", "test-1");
    const b = generateSeed("user-1", "test-1");
    expect(a).toBe(b);
  });

  it("manfiy bo'lmagan butun son qaytaradi", () => {
    const seed = generateSeed("user-abc", "test-xyz");
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
  });

  it("boshqa userId yoki testId uchun odatda boshqa seed beradi", () => {
    const a = generateSeed("user-1", "test-1");
    const b = generateSeed("user-2", "test-1");
    const c = generateSeed("user-1", "test-2");
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("getShuffledQuestionIndices", () => {
  it("indekslarning to'liq permutatsiyasini qaytaradi", () => {
    const questions = [{ id: "q1" }, { id: "q2" }, { id: "q3" }, { id: "q4" }];
    const indices = getShuffledQuestionIndices(questions, "user-1", "test-1");

    expect([...indices].sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
  });

  it("bir xil user+test uchun izchil (reproducible) natija beradi", () => {
    const questions = [{ id: "q1" }, { id: "q2" }, { id: "q3" }, { id: "q4" }, { id: "q5" }];
    const a = getShuffledQuestionIndices(questions, "user-1", "test-1");
    const b = getShuffledQuestionIndices(questions, "user-1", "test-1");
    expect(a).toEqual(b);
  });
});
