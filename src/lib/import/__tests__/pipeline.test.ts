import { describe, expect, it } from "vitest";
import {
  DIVIDER_MAX_HEIGHT_PT,
  DIVIDER_WIDTH_RATIO,
  FIGURE_GAP_RATIO,
  FIGURE_MIN_SIZE_PT,
  HEADER_FOOTER_BAND_RATIO,
} from "../constants";
import type { DrawOp } from "../figures";
import { analyzeBlockFigures, candidateBands } from "../pipeline";
import type { BBox, Block, TextRow } from "../types";

// Fiksturalar figures.test.ts bilan bir xil uslubda: chegaraviy qiymatlar
// konstantalardan hisoblanadi, qo'lda yozilmaydi.
const ROW_H = 12;
const BLOCK_X = 40;
const BLOCK_W = 300;

const BIG_GAP = FIGURE_GAP_RATIO * ROW_H + 60;
const SMALL_GAP = FIGURE_GAP_RATIO * ROW_H - 1;

/** A4 ga yaqin sahifa — kolontitul tasmasi ≈ 42 nuqta. */
const PAGE: BBox = { x: 0, y: 0, w: 595, h: 842 };
const BAND_PT = HEADER_FOOTER_BAND_RATIO * PAGE.h;

function row(y: number): TextRow {
  return { y, height: ROW_H, items: [{ str: "matn", x: BLOCK_X, y, w: 100, h: ROW_H }], text: "matn" };
}

function op(x: number, y: number, w: number, h: number): DrawOp {
  return { kind: "path", x, y, w, h };
}

function block(rows: TextRow[]): Block {
  const last = rows[rows.length - 1];
  return {
    index: 0,
    number: 1,
    rows,
    page: 1,
    bbox: { x: BLOCK_X, y: rows[0].y, w: BLOCK_W, h: last.y + last.height - rows[0].y },
  };
}

function twoRowsWithGap(gap: number, firstY = 100): Block {
  return block([row(firstY), row(firstY + ROW_H + gap)]);
}

const GAP_TOP = 100 + ROW_H;

describe("candidateBands", () => {
  it("chegaradan katta bo'shliqni nomzod band deb qaytaradi", () => {
    const bands = candidateBands(twoRowsWithGap(BIG_GAP));

    expect(bands).toHaveLength(1);
    expect(bands[0]).toEqual({ x: BLOCK_X, y: GAP_TOP, w: BLOCK_W, h: BIG_GAP });
  });

  it("oddiy satrlararo oraliqni nomzod deb hisoblamaydi", () => {
    expect(candidateBands(twoRowsWithGap(SMALL_GAP))).toEqual([]);
  });

  it("bitta qatorli blokda band bo'lmaydi", () => {
    expect(candidateBands(block([row(100)]))).toEqual([]);
  });

  it("bir necha bo'shliqning hammasini qaytaradi", () => {
    const first = 100;
    const second = first + ROW_H + BIG_GAP;
    const third = second + ROW_H + BIG_GAP;

    expect(candidateBands(block([row(first), row(second), row(third)]))).toHaveLength(2);
  });
});

describe("analyzeBlockFigures", () => {
  it("siyohsiz bandni NO_INK bilan tashlaydi", () => {
    // Bo'shliq bor, lekin unga tushgan siyoh yo'q — bu shunchaki bo'sh joy.
    const result = analyzeBlockFigures(twoRowsWithGap(BIG_GAP), [], PAGE);

    expect(result).toHaveLength(1);
    expect(result[0].confirmed).toEqual([]);
    expect(result[0].skipped).toEqual([{ bbox: result[0].band, reason: "NO_INK" }]);
  });

  it("yetarli kattalikdagi chizmani tasdiqlaydi", () => {
    const figure = op(BLOCK_X + 20, GAP_TOP + 10, FIGURE_MIN_SIZE_PT * 2, BIG_GAP - 20);

    const result = analyzeBlockFigures(twoRowsWithGap(BIG_GAP), [figure], PAGE);

    expect(result[0].confirmed).toHaveLength(1);
    expect(result[0].skipped).toEqual([]);
    expect(result[0].ops).toHaveLength(1);
  });

  it("mayda shtrixni SMALL bilan tashlaydi", () => {
    const speck = op(BLOCK_X + 20, GAP_TOP + 10, FIGURE_MIN_SIZE_PT - 5, FIGURE_MIN_SIZE_PT - 5);

    const result = analyzeBlockFigures(twoRowsWithGap(BIG_GAP), [speck], PAGE);

    expect(result[0].confirmed).toEqual([]);
    expect(result[0].skipped.map((s) => s.reason)).toEqual(["SMALL"]);
  });

  it("sahifa eni bo'ylab cho'zilgan past chiziqni DIVIDER bilan tashlaydi", () => {
    const wide = DIVIDER_WIDTH_RATIO * PAGE.w + 20;
    const divider = op(0, GAP_TOP + 10, wide, DIVIDER_MAX_HEIGHT_PT - 5);
    // Ajratuvchi chiziq blok enidan kengroq — blok ham shunga mos kengaytiriladi.
    const wideBlock = twoRowsWithGap(BIG_GAP);
    wideBlock.bbox = { ...wideBlock.bbox, x: 0, w: PAGE.w };

    const result = analyzeBlockFigures(wideBlock, [divider], PAGE);

    expect(result[0].skipped.map((s) => s.reason)).toEqual(["DIVIDER"]);
  });

  it("butunlay kolontitul tasmasidagi sohani HEADER_FOOTER bilan tashlaydi", () => {
    // Sahifaning quyi tasmasidagi bezak (masalan sahifa raqami atrofidagi
    // grafika). O'lchami yetarli — ya'ni SMALL emas, aynan joylashuvi uchun
    // tashlanadi.
    const footerBlock = twoRowsWithGap(BIG_GAP, 760);
    const gapTop = 760 + ROW_H;
    const decoration = op(BLOCK_X, gapTop + 30, FIGURE_MIN_SIZE_PT * 2, FIGURE_MIN_SIZE_PT);
    // Fikstura haqiqatan quyi tasmada turganiga ishonch.
    expect(decoration.y).toBeGreaterThanOrEqual(PAGE.h - BAND_PT);

    const result = analyzeBlockFigures(footerBlock, [decoration], PAGE);

    expect(result[0].confirmed).toEqual([]);
    expect(result[0].skipped.map((s) => s.reason)).toEqual(["HEADER_FOOTER"]);
  });

  it("yonma-yon turgan variant chizmalarini alohida rasmga ajratadi", () => {
    // To'rtta teng chizma, orasida keng bo'shliq — A/B/C/D varianti.
    const size = FIGURE_MIN_SIZE_PT + 10;
    const step = size + 30;
    const ops = [0, 1, 2, 3].map((i) => op(BLOCK_X + i * step, GAP_TOP + 5, size, size));

    const result = analyzeBlockFigures(twoRowsWithGap(BIG_GAP), ops, PAGE);

    expect(result[0].confirmed).toHaveLength(4);
    expect(result[0].confirmed.every((r) => r.kind === "OPTION_ROW")).toBe(true);
  });

  it("nomzod bandi yo'q blokda bo'sh natija qaytaradi", () => {
    const figure = op(BLOCK_X + 20, GAP_TOP + 2, 80, 20);

    expect(analyzeBlockFigures(twoRowsWithGap(SMALL_GAP), [figure], PAGE)).toEqual([]);
  });
});
