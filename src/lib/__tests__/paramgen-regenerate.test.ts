import { describe, expect, it } from "vitest";
import { generateVariants, type Template } from "../paramgen/paramgen";
import templatesJson from "../paramgen/templates.json";
import { getDistractorWhy, getRegeneratedHints, regenerateVariant, toLang } from "../paramgen/regenerate";

/**
 * S20a — `regenerate.ts` `seed.ts` bilan AYNAN bir xil parametrlar (seed:
 * 42, count: 200) bilan qayta hisoblab, saqlangan `variantSig`ga mos
 * variantni topishi kerak. Haqiqiy `templates.json`dan foydalanamiz —
 * mock shablon ishlatsak, "seed.ts bilan mos keladimi" degan asosiy
 * savolni sinamagan bo'lardik.
 */
const templates = templatesJson as unknown as Template[];
const template = templates.find((t) => t.id === "fiz-kinematika-erkin-tushish-01")!;
const seeded = generateVariants(template, { count: template.seedCount ?? 200, seed: 42, lang: "uz" });
const sample = seeded[0];

describe("regenerateVariant", () => {
  it("saqlangan variantSig'ga mos asl variantni topadi", () => {
    const regenerated = regenerateVariant(template.id, sample.variantId, "uz");
    expect(regenerated).not.toBeNull();
    expect(regenerated?.stem).toBe(sample.stem);
    expect(regenerated?.hints).toEqual(sample.hints);
  });

  it("noto'g'ri variantSig uchun null qaytaradi", () => {
    expect(regenerateVariant(template.id, "bunday-variant-yoq", "uz")).toBeNull();
  });

  it("noma'lum templateId uchun null qaytaradi (shablon o'chirilgan/o'zgargan holat)", () => {
    expect(regenerateVariant("bunday-shablon-yoq", "x", "uz")).toBeNull();
  });
});

describe("getDistractorWhy", () => {
  it("foydalanuvchi tanlagan noto'g'ri variantning why izohini qaytaradi", () => {
    const wrongChoice = sample.choices.find((c) => !c.correct)!;
    const why = getDistractorWhy(template.id, sample.variantId, "uz", wrongChoice.key);
    expect(why).toBeTruthy();
    expect(why).toBe(wrongChoice.why?.uz);
  });

  it("to'g'ri javob tanlangan bo'lsa null qaytaradi (distraktor emas)", () => {
    const correctChoice = sample.choices.find((c) => c.correct)!;
    expect(getDistractorWhy(template.id, sample.variantId, "uz", correctChoice.key)).toBeNull();
  });

  it("variantSig topilmasa null qaytaradi, xato tashlamaydi", () => {
    expect(getDistractorWhy(template.id, "eskirgan-variant", "uz", "A")).toBeNull();
  });
});

describe("getRegeneratedHints", () => {
  it("shablonning ko'rsatmalarini qaytaradi", () => {
    const hints = getRegeneratedHints(template.id, sample.variantId, "uz");
    expect(hints).toEqual(sample.hints);
    expect(hints.length).toBeGreaterThan(0);
  });

  it("topilmasa bo'sh massiv qaytaradi, sahifani yiqitmaydi", () => {
    expect(getRegeneratedHints("bunday-shablon-yoq", "x", "uz")).toEqual([]);
  });
});

describe("toLang", () => {
  it("uz/ru/en'ni o'zgarishsiz qaytaradi, boshqa hamma narsa uchun uz'ga tushadi", () => {
    expect(toLang("ru")).toBe("ru");
    expect(toLang("en")).toBe("en");
    expect(toLang("uz")).toBe("uz");
    expect(toLang("qaqozg'ki")).toBe("uz");
    expect(toLang(null)).toBe("uz");
    expect(toLang(undefined)).toBe("uz");
  });
});
