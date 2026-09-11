import { describe, expect, it } from "vitest";
import {
  flattenBlocks,
  groupIntoQuestions,
  questionText,
  toUploadGroup,
  type QuestionDraft,
} from "../grouping";
import { parseManifest, type Manifest, type ManifestBlock, type ManifestImage, type ManifestPage } from "../manifest";
import fixture from "./fixtures/manifest-innova-p23.json";

// A4, PDF nuqtalarida — fikstura bilan bir xil.
const W = 595.32;
const H = 841.92;

// Ustunlar Innova to'plamidagidek: chap x=28, o'ng x=312.
const LEFT = 28;
const RIGHT = 312;

function block(x: number, y: number, text: string, w = 250, h = 20): ManifestBlock {
  return { order: 0, bbox: { x, y, w, h }, text };
}

function image(x: number, y: number, file: string, w = 80, h = 60): ManifestImage {
  return { order: 0, bbox: { x, y, w, h }, file };
}

/**
 * `order` PyMuPDF `sort=True` dagidek (y, keyin x) qo'yiladi — ya'ni ikki
 * ustun ARALASH. Guruhlash unga tayansa testlar yiqiladi.
 */
function page(n: number, blocks: ManifestBlock[], images: ManifestImage[] = []): ManifestPage {
  const byYX = <T extends { bbox: { x: number; y: number } }>(items: T[]): T[] =>
    [...items].sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x).map((item, order) => ({ ...item, order }));
  return { page: n, width: W, height: H, blocks: byYX(blocks), images: byYX(images) };
}

function manifest(...pages: ManifestPage[]): Manifest {
  return { version: 1, kind: "auto", sourceFile: "test.pdf", sourceLang: "uz", pageCount: pages.length, pages };
}

function byNumber(questions: QuestionDraft[], n: number): QuestionDraft {
  const q = questions.find((x) => x.number === n);
  if (!q) throw new Error(`${n}-savol topilmadi`);
  return q;
}

function texts(q: QuestionDraft): string[] {
  return q.blocks.map((b) => b.text);
}

function files(q: QuestionDraft): string[] {
  return q.images.map((i) => i.file);
}

