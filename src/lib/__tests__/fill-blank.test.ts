import { describe, expect, it } from "vitest";
import {
  countFillBlanks,
  encodeFillBlankAnswer,
  encodeFillBlankCorrectAnswer,
  isFillBlankCorrect,
  isFillBlankIndexCorrect,
  parseFillBlankAnswer,
  parseFillBlankCorrectAnswer,
  splitFillBlankText,
} from "../fill-blank";

describe("splitFillBlankText / countFillBlanks", () => {
  it("bir nechta bo'shliqni to'g'ri sanaydi", () => {
    const text = "___ + ___ = ___";
    expect(countFillBlanks(text)).toBe(3);
    expect(splitFillBlankText(text)).toEqual(["", " + ", " = ", ""]);
  });

  it("bo'shliqsiz matnda 0 qaytaradi", () => {
    expect(countFillBlanks("bo'shliqsiz matn")).toBe(0);
  });
});

describe("isFillBlankIndexCorrect", () => {
  const accepted = [["Toshkent", "toshkent shahri"], ["1991"]];

  it("katta-kichik harfni e'tiborga olmaydi", () => {
    expect(isFillBlankIndexCorrect(["TOSHKENT", ""], accepted, 0)).toBe(true);
    expect(isFillBlankIndexCorrect(["toshkent", ""], accepted, 0)).toBe(true);
  });

  it("ortiqcha bo'shliqlarni e'tiborga olmaydi", () => {
    expect(isFillBlankIndexCorrect(["  Toshkent  ", ""], accepted, 0)).toBe(true);
  });

  it("qabul qilinadigan variantlar orasida bo'lmasa noto'g'ri", () => {
    expect(isFillBlankIndexCorrect(["Samarqand", ""], accepted, 0)).toBe(false);
  });

  it("bo'sh javob har doim noto'g'ri", () => {
    expect(isFillBlankIndexCorrect(["", ""], accepted, 0)).toBe(false);
    expect(isFillBlankIndexCorrect(["   ", ""], accepted, 0)).toBe(false);
  });

  it("shu indeks uchun qabul qilinadigan javoblar bo'lmasa noto'g'ri", () => {
    expect(isFillBlankIndexCorrect(["hech narsa"], [], 0)).toBe(false);
  });
});

describe("isFillBlankCorrect", () => {
  const accepted = [["Toshkent"], ["1991"], ["mustaqillik"]];

  it("barcha bo'shliqlar to'g'ri bo'lsa butun savol to'g'ri", () => {
    expect(isFillBlankCorrect(["Toshkent", "1991", "Mustaqillik"], accepted)).toBe(true);
  });

  it("bitta bo'shliq xato bo'lsa butun savol xato", () => {
    expect(isFillBlankCorrect(["Toshkent", "1990", "Mustaqillik"], accepted)).toBe(false);
  });

  it("hamma bo'shliq xato bo'lsa xato", () => {
    expect(isFillBlankCorrect(["x", "y", "z"], accepted)).toBe(false);
  });

  it("qabul qilinadigan javoblar ro'yxati bo'sh bo'lsa noto'g'ri deb hisoblanadi", () => {
    expect(isFillBlankCorrect(["Toshkent"], [])).toBe(false);
  });
});

describe("encode/parse round-trip", () => {
  it("to'g'ri javoblar ro'yxati uchun round-trip qiladi", () => {
    const original = [["Toshkent", "toshkent shahri"], ["1991"]];
    const decoded = parseFillBlankCorrectAnswer(encodeFillBlankCorrectAnswer(original));
    expect(decoded).toEqual(original);
  });

  it("talaba javobi uchun round-trip qiladi", () => {
    const original = ["Toshkent", "1991"];
    const decoded = parseFillBlankAnswer(encodeFillBlankAnswer(original));
    expect(decoded).toEqual(original);
  });

  it("noto'g'ri yoki bo'sh JSON uchun bo'sh massiv qaytaradi", () => {
    expect(parseFillBlankCorrectAnswer(null)).toEqual([]);
    expect(parseFillBlankCorrectAnswer("not json")).toEqual([]);
    expect(parseFillBlankAnswer(undefined)).toEqual([]);
    expect(parseFillBlankAnswer("{}")).toEqual([]);
  });
});
