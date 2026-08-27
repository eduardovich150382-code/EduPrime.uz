import { describe, expect, it } from "vitest";
import {
  computeItemDuplicateKey,
  normalizeTopicForMatch,
  normalizeWhitespace,
  topicMatchesNode,
} from "./backfill-sql-lib";

describe("normalizeWhitespace", () => {
  it("kichik harfga o'tkazadi va bo'shliqlarni siqadi", () => {
    expect(normalizeWhitespace("  Kvadrat   tenglama  ")).toBe("kvadrat tenglama");
  });

  it("apostroflarga tegmaydi (dublikat kaliti formulasi shunday)", () => {
    expect(normalizeWhitespace("O'zbekiston")).toBe("o'zbekiston");
  });
});

describe("computeItemDuplicateKey", () => {
  const subjectId = "subj_fizika";

  it("bir xil subject+text (registr/bo'shliq farqidan qat'i nazar)+correctAnswer uchun bir xil kalit beradi", () => {
    const a = computeItemDuplicateKey(subjectId, "Erkin tushish tezligi qanday?", "A");
    const b = computeItemDuplicateKey(subjectId, "  Erkin   TUSHISH tezligi qanday?  ", "A");
    expect(a).toBe(b);
  });

  it("har xil subjectId uchun har xil kalit beradi", () => {
    const a = computeItemDuplicateKey("subj_fizika", "Savol matni", "A");
    const b = computeItemDuplicateKey("subj_matematika", "Savol matni", "A");
    expect(a).not.toBe(b);
  });

  it("har xil text uchun har xil kalit beradi", () => {
    const a = computeItemDuplicateKey(subjectId, "Savol matni A", "A");
    const b = computeItemDuplicateKey(subjectId, "Savol matni B", "A");
    expect(a).not.toBe(b);
  });

  it("correctAnswer registri farq qilsa HAM har xil kalit beradi — SQL formulasi correctAnswer'ni normalizatsiya qilmaydi", () => {
    const a = computeItemDuplicateKey(subjectId, "Savol matni", "A");
    const b = computeItemDuplicateKey(subjectId, "Savol matni", "a");
    expect(a).not.toBe(b);
  });

  it("null correctAnswer'ni bo'sh satr sifatida ishlatadi", () => {
    const a = computeItemDuplicateKey(subjectId, "Savol matni", null);
    const b = computeItemDuplicateKey(subjectId, "Savol matni", "");
    expect(a).toBe(b);
  });
});

describe("normalizeTopicForMatch", () => {
  it("kichik harfga o'tkazadi, apostroflarni olib tashlaydi va bo'shliqlarni siqadi", () => {
    expect(normalizeTopicForMatch("  Kvadrat tenglama!  ")).toBe("kvadrat tenglama!");
    expect(normalizeTopicForMatch("O'zbekiston tarixi")).toBe("ozbekiston tarixi");
  });

  it("lotin apostrof variantlarini bir xillashtiradi", () => {
    const variants = ["O'zbekiston", "O‘zbekiston", "O’zbekiston", "Oʻzbekiston", "Oʼzbekiston"];
    const normalized = variants.map(normalizeTopicForMatch);
    expect(new Set(normalized).size).toBe(1);
    expect(normalized[0]).toBe("ozbekiston");
  });
});

describe("topicMatchesNode", () => {
  it("aynan bir xil (normallashtirilgandan keyin) matnlar uchun true qaytaradi", () => {
    expect(topicMatchesNode("Kvadrat tenglama", "kvadrat tenglama")).toBe(true);
  });

  it("apostrof va registr farqidan qat'i nazar mos keladi", () => {
    expect(topicMatchesNode("O'zbekiston tarixi", "O‘ZBEKISTON TARIXI")).toBe(true);
  });

  it("bo'shliq farqidan qat'i nazar mos keladi", () => {
    expect(topicMatchesNode("  Erkin  tushish  ", "erkin tushish")).toBe(true);
  });

  it("mos kelmagan matn uchun false qaytaradi — noaniq (fuzzy) moslashtirish yo'q", () => {
    expect(topicMatchesNode("Kvadrat tenglama", "Chiziqli tenglama")).toBe(false);
  });

  it("qisman mos kelish yetarli emas — to'liq moslik talab qilinadi", () => {
    expect(topicMatchesNode("Kvadrat", "Kvadrat tenglama")).toBe(false);
  });
});
