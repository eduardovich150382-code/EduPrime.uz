import { describe, expect, it } from "vitest";
import { generateVariants, type Template } from "../paramgen/paramgen";
import templatesJson from "../paramgen/templates.json";

// `templates.json` — bazaga seed qilinadigan 68 ta REAL shablon (shundan 8
// tasi korpusga asoslangan — `src/lib/paramgen/corpora/`, batafsil
// `docs/TEMPLATES.md`da). Bu fayl matnli parametr generatori qo'shilgandan
// keyin ham hech biri buzilmaganini tekshiradi: har shablondan 10 tadan
// variant chiqarib, javob va distraktorlarning shakl jihatidan to'g'ri
// ekanini tasdiqlaydi. Mazmunan "yaxshi" ekanini emas — shakliy
// invariantlarni tekshiradi (buni chuqurroq `qaTemplate` qiladi, u alohida
// qo'lda ishga tushiriladi, CI'da emas).
const templates = templatesJson as unknown as Template[];

describe("templates.json — 68 ta mavjud shablon regressiyasi", () => {
  it("aynan 68 ta shablon bor (bu son o'zgarsa — ataylab ekanini bilib turing)", () => {
    expect(templates.length).toBe(68);
  });

  for (const t of templates) {
    it(`${t.id}: 10 ta variant — bitta to'g'ri javob, distraktorlar noyob va javobga teng emas`, () => {
      const variants = generateVariants(t, { count: 10, seed: 123 });
      expect(variants.length).toBeGreaterThan(0);

      for (const v of variants) {
        // Aynan bitta to'g'ri javob
        const correct = v.choices.filter((c) => c.correct);
        expect(correct).toHaveLength(1);

        // Distraktorlar to'g'ri javobga teng emas va o'zaro takrorlanmaydi
        const texts = v.choices.map((c) => c.text);
        expect(new Set(texts).size).toBe(texts.length);

        // Stem/solution'da to'ldirilmagan {param} qolmagan
        expect(v.stem).not.toContain("{");
        expect(v.solution).not.toContain("{");

        // Har savolda 4 ta variant, A,B,C,D tartibida kalitlangan
        expect(v.choices.map((c) => c.key)).toEqual(["A", "B", "C", "D"]);
      }

      // variantId'lar noyob (signature kolliziyasi yo'q)
      const ids = variants.map((v) => v.variantId);
      expect(new Set(ids).size).toBe(ids.length);
    });
  }
});
