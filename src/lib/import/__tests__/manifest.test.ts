import { describe, expect, it } from "vitest";
import { MAX_IMPORT_PAGES } from "../constants";
import {
  detectColumnsFromBlocks,
  locateManifest,
  parseManifest,
  type Manifest,
  type ManifestPage,
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
