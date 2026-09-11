import { describe, expect, it } from "vitest";
import { analyzeCorridor, detectColumns, effectiveMaxCoverage, type CorridorReport } from "../columns";
import {
  COLUMN_GAP_MIN_PT,
  CORRIDOR_MAX_COVERAGE,
  CORRIDOR_MAX_COVERAGE_CAP,
  CORRIDOR_TOLERATED_ROWS,
  FULL_WIDTH_ROW_RATIO,
  HEADER_FOOTER_BAND_RATIO,
  MIN_COLUMN_ROWS,
} from "../constants";
import type { TextItem } from "../types";

// Fiksturalar qo'lda yoziladi — haqiqiy PDF emas. Chegaraviy qiymatlar
// konstantalardan HISOBLANADI: chegara sozlanganda testlar yolg'on yiqilmasin.
const CHAR_W = 6;
const H = 12;
const ROW_STEP = 16; // qatorlar orasi — ROW_Y_TOLERANCE chegarasidan ancha katta

const PAGE_WIDTH = 600;
const PAGE_HEIGHT = 842;
const WIDE_ROW = FULL_WIDTH_ROW_RATIO * PAGE_WIDTH; // to'liq enli bo'lak chegarasi
const BAND_PT = HEADER_FOOTER_BAND_RATIO * PAGE_HEIGHT; // kolontitul tasmasi
const BODY_TOP = 80;

const LEFT_X = 40;
const COL_W = 200;
const LEFT_END = LEFT_X + COL_W;
/** Haqiqiy PDF'lardagi odatiy oraliq — eski 5% chegarasi (30pt) buni rad etardi. */
const GAP = 10;

function item(str: string, x: number, y: number, w = str.length * CHAR_W, h = H): TextItem {
  return { str, x, y, w, h };
}

/** Ustun bo'lagi — eni doim COL_W, shunda koridor aniq hisoblanadi. */
function colItem(str: string, x: number, y: number): TextItem {
  return item(str, x, y, COL_W);
}

function rowYs(count: number, start = BODY_TOP): number[] {
  return Array.from({ length: count }, (_, i) => start + i * ROW_STEP);
}

/** Chap va o'ng ustun, qatorlari bir xil y larda (sahifa darajasida qo'shiladi). */
function twoColumns(leftRows: number, gap = GAP, rightRows = leftRows): TextItem[] {
  const rightX = LEFT_END + gap;
  return [
    ...rowYs(leftRows).map((y, i) => colItem(`Chap ${i + 1}`, LEFT_X, y)),
    ...rowYs(rightRows).map((y, i) => colItem(`O'ng ${i + 1}`, rightX, y)),
  ];
}

/**
 * Koridorni kesuvchi, lekin to'liq enli bo'lmagan bo'laklar (sarlavha,
 * javoblar jadvali) — har biri ustun qatorlaridan keyin o'z qatorida.
 */
function crossings(count: number, afterRows: number): TextItem[] {
  return Array.from({ length: count }, (_, k) =>
    item(`JAVOBLAR ${k + 1}`, 150, BODY_TOP + (afterRows + k) * ROW_STEP, 200),
  );
}

function detect(items: TextItem[]) {
  return detectColumns(items, PAGE_WIDTH, PAGE_HEIGHT);
}

function analyze(items: TextItem[]): CorridorReport {
  return analyzeCorridor(items, PAGE_WIDTH, PAGE_HEIGHT);
}

