import { describe, expect, it } from "vitest";
import { blockBBox, groupIntoRows, splitIntoBlocks } from "../blocks";
import { detectColumns as detectColumnsOnPage } from "../columns";
import { COLUMN_GAP_MIN_PT, MIN_COLUMN_ROWS, ROW_Y_TOLERANCE_RATIO } from "../constants";
import type { Block, TextItem } from "../types";

// Fiksturalar qo'lda yoziladi — haqiqiy PDF emas. Chegaraviy qiymatlar
// konstantalardan HISOBLANADI: chegara sozlanganda testlar yolg'on yiqilmasin.
const CHAR_W = 6;
const H = 12;

function item(str: string, x: number, y: number, w = str.length * CHAR_W, h = H): TextItem {
  return { str, x, y, w, h };
}

const PAGE_WIDTH = 600;
const PAGE_HEIGHT = 842;

const LEFT_X = 40;
const COL_W = 200;
const RIGHT_X = LEFT_X + COL_W + COLUMN_GAP_MIN_PT + 10; // koridor chegaradan keng

/** Ustun bo'lagi — eni doim COL_W, shunda koridor aniq hisoblanadi. */
function colItem(str: string, x: number, y: number): TextItem {
  return item(str, x, y, COL_W);
}

// Ustun aniqlashning o'z testlari columns.test.ts da; bu yerda u faqat
// splitIntoBlocks ga haqiqiy kirish tayyorlash uchun chaqiriladi.
function detectColumns(items: TextItem[]) {
  return detectColumnsOnPage(items, PAGE_WIDTH, PAGE_HEIGHT);
}

describe("groupIntoRows", () => {
  it("y farqi chegaradan kichik bo'lsa bir qator", () => {
    const dy = ROW_Y_TOLERANCE_RATIO * H - 0.01;
    const rows = groupIntoRows([item("Tosh", 0, 0), item("kent", 24, dy)]);
    expect(rows).toHaveLength(1);
    expect(rows[0].text).toBe("Toshkent");
  });

  it("y farqi chegaradan katta bo'lsa ikki qator", () => {
    const dy = ROW_Y_TOLERANCE_RATIO * H + 0.01;
    const rows = groupIntoRows([item("Birinchi", 0, 0), item("Ikkinchi", 0, dy)]);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.text)).toEqual(["Birinchi", "Ikkinchi"]);
  });

  // pdfjs bo'laklarni chizilish tartibida beradi — u chapdan o'ngga bo'lishi
  // shart emas, shuning uchun qator ichida qayta tartiblanadi.
  it("bo'laklar tartibsiz kelsa ham matn x bo'yicha yig'iladi", () => {
    const rows = groupIntoRows([item("kent", 24, 0), item("Tosh", 0, 0)]);
    expect(rows[0].text).toBe("Toshkent");
    expect(rows[0].items.map((i) => i.str)).toEqual(["Tosh", "kent"]);
  });

  it("o'rtacha belgi enidan katta bo'shliq probelga aylanadi", () => {
    const gap = CHAR_W + 1;
    const rows = groupIntoRows([item("A", 0, 0), item("B", CHAR_W + gap, 0)]);
    expect(rows[0].text).toBe("A B");
  });

  it("qator y va height bo'laklardan hisoblanadi", () => {
    const rows = groupIntoRows([item("A", 0, 100), item("B", 20, 102, CHAR_W, 20)]);
    expect(rows[0].y).toBe(100);
    expect(rows[0].height).toBe(122 - 100);
  });

  it("bo'sh massiv bo'sh natija beradi", () => {
    expect(groupIntoRows([])).toEqual([]);
  });
});

