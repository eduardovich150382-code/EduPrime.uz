import { describe, expect, it } from "vitest";
import { computeItemStats, topDistractor, MIN_ATTEMPTS_FOR_STATS, type AttemptForStats } from "../item-stats";

/**
 * Barcha kutilgan qiymatlar QO'LDA hisoblangan (S27 qabul mezoni) — pastdagi
 * izohlarda hisob-kitob ko'rsatilgan, testda faqat natija tekshiriladi.
 */

describe("computeItemStats", () => {
  it(`${MIN_ATTEMPTS_FOR_STATS - 1} urinishda (chegaradan kam) null qaytaradi`, () => {
    const attempts: AttemptForStats[] = Array.from({ length: MIN_ATTEMPTS_FOR_STATS - 1 }, (_, i) => ({
      isCorrect: true,
      answer: "A",
      timeSpentSec: 10,
      percentage: 100 - i,
    }));
    expect(computeItemStats(attempts)).toBeNull();
  });

  it("aynan 20 urinishda (chegaraning o'zi) hisoblaydi — qo'lda hisoblangan pValue/discrimination/avgTimeSec/distractorHits", () => {
    // 20 urinish, percentage 100dan 5gacha 5 qadam bilan kamayadi (talabaning
    // UMUMIY natijasi bo'yicha kuchli->zaif tartiblangan).
    // groupSize = round(20 * 0.27) = round(5.4) = 5 -> yuqori 5 va quyi 5.
    //
    // Yuqori 5 (percentage 100,95,90,85,80): HAMMASI to'g'ri -> topCorrectRate = 5/5 = 1.0
    // O'rta 10 (percentage 75..30): 3 tasi to'g'ri (75,70,65), 7 tasi noto'g'ri (60,55,50,45,40,35,30)
    // Quyi 5 (percentage 25,20,15,10,5): HAMMASI noto'g'ri -> bottomCorrectRate = 0/5 = 0.0
    //
    // discrimination = 1.0 - 0.0 = 1.0
    // correct = 5 (yuqori) + 3 (o'rta) + 0 (quyi) = 8 -> pValue = 8/20 = 0.4
    // timeSpentSec = 1..20 (index+1) -> yig'indi = 210 -> avgTimeSec = 210/20 = 10.5
    // Noto'g'ri javoblar: o'rtadagi 7 tadan 4 tasi "B", 3 tasi "C"; quyidagi 5 tasi "D"
    // -> distractorHits = { B: 4, C: 3, D: 5 }
    const attempts: AttemptForStats[] = [];
    for (let i = 0; i < 20; i++) {
      const percentage = 100 - i * 5;
      let isCorrect: boolean;
      let answer: string;
      if (i < 5) {
        isCorrect = true;
        answer = "A";
      } else if (i < 15) {
        const middleIndex = i - 5; // 0..9
        isCorrect = middleIndex < 3;
        answer = isCorrect ? "A" : middleIndex - 3 < 4 ? "B" : "C";
      } else {
        isCorrect = false;
        answer = "D";
      }
      attempts.push({ isCorrect, answer, timeSpentSec: i + 1, percentage });
    }

    const result = computeItemStats(attempts);
    expect(result).not.toBeNull();
    expect(result!.attemptCount).toBe(20);
    expect(result!.correct).toBe(8);
    expect(result!.pValue).toBeCloseTo(0.4);
    expect(result!.discrimination).toBeCloseTo(1.0);
    expect(result!.avgTimeSec).toBeCloseTo(10.5);
    expect(result!.distractorHits).toEqual({ B: 4, C: 3, D: 5 });
  });

  it("kuchli va zaif talabani baravar ajratmaydigan savol uchun diskriminatsiya 0", () => {
    // groupSize=5 — har 5 talikda aynan 2 tasi to'g'ri (i%5<2) takrorlanadi,
    // shuning uchun yuqori 5 (index 0-4) VA quyi 5 (index 15-19) ikkalasi
    // ham AYNAN 2/5=0.4 to'g'ri javob ulushiga ega -> discrimination = 0.
    const attempts: AttemptForStats[] = Array.from({ length: 20 }, (_, i) => ({
      isCorrect: i % 5 < 2,
      answer: i % 5 < 2 ? "A" : "B",
      timeSpentSec: 5,
      percentage: 100 - i * 5,
    }));
    const result = computeItemStats(attempts);
    expect(result!.discrimination).toBeCloseTo(0);
  });

  it("to'g'ri javoblar distractorHits'ga kirmaydi", () => {
    const attempts: AttemptForStats[] = Array.from({ length: 20 }, () => ({
      isCorrect: true,
      answer: "A",
      timeSpentSec: 1,
      percentage: 100,
    }));
    const result = computeItemStats(attempts);
    expect(result!.distractorHits).toEqual({});
  });
});

describe("topDistractor", () => {
  it("eng ko'p tanlangan noto'g'ri variantni qaytaradi", () => {
    expect(topDistractor({ B: 4, C: 7, D: 2 })).toEqual({ answer: "C", count: 7 });
  });

  it("bo'sh yoki mavjud bo'lmagan holatda null qaytaradi", () => {
    expect(topDistractor({})).toBeNull();
    expect(topDistractor(null)).toBeNull();
    expect(topDistractor(undefined)).toBeNull();
  });
});