describe("detectColumns — asosiy holatlar", () => {
  it("koridorsiz sahifa — bitta ustun", () => {
    const columns = detect(rowYs(10).map((y, i) => item(`Qator ${i}`, LEFT_X, y, 400)));
    expect(columns).toHaveLength(1);
    expect(columns[0].rows).toHaveLength(10);
  });

  it("ikki ustun, chapdan o'ngga — qatorlar y bo'yicha siljigan bo'lsa ham", () => {
    const rightX = LEFT_END + GAP;
    // O'ng ustun qatorlari 8 nuqta pastda — sahifa darajasida alohida qatorlar.
    const items = [
      ...rowYs(MIN_COLUMN_ROWS).map((y, i) => colItem(`Chap ${i}`, LEFT_X, y)),
      ...rowYs(MIN_COLUMN_ROWS, BODY_TOP + 8).map((y, i) => colItem(`O'ng ${i}`, rightX, y)),
    ];
    const columns = detect(items);
    expect(columns).toHaveLength(2);
    expect(columns[0].xMin).toBe(LEFT_X);
    expect(columns[1].xMin).toBe(rightX);
    expect(columns[0].rows.every((r) => r.text.startsWith("Chap"))).toBe(true);
    expect(columns[1].rows.every((r) => r.text.startsWith("O'ng"))).toBe(true);
  });

  // Eski quvurning (avval qator, keyin ustun) yiqiladigan holati: bir xil y da
  // turgan chap va o'ng matn bitta qatorga qo'shilib ketardi.
  it("chap va o'ng matn aynan bir xil y da bo'lsa ham ajratiladi", () => {
    const columns = detect(twoColumns(MIN_COLUMN_ROWS));
    expect(columns).toHaveLength(2);
    expect(columns[0].rows.map((r) => r.text)).toEqual(
      rowYs(MIN_COLUMN_ROWS).map((_, i) => `Chap ${i + 1}`),
    );
    expect(columns[1].rows.map((r) => r.text)).toEqual(
      rowYs(MIN_COLUMN_ROWS).map((_, i) => `O'ng ${i + 1}`),
    );
  });

  // Markazlarni klasterlash shu yerda yiqilardi: chekinishli satrlar markazlari
  // ikkita to'plamga ajralib ko'rinadi. O'ngdagi tabiiy bo'sh joy esa hoshiya.
  it("bir ustunli abzatsli matn (o'ngda tabiiy bo'sh joy) — bitta ustun", () => {
    const paragraph = [
      { x: LEFT_X + 30, w: 270 }, // chekinishli bosh satr
      { x: LEFT_X, w: 310 },
      { x: LEFT_X, w: 285 },
      { x: LEFT_X, w: 300 },
      { x: LEFT_X, w: 120 }, // kalta oxirgi satr
    ];
    const items = rowYs(30).map((y, i) => {
      const line = paragraph[i % paragraph.length];
      return item(`satr ${i}`, line.x, y, line.w);
    });

    const report = analyze(items);
    expect(report.decision).toBe("CENTER_FAIL");
    expect(detect(items)).toHaveLength(1);
  });

  // Chekkadagi keng bo'sh joy koridor emas — u sahifa hoshiyasi.
  it("o'ng hoshiyadagi keng bo'sh joy ikki ustun deb qabul qilinmaydi", () => {
    const items = rowYs(10).map((y, i) => item(`Qator ${i}`, LEFT_X, y, 300));
    const report = analyze(items);
    expect(report.decision).toBe("CENTER_FAIL");
    expect(report.centerOk).toBe(false);
    expect(report.bestBand?.min).toBe(LEFT_X + 300);
    expect(detect(items)).toHaveLength(1);
  });

  it("to'liq enli sarlavha chap ustunga, eng tepaga tushadi", () => {
    const columns = detect([
      item("MATEMATIKA TESTI", LEFT_X, BODY_TOP - ROW_STEP, WIDE_ROW + 20),
      ...twoColumns(MIN_COLUMN_ROWS),
    ]);
    expect(columns).toHaveLength(2);
    expect(columns[0].rows[0].text).toBe("MATEMATIKA TESTI");
  });

  it("koridorni kesib o'tuvchi keng sarlavha chap ustunda, o'z y joyida qoladi", () => {
    const rightX = LEFT_END + GAP;
    const half = MIN_COLUMN_ROWS;
    const secondStart = BODY_TOP + (half + 1) * ROW_STEP;
    const headingY = BODY_TOP + half * ROW_STEP;
    const items = [
      ...rowYs(half).map((y) => colItem("Chap A", LEFT_X, y)),
      ...rowYs(half).map((y) => colItem("O'ng A", rightX, y)),
      item("IKKINCHI BO'LIM", LEFT_X, headingY, WIDE_ROW + 20),
      ...rowYs(half, secondStart).map((y) => colItem("Chap B", LEFT_X, y)),
      ...rowYs(half, secondStart).map((y) => colItem("O'ng B", rightX, y)),
    ];

    const columns = detect(items);
    expect(columns).toHaveLength(2);
    const leftTexts = columns[0].rows.map((r) => r.text);
    expect(leftTexts[half]).toBe("IKKINCHI BO'LIM");
    expect(leftTexts.slice(0, half).every((t) => t === "Chap A")).toBe(true);
    expect(leftTexts.slice(half + 1).every((t) => t === "Chap B")).toBe(true);
    expect(columns[1].rows.map((r) => r.text)).not.toContain("IKKINCHI BO'LIM");
  });

  it("bo'laksiz sahifa bo'sh natija beradi", () => {
    expect(detect([])).toEqual([]);
  });
});

