import { describe, expect, it } from "vitest";
import { MAX_IMPORT_PAGES } from "../constants";
import {
  detectColumnsFromBlocks,
  groupIntoQuestions,
  locateManifest,
  parseManifest,
  planManifest,
  toUploadGroup,
  type Manifest,
  type ManifestPage,
  type QuestionGroup,
} from "../manifest";
import fixture from "./fixtures/manifest-innova-p23.json";

// Fikstura HAQIQIY: `Innova_to'plam_2023.pdf` ning 23–24-sahifalari
// `Rasm_ajratgich.py` orqali o'tkazilgan (faqat manifest.json, PNG'larsiz).
// Qo'lda tahrirlanmagan — qiymatlarni o'zgartirish haqiqatdan uzoqlashish.

/** Manifestdagi barcha fayl yo'llari — "ZIP ichida bor" deb hisoblanadi. */
function filesOf(raw: unknown): Set<string> {
  const m = raw as { pages: { pageImage?: string; images: { file: string }[] }[] };
  const files = new Set<string>();
  for (const p of m.pages) {
    if (p.pageImage) files.add(p.pageImage);
    for (const img of p.images) files.add(img.file);
  }
  return files;
}

function clone(): Record<string, unknown> & { pages: Record<string, unknown>[] } {
  return JSON.parse(JSON.stringify(fixture));
}

function parsed(): Manifest {
  const result = parseManifest(fixture, filesOf(fixture));
  if ("error" in result) throw new Error(`fikstura yaroqsiz: ${result.error.code}`);
  return result.manifest;
}

function page23(): ManifestPage {
  const page = parsed().pages.find((p) => p.page === 23);
  if (!page) throw new Error("23-sahifa yo'q");
  return page;
}

function byNumber(groups: QuestionGroup[], n: number): QuestionGroup {
  const group = groups.find((g) => g.number === n);
  if (!group) throw new Error(`${n}-savol topilmadi`);
  return group;
}

describe("parseManifest", () => {
  it("haqiqiy manifestni qabul qiladi", () => {
    const manifest = parsed();
    expect(manifest.kind).toBe("auto");
    expect(manifest.pageCount).toBe(2);
    expect(manifest.pages.map((p) => p.page)).toEqual([23, 24]);
  });

  it("zip-slip: `..` bilan chiqib ketuvchi yo'lni rad etadi", () => {
    const raw = clone();
    (raw.pages[0].images as { file: string }[])[0].file = "../../etc/passwd";

    const result = parseManifest(raw, filesOf(raw));

    expect(result).toEqual({ error: { code: "UNSAFE_PATH", detail: "../../etc/passwd" } });
  });

  it.each(["/etc/passwd.png", "C:/Windows/x.png", "rasmlar\\x.png", "rasmlar/./x.png", "rasmlar//x.png"])(
    "mutlaq yoki g'alati yo'lni rad etadi: %s",
    (file) => {
      const raw = clone();
      (raw.pages[0].images as { file: string }[])[0].file = file;

      const result = parseManifest(raw, filesOf(raw));

      expect(result).toMatchObject({ error: { code: "UNSAFE_PATH" } });
    },
  );

  it("pageImage yo'lini ham tekshiradi", () => {
    const raw = clone();
    raw.pages[0].pageImage = "../sahifa.png";

    expect(parseManifest(raw, filesOf(raw))).toMatchObject({ error: { code: "UNSAFE_PATH" } });
  });

  it("ZIP ichida yo'q faylni rad etadi", () => {
    const files = filesOf(fixture);
    files.delete("rasmlar/rasm_1361.png");

    expect(parseManifest(fixture, files)).toEqual({
      error: { code: "MISSING_FILE", detail: "rasmlar/rasm_1361.png" },
    });
  });

  it("PNG bo'lmagan faylni rad etadi", () => {
    const raw = clone();
    (raw.pages[0].images as { file: string }[])[0].file = "rasmlar/x.jpg";

    expect(parseManifest(raw, filesOf(raw))).toMatchObject({ error: { code: "NOT_PNG" } });
  });

  it("version 2 ni aniq xato bilan rad etadi", () => {
    const raw = clone();
    raw.version = 2;

    expect(parseManifest(raw, filesOf(raw))).toEqual({ error: { code: "BAD_VERSION", detail: "2" } });
  });

  it("bbox dagi harfni maydon yo'li bilan ko'rsatadi", () => {
    const raw = clone();
    (raw.pages[0].blocks as { bbox: Record<string, unknown> }[])[2].bbox.x = "abc";

    expect(parseManifest(raw, filesOf(raw))).toEqual({
      error: { code: "BAD_FIELD", detail: "pages[0].blocks[2].bbox.x" },
    });
  });

  it("noma'lum til kodini 'uz' ga tushirmaydi — aniq xato beradi", () => {
    const raw = clone();
    raw.sourceLang = "de";

    expect(parseManifest(raw, filesOf(raw))).toEqual({ error: { code: "UNKNOWN_LANG", detail: "de" } });
  });

  it("turkcha manbani qabul qiladi", () => {
    const raw = clone();
    raw.sourceLang = "tr";

    expect(parseManifest(raw, filesOf(raw))).toHaveProperty("manifest.sourceLang", "tr");
  });

  it("noto'g'ri kind ni rad etadi", () => {
    const raw = clone();
    raw.kind = "pdf";

    expect(parseManifest(raw, filesOf(raw))).toMatchObject({ error: { code: "BAD_KIND" } });
  });

  it("pageCount sahifalar soniga teng bo'lmasa rad etadi", () => {
    const raw = clone();
    raw.pageCount = 5;

    expect(parseManifest(raw, filesOf(raw))).toEqual({ error: { code: "BAD_FIELD", detail: "pageCount" } });
  });

  it(`${MAX_IMPORT_PAGES} dan ko'p sahifani rad etadi`, () => {
    const raw = clone();
    const template = raw.pages[1];
    raw.pages = Array.from({ length: MAX_IMPORT_PAGES + 1 }, (_, i) => ({ ...template, page: i + 1 }));
    raw.pageCount = raw.pages.length;

    expect(parseManifest(raw, filesOf(raw))).toMatchObject({ error: { code: "TOO_MANY_PAGES" } });
  });

  it("takroriy sahifa raqamini rad etadi", () => {
    const raw = clone();
    raw.pages[1].page = 23;

    expect(parseManifest(raw, filesOf(raw))).toEqual({ error: { code: "BAD_FIELD", detail: "pages[1].page" } });
  });

  it("asl PDF sahifa raqami pageCount dan katta bo'lishi odatiy", () => {
    // Skript 23–24-sahifani kesib oladi: pageCount 2, page esa 23 va 24.
    expect(parsed().pages[0].page).toBeGreaterThan(parsed().pageCount);
  });
});

