import { describe, expect, it } from "vitest";
import { normalizeTopicText, topicMatchesNodeOrAlias } from "./topic-match";

describe("normalizeTopicText", () => {
  it("katta-kichik harfni bir xillashtiradi", () => {
    expect(normalizeTopicText("Kvadrat tenglama")).toBe(normalizeTopicText("kvadrat tenglama"));
    expect(normalizeTopicText("KVADRAT TENGLAMA")).toBe("kvadrat tenglama");
  });

  it("turli apostrof belgilarini bir xil natijaga keltiradi ('  '  ʻ ʼ)", () => {
    const variants = ["O'zbekiston", "O‘zbekiston", "O’zbekiston", "Oʻzbekiston", "Oʼzbekiston"];
    const normalized = variants.map(normalizeTopicText);
    expect(new Set(normalized).size).toBe(1);
    expect(normalized[0]).toBe("ozbekiston");
  });

  it("ketma-ket bo'shliqlarni bittaga siqadi va boshi/oxiridagilarni olib tashlaydi", () => {
    expect(normalizeTopicText("  Kvadrat   tenglama  ")).toBe("kvadrat tenglama");
  });
});

describe("topicMatchesNodeOrAlias", () => {
  it("topic nameUz bilan (normallashtirilgan holda) mos kelsa true qaytaradi", () => {
    expect(topicMatchesNodeOrAlias("Kvadrat tenglama", "kvadrat tenglama", [])).toBe(true);
    expect(topicMatchesNodeOrAlias("  KVADRAT TENGLAMA  ", "Kvadrat tenglama", [])).toBe(true);
  });

  it("topic aliases massividagi biror qiymat bilan mos kelsa true qaytaradi", () => {
    expect(
      topicMatchesNodeOrAlias("Algebraik ifodalar", "Algebra", ["Algebraik ifodalar", "Tenglamalar"])
    ).toBe(true);
  });

  it("na nameUz, na aliases bilan mos kelmasa false qaytaradi", () => {
    expect(topicMatchesNodeOrAlias("Geometriya", "Algebra", ["Algebraik ifodalar"])).toBe(false);
  });

  it("alias solishtiruvi ham apostrof/registrga sezgir emas", () => {
    expect(topicMatchesNodeOrAlias("ozbekiston tarixi", "Tarix", ["O'zbekiston tarixi"])).toBe(true);
    expect(topicMatchesNodeOrAlias("O‘ZBEKISTON TARIXI", "Tarix", ["o'zbekiston tarixi"])).toBe(true);
  });

  it("bo'sh aliases massivi bilan xato bermaydi, faqat nameUz bilan solishtiradi", () => {
    expect(topicMatchesNodeOrAlias("Boshqa mavzu", "Algebra", [])).toBe(false);
  });
});