describe("detectColumns — haqiqiy PDF'lardagi yiqilishlar", () => {
  it("oraliq 10pt (eski 5% chegarasida yiqilardi) — ikki ustun", () => {
    // Fikstura haqiqatan eski nisbiy chegaradan tor ekaniga ishonch.
    expect(GAP).toBeLessThan(0.05 * PAGE_WIDTH);
    expect(GAP).toBeGreaterThanOrEqual(COLUMN_GAP_MIN_PT);

    const items = twoColumns(40);
    const report = analyze(items);
    expect(report.decision).toBe("TWO_COLUMNS");
    expect(report.widthOk).toBe(true);
    expect(report.bestBand).toMatchObject({ min: LEFT_END, max: LEFT_END + GAP, width: GAP });
    expect(report.leftRows).toBe(40);
    expect(report.rightRows).toBe(40);
    expect(detect(items)).toHaveLength(2);
  });

  it("markazdagi sahifa raqami (kolontitul tasmasida) ustunlarni buzmaydi", () => {
    // Sahifa raqami aynan koridor ustida. Qatorlar kam — agar raqam hisobga
    // olinsa, 1/(n+1) qoplama shiftdan oshib, koridor rad etilardi.
    const corridorCenter = LEFT_END + GAP / 2;
    const pageNumber = item("~ 9 ~", corridorCenter - 15, PAGE_HEIGHT - 30, 30);
    expect(pageNumber.y).toBeGreaterThanOrEqual(PAGE_HEIGHT - BAND_PT);
    expect(1 / (MIN_COLUMN_ROWS + 1)).toBeGreaterThan(CORRIDOR_MAX_COVERAGE_CAP);

    const items = [...twoColumns(MIN_COLUMN_ROWS), pageNumber];
    const report = analyze(items);
    expect(report.rows).toBe(MIN_COLUMN_ROWS); // raqam sanalmagan
    expect(report.decision).toBe("TWO_COLUMNS");
    expect(detect(items)).toHaveLength(2);
  });

  it("koridorni kesuvchi (to'liq enli bo'lmagan) sarlavha — baribir ikki ustun", () => {
    const heading = crossings(1, 40)[0];
    expect(heading.w).toBeLessThan(WIDE_ROW); // chetlatilmaydi, shovqin sifatida sanaladi

    const items = [...twoColumns(40), heading];
    const report = analyze(items);
    expect(report.decision).toBe("TWO_COLUMNS");
    expect(report.bestBand?.coverage).toBeCloseTo(1 / 41);

    const columns = detect(items);
    expect(columns).toHaveLength(2);
    expect(columns[0].rows.map((r) => r.text)).toContain(heading.str);
  });

  it("o'ng tomonda atigi 2 qator — bitta ustun (MIN_COLUMN_ROWS)", () => {
    // Chapda 10 qator: o'ngdagi 2 qatorning qoplamasi (20%) shiftdan yuqori,
    // ya'ni ular shovqin emas — koridor topiladi, lekin tomon sharti yiqiladi.
    const items = twoColumns(10, GAP, 2);
    const report = analyze(items);
    expect(report.decision).toBe("SIDE_ROWS_FAIL");
    expect(report.leftRows).toBe(10);
    expect(report.rightRows).toBe(2);
    expect(detect(items)).toHaveLength(1);
  });

  it("oraliq 6pt (chegaradan past) — bitta ustun", () => {
    const narrow = 6;
    expect(narrow).toBeLessThan(COLUMN_GAP_MIN_PT);

    const items = twoColumns(40, narrow);
    const report = analyze(items);
    expect(report.decision).toBe("WIDTH_FAIL");
    expect(report.centerOk).toBe(true);
    expect(report.bestBand?.width).toBe(narrow);
    expect(detect(items)).toHaveLength(1);
  });

  it("koridorni har qatorda kesuvchi element bo'lsa — bitta ustun", () => {
    const items = [
      ...twoColumns(40),
      ...rowYs(40).map((y) => item("x", LEFT_END - 5, y, GAP + 10)),
    ];
    expect(analyze(items).decision).not.toBe("TWO_COLUMNS");
    expect(detect(items)).toHaveLength(1);
  });
});