describe("locateManifest", () => {
  it("ildizdagi manifestni topadi", () => {
    expect(locateManifest(["manifest.json", "rasmlar/a.png"])).toEqual({ prefix: "" });
  });

  it("Windows siqilgan papkasidagi yagona ichki manifestni topadi", () => {
    expect(locateManifest(["Innova/manifest.json", "Innova/rasmlar/a.png"])).toEqual({ prefix: "Innova/" });
  });

  it("manifest yo'q yoki bir nechta bo'lsa null", () => {
    expect(locateManifest(["rasmlar/a.png"])).toBeNull();
    expect(locateManifest(["a/manifest.json", "b/manifest.json"])).toBeNull();
  });
});

describe("detectColumnsFromBlocks", () => {
  it("ikki ustunni aniqlaydi (x=28.3 va x=311.9)", () => {
    const columns = detectColumnsFromBlocks(page23());

    expect(columns).toHaveLength(2);
    expect(columns[0].xMin).toBeCloseTo(28.3, 1);
    expect(columns[1].xMin).toBeCloseTo(311.9, 1);
    // Kolontitul (eni 471) klasterlashga kirmagan — aks holda chap ustun
    // o'ng ustun ichigacha cho'zilardi.
    expect(columns[0].xMax).toBeLessThan(columns[1].xMin);
  });

  it("bir ustunli sahifada bitta ustun qaytaradi", () => {
    const page = page23();
    const single: ManifestPage = { ...page, blocks: page.blocks.filter((b) => b.bbox.x < 100) };

    expect(detectColumnsFromBlocks(single)).toHaveLength(1);
  });
});

