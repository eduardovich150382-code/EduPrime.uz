import { describe, expect, it } from "vitest";
import { bandOf, valueOfBand, DEFAULT_BAND, DEFAULT_DIFFICULTY } from "../difficulty";

describe("bandOf — o'qishda bag'rikeng", () => {
  it("3 ta asosiy pog'ona", () => {
    expect(bandOf(2)).toBe("easy");
    expect(bandOf(3)).toBe("medium");
    expect(bandOf(4)).toBe("hard");
  });

  it("bazadagi ESKI chegara qiymatlari ham to'g'ri pog'onada ko'rinadi", () => {
    // Sxemada `Int?`, amalda 1 va 5 ham bor. Ular ko'rinmay qolsa ustoz
    // savolni ochganda pog'ona tanlanmagan bo'lib turadi.
    expect(bandOf(1)).toBe("easy");
    expect(bandOf(5)).toBe("hard");
  });

  it("diapazondan tashqaridagi qiymat xato emas — eng yaqin pog'onaga tushadi", () => {
    // AI yoki chatdan qo'yilgan JSON 0 yoki 99 yuborishi mumkin.
    expect(bandOf(0)).toBe("easy");
    expect(bandOf(99)).toBe("hard");
  });

  it("qiymat yo'q bo'lsa `null` — 'medium' EMAS", () => {
    // Bu farq muhim: `null` "ustoz tegmagan" degani. Uni shu yerda 'medium'
    // qilib qo'ysak, chaqiruvchi ustoz tegmagan savolga 3 yozib yuborardi.
    expect(bandOf(null)).toBeNull();
    expect(bandOf(undefined)).toBeNull();
    expect(bandOf(Number.NaN)).toBeNull();
  });
});

describe("valueOfBand — yozishda qat'iy", () => {
  it("faqat 2/3/4 yoziladi", () => {
    expect(valueOfBand("easy")).toBe(2);
    expect(valueOfBand("medium")).toBe(3);
    expect(valueOfBand("hard")).toBe(4);
  });

  it("yozilgan qiymat qaytib o'qilganda o'sha pog'onaga tushadi", () => {
    for (const band of ["easy", "medium", "hard"] as const) {
      expect(bandOf(valueOfBand(band))).toBe(band);
    }
  });

  it("`lib/sessions.ts` tanlash oraliqlariga tushadi", () => {
    // easy bias -> 1-2, advanced bias -> 3-5. Hech bir pog'ona chetda qolmasin.
    expect(valueOfBand("easy")).toBeLessThanOrEqual(2);
    expect(valueOfBand("medium")).toBeGreaterThanOrEqual(3);
    expect(valueOfBand("hard")).toBeLessThanOrEqual(5);
  });

  it("yangi savolning standart qiyinligi ko'rinadigan pog'ona bilan mos", () => {
    expect(bandOf(DEFAULT_DIFFICULTY)).toBe(DEFAULT_BAND);
  });
});

describe("ustoz tegmagan savol", () => {
  it("`bandOf` qiymatni O'ZGARTIRMAYDI — u faqat ko'rsatish uchun", () => {
    // Bazada 5 turgan savol "Qiyin" ko'rinadi, lekin ustoz tugmani bosmasa
    // saqlashda hamon 5 ketishi kerak: `bandOf` sof o'qish funksiyasi.
    const stored = 5;
    expect(bandOf(stored)).toBe("hard");
    expect(stored).toBe(5);
    // Ko'rinish uchun qo'llanadigan fallback ham qiymatga tegmaydi.
    expect(bandOf(null) ?? DEFAULT_BAND).toBe("medium");
  });
});
