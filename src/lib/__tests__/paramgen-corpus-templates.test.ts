import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { generateVariants, type Template } from "../paramgen/paramgen";
import templatesJson from "../paramgen/templates.json";

/**
 * `docs/TEMPLATES.md`da tasvirlangan 8 ta korpusga asoslangan shablonni
 * (`src/lib/paramgen/corpora/*.json`) tekshiradi — `paramgen-templates.test.ts`
 * faqat SHAKLIY invariantlarni ko'radi (bitta to'g'ri javob, distraktorlar
 * noyob va h.k.). Bu fayl esa har variantning javobi korpusning o'zidagi
 * mos qatorga — MAZMUNAN — to'g'ri kelishini tasdiqlaydi: agar kimdir
 * korpus faylini yoki shablon `answer.fromParam`/`distractors.fromColumn`
 * ko'rsatmasini xato o'zgartirsa, shakliy tekshiruv o'tishi mumkin, lekin
 * bu test tutib qoladi.
 */

const CORPORA_DIR = path.join(__dirname, "..", "paramgen", "corpora");
const templates = templatesJson as unknown as Template[];

interface Corpus {
  id: string;
  columns: string[];
  rows: (number | string)[][];
}

function loadCorpus(id: string): Corpus {
  return JSON.parse(fs.readFileSync(path.join(CORPORA_DIR, `${id}.json`), "utf8"));
}

/** Korpus qatorlarini `{ustunNomi: qiymat}` obyektlariga aylantiradi — scope bilan solishtirish qulay bo'lishi uchun */
function rowsAsRecords(corpus: Corpus): Record<string, number | string>[] {
  return corpus.rows.map((row) => {
    const rec: Record<string, number | string> = {};
    corpus.columns.forEach((col, i) => (rec[col] = row[i]));
    return rec;
  });
}

const VARIANTS_PER_TEMPLATE = 20;

/** id -> qaysi korpusdan foydalanishi kutiladi va answer.fromParam qaysi ustunga ishora qilishi kerak */
const EXPECTED: Record<string, { corpus: string; answerColumn: string }> = {
  "tarix-voqea-yil-01": { corpus: "tarix-voqealar", answerColumn: "yil" },
  "tarix-voqea-shaxs-01": { corpus: "tarix-voqealar", answerColumn: "shaxs" },
  "tarix-voqea-joy-01": { corpus: "tarix-voqealar", answerColumn: "joy" },
  "onatili-soz-turkum-01": { corpus: "onatili-soz-turkum", answerColumn: "turkum" },
  "onatili-soz-turkum-matnda-01": { corpus: "onatili-soz-turkum", answerColumn: "turkum" },
  "biologiya-organ-tizim-01": { corpus: "biologiya-organ", answerColumn: "tizim" },
  "biologiya-organ-vazifa-01": { corpus: "biologiya-organ", answerColumn: "vazifa" },
  "biologiya-vazifa-organ-01": { corpus: "biologiya-organ", answerColumn: "organ" },
};

describe("Korpusga asoslangan 8 ta shablon — docs/TEMPLATES.md", () => {
  it("templates.json aynan shu 8 ta shablonni o'z ichiga oladi", () => {
    const ids = templates.map((t) => t.id);
    for (const id of Object.keys(EXPECTED)) {
      expect(ids).toContain(id);
    }
  });

  for (const [id, { corpus: corpusId, answerColumn }] of Object.entries(EXPECTED)) {
    describe(id, () => {
      const template = templates.find((t) => t.id === id)!;
      const corpus = loadCorpus(corpusId);
      const corpusRows = rowsAsRecords(corpus);

      it("shablon topilgan va shu korpusga ishora qiladi", () => {
        expect(template).toBeDefined();
        const setParam = template.params.find((p) => p.type === "set");
        expect(setParam && "corpus" in setParam ? setParam.corpus : undefined).toBe(corpusId);
      });

      it(`${VARIANTS_PER_TEMPLATE} ta variantning har biri korpusdagi mos qatorga mazmunan to'g'ri keladi`, () => {
        const variants = generateVariants(template, { count: VARIANTS_PER_TEMPLATE, seed: 7 });
        expect(variants.length).toBeGreaterThan(0);

        for (const v of variants) {
          // Variant qaysi korpus qatoridan kelganini scope orqali topamiz —
          // barcha ustunlar (javob bergan ustun ham) mos kelishi kerak.
          const matchingRow = corpusRows.find((row) =>
            corpus.columns.every((col) => row[col] === v.scope[col])
          );
          expect(matchingRow, `scope korpusdagi hech qanday qatorga to'liq mos kelmadi: ${JSON.stringify(v.scope)}`).toBeDefined();

          // To'g'ri javob — aynan shu qatordagi answerColumn qiymati
          expect(v.answerValue).toBe(matchingRow![answerColumn]);
          const correctChoice = v.choices.find((c) => c.correct)!;
          expect(correctChoice.text).toBe(String(matchingRow![answerColumn]));

          // Distraktorlar to'g'ri javobdan farqli va o'zaro noyob (fromColumn strategiyalari)
          const wrongTexts = v.choices.filter((c) => !c.correct).map((c) => c.text);
          expect(new Set(wrongTexts).size).toBe(wrongTexts.length);
          expect(wrongTexts).not.toContain(correctChoice.text);

          // Stem/solution to'liq to'ldirilgan
          expect(v.stem).not.toContain("{");
          expect(v.solution).not.toContain("{");
        }
      });
    });
  }
});