describe("groupIntoQuestions", () => {
  it("9–14 va 15*–18 alohida savol bo'ladi, ustun tartibida", () => {
    const groups = groupIntoQuestions(page23());

    expect(groups.map((g) => g.number)).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
    expect(groups.map((g) => g.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("`15*.` yulduzchali raqamni taniydi", () => {
    const q15 = byNumber(groupIntoQuestions(page23()), 15);

    expect(q15.text.startsWith("15*. Jism tezligining")).toBe(true);
  });

  it("variantlar bloki o'z savoliga qo'shiladi, alohida savol bo'lmaydi", () => {
    const groups = groupIntoQuestions(page23());
    const q9 = byNumber(groups, 9);

    expect(q9.text.split("\n")).toEqual([
      "9. Grafikdan foydalanib, jismning tezlanishi topilsin (m/s2).",
      "A) 1,5. B) 1. C) 2. D) 0,75. E) 0,5.",
    ]);
    expect(groups.some((g) => g.text.startsWith("A)"))).toBe(false);
  });

  it("matn normallashtiriladi — blok ichida qator ko'chishi va ketma-ket probel yo'q", () => {
    for (const group of groupIntoQuestions(page23())) {
      for (const line of group.text.split("\n")) {
        expect(line).not.toMatch(/\s{2}/);
        expect(line).toBe(line.trim());
      }
    }
  });

  it("y=153.8 dagi chap rasm 9-savolga, y=164.4 dagi o'ng rasm 15-savolga tushadi", () => {
    const groups = groupIntoQuestions(page23());

    expect(byNumber(groups, 9).images.map((i) => i.bbox.y)).toEqual([153.81]);
    expect(byNumber(groups, 15).images.map((i) => i.bbox.y)).toEqual([164.44]);
  });

  it("guruh qamrovi rasmni ham o'z ichiga oladi", () => {
    const q9 = byNumber(groupIntoQuestions(page23()), 9);
    const image = q9.images[0].bbox;

    expect(q9.bbox.y).toBeLessThanOrEqual(image.y);
    expect(q9.bbox.y + q9.bbox.h).toBeGreaterThanOrEqual(image.y + image.h);
  });

  it("kolontitul bloki hech qaysi savolga tushmaydi", () => {
    const groups = groupIntoQuestions(page23());

    expect(groups.some((g) => g.text.includes("Innova"))).toBe(false);
    expect(groups.some((g) => g.text.includes("~ 23 ~"))).toBe(false);
  });

  it("ustun boshidagi oldingi sahifa davomi hech bir savolga qo'shilmaydi", () => {
    // 23-bet tepasidagi variantlar va rasmlar (y < 135) — 22-betdagi
    // savollarning davomi. Ularni 14- yoki 9-savolga ulash xato bo'lardi.
    const groups = groupIntoQuestions(page23());

    expect(groups.some((g) => g.text.includes("A) 0. B) 1."))).toBe(false);
    expect(groups.some((g) => g.text.includes("1-sekundida"))).toBe(false);
    expect(groups.flatMap((g) => g.images).some((i) => i.bbox.y < 100)).toBe(false);
  });

  it("raqam bilan boshlanuvchi savol matnini ham taniydi (24. 1-rasmda...)", () => {
    // Haqiqiy 24-bet: nuqtadan keyin harf emas, raqam. Faqat harf talab
    // qilinganda 24-savol, uning rasmi va variantlari yo'qolardi.
    const page24 = parsed().pages.find((p) => p.page === 24)!;
    const q24 = byNumber(groupIntoQuestions(page24), 24);

    expect(q24.text.startsWith("24. 1-rasmda")).toBe(true);
    expect(q24.images.map((i) => i.file)).toEqual(["rasmlar/rasm_1379.png"]);
    expect(q24.text).toContain("A) 6. B) 5.");
  });

  it("o'nli son yoki variant bilan boshlangan blok savol boshi emas", () => {
    const page = page23();
    const extra = (text: string, y: number) => ({ order: 99, bbox: { x: 28.32, y, w: 200, h: 12 }, text });
    const noisy: ManifestPage = {
      ...page,
      blocks: [...page.blocks, extra("2.5 kg yuk", 160), extra("3,5 m/s", 165), extra("A) 1. B) 2.", 170)],
    };

    expect(groupIntoQuestions(noisy).map((g) => g.number)).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
  });

  it("har rasm ko'pi bilan bitta savolga biriktiriladi", () => {
    const files = groupIntoQuestions(page23()).flatMap((g) => g.images.map((i) => i.file));

    expect(new Set(files).size).toBe(files.length);
  });

  it("skan sahifada (blok yo'q) savol ham yo'q", () => {
    const scanned: ManifestPage = { ...page23(), blocks: [] };

    expect(groupIntoQuestions(scanned)).toEqual([]);
  });
});

describe("planManifest", () => {
  it("order sahifalar bo'ylab uzluksiz", () => {
    const plan = planManifest(parsed());
    const orders = plan.flatMap((p) => p.groups.map((g) => g.order));

    expect(plan.map((p) => p.page.page)).toEqual([23, 24]);
    expect(orders).toEqual(orders.map((_, i) => i));
    expect(plan[1].groups.map((g) => g.number)).toEqual([19, 20, 21, 22, 23, 24, 25, 26, 27, 28]);
  });

  it("qayta chaqiruvda va sahifalar tartibi aralashganda ham bir xil order beradi", () => {
    const manifest = parsed();
    const reversed: Manifest = { ...manifest, pages: [...manifest.pages].reverse() };

    expect(planManifest(reversed)).toEqual(planManifest(manifest));
  });
});

describe("toUploadGroup", () => {
  it("rasm faylini assetId ga almashtiradi, yuklanmaganini tushirib qoldiradi", () => {
    const q9 = byNumber(groupIntoQuestions(page23()), 9);
    const withAsset = toUploadGroup(q9, new Map([[q9.images[0].file, "asset-1"]]));
    const without = toUploadGroup(q9, new Map());

    expect(withAsset.images).toEqual([{ assetId: "asset-1", bbox: q9.images[0].bbox }]);
    expect(without.images).toEqual([]);
    expect(without.text).toBe(q9.text);
  });
});