describe("groupIntoQuestions — sintetik hujjat", () => {
  it("bir ustunli 2 sahifa, 6 savol — hammasi tartib bilan, hech biri yo'qolmaydi", () => {
    const onePage = (n: number, first: number) =>
      page(
        n,
        [0, 1, 2].flatMap((i) => [
          block(40, 100 + i * 200, `${first + i}. Savol matni`, 500),
          block(40, 130 + i * 200, "A) 1. B) 2. C) 3. D) 4.", 500),
        ]),
      );

    const doc = groupIntoQuestions(manifest(onePage(1, 1), onePage(2, 4)));

    expect(doc.questions.map((q) => q.number)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(doc.questions.every((q) => q.blocks.length === 2)).toBe(true);
    expect(doc.preamble).toEqual([]);
    const indexes = flattenBlocks(manifest(onePage(1, 1), onePage(2, 4))).map((b) => b.globalIndex);
    expect(indexes).toEqual(indexes.map((_, i) => i));
  });

  it("chap ustun oxirida boshlangan savol o'ng ustun tepasida davom etadi — bitta savol", () => {
    const doc = groupIntoQuestions(
      manifest(
        page(1, [
          block(LEFT, 100, "1. Birinchi savol"),
          block(LEFT, 130, "A) 1. B) 2."),
          block(LEFT, 700, "2. Chap ustun oxirida boshlangan savol"),
          block(RIGHT, 100, "o'ng ustunda davom etgan shart"),
          block(RIGHT, 130, "A) 5. B) 6."),
          block(RIGHT, 300, "3. Uchinchi savol"),
        ]),
      ),
    );

    expect(doc.questions.map((q) => q.number)).toEqual([1, 2, 3]);
    const q2 = byNumber(doc.questions, 2);
    expect(texts(q2)).toEqual(["2. Chap ustun oxirida boshlangan savol", "o'ng ustunda davom etgan shart", "A) 5. B) 6."]);
    expect(q2.spansPages).toBe(false);
    expect(texts(byNumber(doc.questions, 1))).toEqual(["1. Birinchi savol", "A) 1. B) 2."]);
  });

  it("sahifa oxirida boshlangan savol keyingi sahifada tugaydi — spansPages", () => {
    const doc = groupIntoQuestions(
      manifest(
        page(7, [block(40, 100, "1. Savol", 500), block(40, 760, "2. Sahifa oxiridagi savol", 500)]),
        page(8, [block(40, 60, "A) 1. B) 2. C) 3.", 500), block(40, 120, "3. Keyingi savol", 500)]),
      ),
    );

    const q2 = byNumber(doc.questions, 2);
    expect(texts(q2)).toEqual(["2. Sahifa oxiridagi savol", "A) 1. B) 2. C) 3."]);
    expect(q2).toMatchObject({ startPage: 7, endPage: 8, spansPages: true });
    expect(byNumber(doc.questions, 1)).toMatchObject({ startPage: 7, endPage: 7, spansPages: false });
    expect(byNumber(doc.questions, 3)).toMatchObject({ startPage: 8, endPage: 8, spansPages: false });
  });

  it("birinchi savoldan oldingi sarlavha preamble'ga, kolontitul furniture'ga tushadi", () => {
    const doc = groupIntoQuestions(
      manifest(
        page(1, [
          block(40, 10, "~ 1 ~ Nashriyot", 500, 16),
          block(40, 60, "FIZIKA. 1-bob. Kinematika", 500),
          block(40, 90, "Mundarija: 1-bob ... 3", 500),
          block(40, 150, "1. Birinchi savol", 500),
          block(40, 815, "Innova o'quv markazi", 500, 16),
        ]),
        page(2, [block(40, 10, "~ 2 ~ Nashriyot", 500, 16), block(40, 100, "A) 1. B) 2.", 500)]),
      ),
    );

    expect(doc.preamble.map((b) => b.text)).toEqual(["FIZIKA. 1-bob. Kinematika", "Mundarija: 1-bob ... 3"]);
    expect(doc.furniture.map((b) => b.text)).toEqual([
      "~ 1 ~ Nashriyot",
      "Innova o'quv markazi",
      "~ 2 ~ Nashriyot",
    ]);
    expect(doc.questions).toHaveLength(1);
    expect(texts(doc.questions[0])).toEqual(["1. Birinchi savol", "A) 1. B) 2."]);
  });

  it("matn boshidagi yil yoki o'nli son savolni bo'lmaydi", () => {
    const doc = groupIntoQuestions(
      manifest(
        page(1, [
          block(40, 100, "1. Qaysi yilda?", 500),
          block(40, 130, "1990-yilda mustaqillik e'lon qilindi", 500),
          block(40, 160, "2.5 m/s tezlik bilan harakatlanadi", 500),
          block(40, 190, "3,5 kg yuk", 500),
          block(40, 220, "A) 1. B) 2.", 500),
        ]),
      ),
    );

    expect(doc.questions.map((q) => q.number)).toEqual([1]);
    expect(doc.questions[0].blocks).toHaveLength(5);
  });

  it("yulduzcha, №, -savol va probelsiz nuqta shakllarini taniydi", () => {
    const doc = groupIntoQuestions(
      manifest(
        page(1, [
          block(40, 100, "15*. Qiyin savol", 500),
          block(40, 160, "№ 7 Masala sharti", 500),
          block(40, 220, "8-savol. Jism tezligi", 500),
          block(40, 280, "9.Grafikdan foydalanib", 500),
          block(40, 340, "24. 1-rasmda jism", 500),
          block(40, 400, "31-soru. Hangisi", 500),
        ]),
      ),
    );

    expect(doc.questions.map((q) => q.number)).toEqual([15, 7, 8, 9, 24, 31]);
  });

  it("rasm o'zidan yuqoridagi eng yaqin blok savoliga, sahifa/ustun tepasidagisi ochiq savolga ulanadi", () => {
    const doc = groupIntoQuestions(
      manifest(
        page(
          1,
          [
            block(LEFT, 100, "1. Chap ustun birinchi savol"),
            block(LEFT, 200, "A) 1. B) 2."),
            block(LEFT, 300, "2. Chap ustun ikkinchi savol"),
            block(RIGHT, 100, "3. O'ng ustun savoli"),
          ],
          [image(60, 125, "q1.png"), image(60, 325, "q2.png"), image(350, 125, "q3.png")],
        ),
        page(
          2,
          [
            block(LEFT, 200, "4. Ikkinchi sahifa savoli"),
            block(LEFT, 600, "5. Chap ustun oxiri"),
            block(RIGHT, 150, "A) 7. B) 8."),
            block(RIGHT, 300, "6. O'ng ustun savoli"),
          ],
          [image(60, 60, "page-top.png"), image(350, 60, "right-top.png")],
        ),
      ),
    );

    // Yaqin qo'shni: q2.png ustida 1-savol ham bor, lekin eng yaqini 2-savol.
    expect(files(byNumber(doc.questions, 1))).toEqual(["q1.png"]);
    expect(files(byNumber(doc.questions, 2))).toEqual(["q2.png"]);
    // O'ng ustundagi rasm chap ustundagi savolga emas — x kesishuvi yo'q.
    // 2-sahifa tepasidagi rasm — 1-sahifa oxirida ochiq qolgan 3-savolniki.
    expect(files(byNumber(doc.questions, 3))).toEqual(["q3.png", "page-top.png"]);
    expect(byNumber(doc.questions, 3)).toMatchObject({ startPage: 1, endPage: 2, spansPages: true });
    // O'ng ustun tepasi — chap ustun oxiridagi 5-savolning davomi.
    expect(files(byNumber(doc.questions, 5))).toEqual(["right-top.png"]);
    expect(texts(byNumber(doc.questions, 5))).toEqual(["5. Chap ustun oxiri", "A) 7. B) 8."]);
    expect(doc.unassignedImages).toEqual([]);
  });

  it("hujjat boshidagi rasm (ochiq savol yo'q) yo'qolmaydi — unassignedImages'ga tushadi", () => {
    const doc = groupIntoQuestions(
      manifest(page(1, [block(40, 300, "1. Savol", 500)], [image(60, 60, "cover.png"), image(60, 5, "logo.png", 30, 20)])),
    );

    expect(doc.questions[0].images).toEqual([]);
    expect(doc.unassignedImages.map((i) => i.file).sort()).toEqual(["cover.png", "logo.png"]);
  });

  it("to'liq enli bo'lim sarlavhasi sahifani tasmalarga bo'ladi", () => {
    const m = manifest(
      page(1, [
        block(LEFT, 100, "1. Tepa chap"),
        block(LEFT, 200, "2. Tepa chap ikkinchi"),
        block(RIGHT, 100, "3. Tepa o'ng"),
        block(LEFT, 400, "II bo'lim. Dinamika", 540),
        block(LEFT, 450, "4. Past chap"),
        block(RIGHT, 450, "5. Past o'ng"),
      ]),
    );

    // Tasmasiz o'qilsa chap ustun butunlay (1, 2, 4) o'ng ustundan (3, 5)
    // oldin kelardi va 4-savol 3-savoldan oldin turardi.
    expect(flattenBlocks(m).map((b) => b.text)).toEqual([
      "1. Tepa chap",
      "2. Tepa chap ikkinchi",
      "3. Tepa o'ng",
      "II bo'lim. Dinamika",
      "4. Past chap",
      "5. Past o'ng",
    ]);
    expect(groupIntoQuestions(m).questions.map((q) => q.number)).toEqual([1, 2, 3, 4, 5]);
  });
});

// ---------------------------------------------------------------------------
// Haqiqiy fikstura: Innova_to'plam_2023.pdf, 23–24-betlar (manifest.test.ts
// dagi izohga qarang).
// ---------------------------------------------------------------------------

function innova(): Manifest {
  const files = new Set<string>();
  for (const p of fixture.pages) {
    if (p.pageImage) files.add(p.pageImage);
    for (const img of p.images) files.add(img.file);
  }
  const result = parseManifest(fixture, files);
  if ("error" in result) throw new Error(`fikstura yaroqsiz: ${result.error.code}`);
  return result.manifest;
}

describe("groupIntoQuestions — Innova 23–24-betlar", () => {
  it("9–28 savollar ustunma-ustun, sahifalar bo'ylab ketma-ket", () => {
    const { questions } = groupIntoQuestions(innova());

    expect(questions.map((q) => q.number)).toEqual(Array.from({ length: 20 }, (_, i) => i + 9));
  });

  it("variantlar bloki o'z savoliga qo'shiladi", () => {
    const q9 = byNumber(groupIntoQuestions(innova()).questions, 9);

    expect(questionText(q9).split("\n")).toEqual([
      "9. Grafikdan foydalanib, jismning tezlanishi topilsin (m/s2).",
      "A) 1,5. B) 1. C) 2. D) 0,75. E) 0,5.",
    ]);
  });

  it("chap ustun oxiridagi 14-savol o'ng ustun tepasidagi variant va rasmni oladi", () => {
    const q14 = byNumber(groupIntoQuestions(innova()).questions, 14);

    expect(questionText(q14)).toContain("A) 0. B) 1. C) 2. D) 2,5. E) 4,5.");
    expect(files(q14)).toEqual(["rasmlar/rasm_1366.png"]);
    expect(q14.spansPages).toBe(false);
  });

  it("23-bet oxiridagi 18-savol 24-bet tepasida tugaydi", () => {
    const q18 = byNumber(groupIntoQuestions(innova()).questions, 18);

    expect(q18).toMatchObject({ startPage: 23, endPage: 24, spansPages: true });
    expect(files(q18)).toEqual(["rasmlar/rasm_1373.png"]);
    expect(questionText(q18)).toContain("𝑣= 8 – 2𝑡");
  });

  it("rasmlar yaqin savolga: 9 → rasm_1361, 15 → rasm_1367, 24 → rasm_1379", () => {
    const { questions } = groupIntoQuestions(innova());

    expect(files(byNumber(questions, 9))).toEqual(["rasmlar/rasm_1361.png"]);
    expect(files(byNumber(questions, 15))).toEqual(["rasmlar/rasm_1367.png"]);
    expect(files(byNumber(questions, 24))).toEqual(["rasmlar/rasm_1379.png"]);
    expect(files(byNumber(questions, 23))).toEqual(["rasmlar/rasm_1378.png"]);
  });

  it("22-bet davomi preamble'ga, kolontitul furniture'ga tushadi", () => {
    const doc = groupIntoQuestions(innova());

    expect(doc.preamble.map((b) => b.text).join(" ")).toContain("1-sekundida");
    expect(doc.unassignedImages.map((i) => i.file)).toEqual(["rasmlar/rasm_1360.png"]);
    expect(doc.furniture.map((b) => b.text.split("\n")[0].trim())).toEqual(["~ 23 ~", "~ 24 ~"]);
    expect(doc.questions.some((q) => questionText(q).includes("Innova"))).toBe(false);
  });

  it("har rasm aynan bir joyda: savolda yoki unassignedImages'da", () => {
    const doc = groupIntoQuestions(innova());
    const all = [...doc.questions.flatMap(files), ...doc.unassignedImages.map((i) => i.file)];

    expect(new Set(all).size).toBe(all.length);
    expect(all).toHaveLength(innova().pages.reduce((sum, p) => sum + p.images.length, 0));
  });

  it("natija manifestdagi `order` va sahifalar tartibiga bog'liq emas", () => {
    const m = innova();
    const scrambled: Manifest = {
      ...m,
      pages: [...m.pages].reverse().map((p) => ({
        ...p,
        blocks: [...p.blocks].reverse().map((b, order) => ({ ...b, order })),
      })),
    };
    const numbersAndTexts = (doc: ReturnType<typeof groupIntoQuestions>) =>
      doc.questions.map((q) => [q.number, questionText(q), files(q)]);

    expect(numbersAndTexts(groupIntoQuestions(scrambled))).toEqual(numbersAndTexts(groupIntoQuestions(m)));
  });
});

describe("toUploadGroup", () => {
  it("rasm faylini assetId ga almashtiradi, yuklanmaganini tushirib qoldiradi", () => {
    const q18 = byNumber(groupIntoQuestions(innova()).questions, 18);
    const withAsset = toUploadGroup(q18, 9, new Map([["rasmlar/rasm_1373.png", "asset-1"]]));
    const without = toUploadGroup(q18, 9, new Map());

    expect(withAsset.images).toEqual([{ assetId: "asset-1", page: 24, bbox: q18.images[0].bbox }]);
    expect(without.images).toEqual([]);
    expect(without).toMatchObject({ order: 9, number: 18, startPage: 23, endPage: 24, text: questionText(q18) });
  });

  it("ko'p sahifali savolda har sahifa uchun alohida qamrov beradi", () => {
    const q18 = byNumber(groupIntoQuestions(innova()).questions, 18);
    const { regions } = toUploadGroup(q18, 0, new Map());

    expect(regions.map((r) => r.page)).toEqual([23, 24]);
    const onPage24 = regions[1].bbox;
    const image = q18.images[0].bbox;
    expect(onPage24.y).toBeLessThanOrEqual(image.y);
    expect(onPage24.y + onPage24.h).toBeGreaterThanOrEqual(image.y + image.h);
  });
});