describe("moslashuvchan tolerantlik", () => {
  it("chegara qator soniga bog'liq: zich — asosiy, o'rta — 3 qator, siyrak — shift", () => {
    expect(effectiveMaxCoverage(100)).toBe(CORRIDOR_MAX_COVERAGE);
    expect(effectiveMaxCoverage(40)).toBeCloseTo(CORRIDOR_TOLERATED_ROWS / 40);
    expect(effectiveMaxCoverage(10)).toBe(CORRIDOR_MAX_COVERAGE_CAP);
    expect(effectiveMaxCoverage(0)).toBe(CORRIDOR_MAX_COVERAGE);
  });

  it("40 qator + sarlavha va javoblar jadvali — 3% dan oshsa ham ikki ustun", () => {
    const items = [...twoColumns(40), ...crossings(2, 40)];
    const report = analyze(items);
    // Qattiq 3% da shu sahifa rad etilardi.
    expect(report.bestBand?.coverage).toBeGreaterThan(CORRIDOR_MAX_COVERAGE);
    expect(report.effectiveMaxCoverage).toBeCloseTo(CORRIDOR_TOLERATED_ROWS / 42);
    expect(report.decision).toBe("TWO_COLUMNS");
    expect(detect(items)).toHaveLength(2);
  });

  it("aynan CORRIDOR_TOLERATED_ROWS ta kesuvchi qator kechiriladi", () => {
    const items = [...twoColumns(40), ...crossings(CORRIDOR_TOLERATED_ROWS, 40)];
    expect(analyze(items).decision).toBe("TWO_COLUMNS");
  });

  it("siyrak sahifada shiftdan oshgan qoplama — bitta ustun", () => {
    // 10 qator + 2 kesuvchi: 2/12 ≈ 17% > 10% shift.
    const items = [...twoColumns(10), ...crossings(2, 10)];
    const report = analyze(items);
    expect(report.rows).toBe(12);
    expect(report.effectiveMaxCoverage).toBe(CORRIDOR_MAX_COVERAGE_CAP);
    expect(report.minCenterCoverage).toBeCloseTo(2 / 12);
    expect(report.decision).toBe("CENTER_FAIL");
    expect(detect(items)).toHaveLength(1);
  });
});

describe("analyzeCorridor hisoboti", () => {
  it("bo'sh sahifa — NO_BAND", () => {
    expect(analyze([])).toMatchObject({ rows: 0, decision: "NO_BAND", bestBand: null });
  });

  it("faqat kolontitul matni bo'lsa — NO_BAND", () => {
    const report = analyze([item("Fizika", LEFT_X, 10), item("~ 3 ~", 285, PAGE_HEIGHT - 20)]);
    expect(report.rows).toBe(0);
    expect(report.decision).toBe("NO_BAND");
  });

  it("detectColumns uzatilgan hisobotga amal qiladi, qayta hisoblamaydi", () => {
    const items = twoColumns(40);
    const forced: CorridorReport = { ...analyze(items), decision: "NO_BAND", bestBand: null };
    expect(detectColumns(items, PAGE_WIDTH, PAGE_HEIGHT, forced)).toHaveLength(1);
  });
});