describe("splitIntoBlocks", () => {
  it("bitta ustun, 5 ta oddiy savol", () => {
    const columns = detectColumns(
      [1, 2, 3, 4, 5].map((n) => colItem(`${n}. Savol matni`, LEFT_X, 100 + n * 40)),
    );
    const blocks = splitIntoBlocks(columns, 1);
    expect(blocks.map((b) => b.number)).toEqual([1, 2, 3, 4, 5]);
    expect(blocks.map((b) => b.index)).toEqual([0, 1, 2, 3, 4]);
    expect(blocks.every((b) => b.rows.length === 1)).toBe(true);
  });

  it("ikki ustun — avval chap ustun to'liq, keyin o'ng", () => {
    // Har tomonda MIN_COLUMN_ROWS savol — undan kami ikki ustun deb tan olinmaydi.
    const n = MIN_COLUMN_ROWS;
    const items = Array.from({ length: n }, (_, i) => [
      colItem(`${i + 1}. Chap`, LEFT_X, 100 + i * 40),
      colItem(`${n + i + 1}. O'ng`, RIGHT_X, 110 + i * 40),
    ]).flat();
    const expected = Array.from({ length: 2 * n }, (_, i) => i + 1);
    expect(splitIntoBlocks(detectColumns(items), 1).map((b) => b.number)).toEqual(expected);
  });

  it("№ 12 va 12-savol ko'rinishlarini taniydi", () => {
    const columns = detectColumns(
      [
        colItem("№ 12 Toshkent qayerda?", LEFT_X, 100),
        colItem("12-savol Nima uchun?", LEFT_X, 140),
        colItem("13-masala Yechimni toping", LEFT_X, 180),
      ],
    );
    expect(splitIntoBlocks(columns, 1).map((b) => b.number)).toEqual([12, 12, 13]);
  });

  // Eng xavfli holat: matn ichidagi yil yoki o'nlik son yangi blok ochmasin.
  it("qator o'rtasidagi yoki sonli matn blokni bo'lmaydi", () => {
    const columns = detectColumns(
      [
        colItem("1. 1990-yilda nima bo'ldi?", LEFT_X, 100),
        colItem("1990-yilda mustaqillik e'lon qilindi", LEFT_X, 140),
        colItem("2.5 kg gaz sarflandi", LEFT_X, 180),
      ],
    );
    const blocks = splitIntoBlocks(columns, 1);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].number).toBe(1);
    expect(blocks[0].rows).toHaveLength(3);
  });

  it("umuman nomerlanmagan matn bo'sh massiv beradi", () => {
    const columns = detectColumns(
      [
        colItem("Toshkent Respublikaning poytaxti", LEFT_X, 100),
        colItem("Aholi soni uch millionga yaqin", LEFT_X, 140),
      ],
    );
    expect(splitIntoBlocks(columns, 1)).toEqual([]);
  });

  it("birinchi savolgacha bo'lgan sarlavha hech bir blokka kirmaydi", () => {
    const columns = detectColumns(
      [
        colItem("MATEMATIKA TESTI", LEFT_X, 60),
        colItem("2026-yil variant", LEFT_X, 80),
        colItem("1. Birinchi savol", LEFT_X, 120),
      ],
    );
    const blocks = splitIntoBlocks(columns, 1);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].rows.map((r) => r.text)).toEqual(["1. Birinchi savol"]);
  });

  it("page parametri har blokka o'tadi", () => {
    const columns = detectColumns([colItem("1. Savol", LEFT_X, 100)]);
    expect(splitIntoBlocks(columns, 7)[0].page).toBe(7);
  });

  it("ustunlar bo'sh bo'lsa bo'sh massiv", () => {
    expect(splitIntoBlocks([], 1)).toEqual([]);
  });
});

describe("blockBBox", () => {
  it("barcha qatorlarni qamrab oladi", () => {
    const rows = groupIntoRows([item("1. Bir", 50, 100), item("davomi", 60, 120)]);
    const block: Block = { index: 0, number: 1, rows, page: 1, bbox: { x: 0, y: 0, w: 0, h: 0 } };
    expect(blockBBox(block)).toEqual({ x: 50, y: 100, w: 96 - 50, h: 132 - 100 });
  });

  it("qatorsiz blok uchun nollar", () => {
    const block: Block = { index: 0, number: null, rows: [], page: 1, bbox: { x: 0, y: 0, w: 0, h: 0 } };
    expect(blockBBox(block)).toEqual({ x: 0, y: 0, w: 0, h: 0 });
  });
});
