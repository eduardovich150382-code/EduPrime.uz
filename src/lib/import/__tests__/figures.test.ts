import { describe, expect, it } from "vitest";
import {
  DEDUPE_PAGE_THRESHOLD,
  DIVIDER_MAX_HEIGHT_PT,
  DIVIDER_WIDTH_RATIO,
  FIGURE_GAP_RATIO,
  FIGURE_MIN_SIZE_PT,
  FIGURE_PADDING_PT,
  HEADER_FOOTER_BAND_RATIO,
  OPTION_SPLIT_MAX,
} from "../constants";
import {
  dedupeByHash,
  findFigureRegions,
  shouldSkipFigure,
  splitOptionRow,
  type DrawOp,
  type FigureRegion,
} from "../figures";
import type { BBox, Block, TextRow } from "../types";

// Fiksturalar qo'lda yoziladi — haqiqiy PDF emas. Chegaraviy qiymatlar
// konstantalardan HISOBLANADI: chegara sozlanganda testlar yolg'on yiqilmasin.
const ROW_H = 12;
const BLOCK_X = 40;
const BLOCK_W = 300;

/** Chegaradan KATTA bo'shliq — chizma sig'adi. */
const BIG_GAP = FIGURE_GAP_RATIO * ROW_H + 60;
/** Chegaradan KICHIK bo'shliq — oddiy satrlararo oraliq. */
const SMALL_GAP = FIGURE_GAP_RATIO * ROW_H - 1;

function row(y: number): TextRow {
  return {
    y,
    height: ROW_H,
    items: [{ str: "matn", x: BLOCK_X, y, w: 100, h: ROW_H }],
    text: "matn",
  };
}

function op(x: number, y: number, w: number, h: number, kind: DrawOp["kind"] = "path"): DrawOp {
  return { kind, x, y, w, h };
}

/** Berilgan qatorlardan blok — bbox qatorlarni to'liq qamrab oladi. */
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

/** matn / bo'shliq / matn — ikkinchi qator bo'shliqdan keyin boshlanadi. */
function twoRowsWithGap(gap: number): Block {
  return block([row(100), row(100 + ROW_H + gap)]);
}

const GAP_TOP = 100 + ROW_H;

describe("findFigureRegions", () => {
  it("katta bo'shliqqa chizish amali tushsa soha topiladi", () => {
    const regions = findFigureRegions(twoRowsWithGap(BIG_GAP), [
      op(BLOCK_X + 20, GAP_TOP + 10, 80, BIG_GAP - 20),
    ]);

    expect(regions).toHaveLength(1);
    expect(regions[0].kind).toBe("FIGURE");
    expect(regions[0].confidence).toBeGreaterThan(0.5);
  });

  // Bo'shliqning o'zi dalil emas — savol matnidan keyin shunchaki bo'sh joy
  // qolishi mumkin. Chizish amalisiz soha yaratilmaydi.
  it("bo'shliqda chizish amali bo'lmasa soha topilmaydi", () => {
    const far = op(BLOCK_X, GAP_TOP + BIG_GAP + 200, 80, 80); // bo'shliqdan tashqarida
    expect(findFigureRegions(twoRowsWithGap(BIG_GAP), [far])).toEqual([]);
  });

  it("bo'shliq chegaradan kichik bo'lsa soha topilmaydi", () => {
    const regions = findFigureRegions(twoRowsWithGap(SMALL_GAP), [
      op(BLOCK_X + 20, GAP_TOP + 1, 80, SMALL_GAP - 2),
    ]);
    expect(regions).toEqual([]);
  });

  // Eng muhim shart: kesilgan rasm bo'sh oq maydonga to'lib ketmasligi kerak.
  it("bbox bo'shliqning to'lig'i emas, ops qamroviga qisqartiriladi", () => {
    const opX = BLOCK_X + 50;
    const opY = GAP_TOP + 20;
    const opW = 90;
    const opH = 60;
    const regions = findFigureRegions(twoRowsWithGap(BIG_GAP), [op(opX, opY, opW, opH)]);

    expect(regions[0].bbox).toEqual({
      x: opX - FIGURE_PADDING_PT,
      y: opY - FIGURE_PADDING_PT,
      w: opW + FIGURE_PADDING_PT * 2,
      h: opH + FIGURE_PADDING_PT * 2,
    });
    // Butun bo'shliq qaytarilganda balandlik BIG_GAP bo'lardi.
    expect(regions[0].bbox.h).toBeLessThan(BIG_GAP);
  });

  it("qo'shni ustundagi chizma blokka qo'shilmaydi", () => {
    const outside = op(BLOCK_X + BLOCK_W + 20, GAP_TOP + 10, 80, 60);
    expect(findFigureRegions(twoRowsWithGap(BIG_GAP), [outside])).toEqual([]);
  });

  it("bitta qatorli blokda soha izlanmaydi", () => {
    expect(findFigureRegions(block([row(100)]), [op(BLOCK_X, 200, 80, 80)])).toEqual([]);
  });
});

describe("splitOptionRow", () => {
  const FIG_W = 60;
  const FIG_H = 60;
  const FIG_Y = 200;
  const BETWEEN = 40; // chizmalar orasidagi bo'shliq

  /** `count` ta yonma-yon chizma, har biri bitta amal. */
  function sideBySide(count: number): DrawOp[] {
    return Array.from({ length: count }, (_, i) =>
      op(BLOCK_X + i * (FIG_W + BETWEEN), FIG_Y, FIG_W, FIG_H),
    );
  }

  function regionFor(ops: DrawOp[]): FigureRegion {
    const x = Math.min(...ops.map((o) => o.x));
    const right = Math.max(...ops.map((o) => o.x + o.w));
    return {
      bbox: { x: x - 1, y: FIG_Y - 1, w: right - x + 2, h: FIG_H + 2 },
      kind: "FIGURE",
      confidence: 0.9,
    };
  }

  it("4 ta yonma-yon chizma 4 ga bo'linadi", () => {
    const ops = sideBySide(4);
    const parts = splitOptionRow(regionFor(ops), ops);

    expect(parts).toHaveLength(4);
    expect(parts.every((p) => p.kind === "OPTION_ROW")).toBe(true);
    expect(parts.map((p) => p.bbox.x)).toEqual(
      ops.map((o) => o.x - FIGURE_PADDING_PT),
    );
  });

  it("2 ta yonma-yon chizma bo'linmaydi — 3-5 oralig'ida emas", () => {
    const ops = sideBySide(2);
    const region = regionFor(ops);
    expect(splitOptionRow(region, ops)).toEqual([region]);
  });

  it("chegaradan ko'p bo'lak chiqsa bo'linmaydi", () => {
    const ops = sideBySide(OPTION_SPLIT_MAX + 1);
    const region = regionFor(ops);
    expect(splitOptionRow(region, ops)).toEqual([region]);
  });

  // Bitta chizma bir necha ajralgan shtrixdan iborat bo'ladi (o'q uchi, belgi).
  // Ular orasidagi mayda bo'shliq ajratuvchi deb hisoblanmasligi kerak.
  it("chizma ichidagi mayda bo'shliq ajratuvchi hisoblanmaydi", () => {
    const STROKE_W = 25;
    // Ichki bo'shliq ajratuvchi chegarasidan tor: inner * RATIO < BETWEEN.
    const inner = BETWEEN / FIGURE_GAP_RATIO - 5;
    // Qolgan chizmalar birinchisining HAQIQIY o'ng chetidan boshlanadi,
    // shunda ular orasidagi bo'shliq BETWEEN bo'lib qoladi.
    const firstRight = BLOCK_X + STROKE_W + inner + STROKE_W;
    const ops = [
      op(BLOCK_X, FIG_Y, STROKE_W, FIG_H),
      op(BLOCK_X + STROKE_W + inner, FIG_Y, STROKE_W, FIG_H), // o'sha chizmaning 2-qismi
      op(firstRight + BETWEEN, FIG_Y, FIG_W, FIG_H),
      op(firstRight + BETWEEN + (FIG_W + BETWEEN), FIG_Y, FIG_W, FIG_H),
      op(firstRight + BETWEEN + 2 * (FIG_W + BETWEEN), FIG_Y, FIG_W, FIG_H),
    ];
    const parts = splitOptionRow(regionFor(ops), ops);

    expect(parts).toHaveLength(4);
    // Birinchi bo'lak ikkala shtrixni ham qamrab oladi.
    expect(parts[0].bbox.w).toBe(STROKE_W + inner + STROKE_W + FIGURE_PADDING_PT * 2);
  });

  it("sohaga tushadigan amal bo'lmasa soha o'zgarmaydi", () => {
    const region = regionFor(sideBySide(4));
    expect(splitOptionRow(region, [])).toEqual([region]);
  });
});

describe("shouldSkipFigure", () => {
  const PAGE: BBox = { x: 0, y: 0, w: 595, h: 842 }; // A4

  function region(bbox: BBox): FigureRegion {
    return { bbox, kind: "FIGURE", confidence: 1 };
  }

  const OK_SIZE = FIGURE_MIN_SIZE_PT + 20;
  const MIDDLE_Y = PAGE.h / 2;

  it("normal chizma tashlanmaydi", () => {
    expect(
      shouldSkipFigure(region({ x: 50, y: MIDDLE_Y, w: OK_SIZE, h: OK_SIZE }), PAGE),
    ).toBe(false);
  });

  it("chegaradan kichik chizma tashlanadi", () => {
    const small = FIGURE_MIN_SIZE_PT - 1;
    expect(
      shouldSkipFigure(region({ x: 50, y: MIDDLE_Y, w: small, h: OK_SIZE }), PAGE),
    ).toBe(true);
    expect(
      shouldSkipFigure(region({ x: 50, y: MIDDLE_Y, w: OK_SIZE, h: small }), PAGE),
    ).toBe(true);
  });

  it("keng va past soha — ajratuvchi chiziq, tashlanadi", () => {
    const wide = DIVIDER_WIDTH_RATIO * PAGE.w + 10;
    const flat = DIVIDER_MAX_HEIGHT_PT - 1;
    expect(shouldSkipFigure(region({ x: 10, y: MIDDLE_Y, w: wide, h: flat }), PAGE)).toBe(
      true,
    );
  });

  it("yuqori kolontitul tasmasidagi soha tashlanadi", () => {
    const band = HEADER_FOOTER_BAND_RATIO * PAGE.h;
    expect(
      shouldSkipFigure(region({ x: 50, y: 0, w: OK_SIZE, h: band }), PAGE),
    ).toBe(true);
  });

  it("quyi kolontitul tasmasidagi soha tashlanadi", () => {
    const band = HEADER_FOOTER_BAND_RATIO * PAGE.h;
    expect(
      shouldSkipFigure(region({ x: 50, y: PAGE.h - band, w: OK_SIZE, h: band }), PAGE),
    ).toBe(true);
  });

  // Tasmaga faqat cheti tegib turgan chizma savolniki bo'lishi mumkin.
  it("kolontitul tasmasiga qisman kirgan chizma tashlanmaydi", () => {
    const band = HEADER_FOOTER_BAND_RATIO * PAGE.h;
    expect(
      shouldSkipFigure(region({ x: 50, y: band - 5, w: OK_SIZE, h: OK_SIZE }), PAGE),
    ).toBe(false);
  });
});

describe("dedupeByHash", () => {
  const PAGE_COUNT = 10;

  function onPages(sha256: string, pages: number[]) {
    return pages.map((page) => ({ sha256, page }));
  }

  it("chegaradan ko'p sahifada uchragan hash tashlanadi", () => {
    const pages = Array.from({ length: DEDUPE_PAGE_THRESHOLD + 1 }, (_, i) => i + 1);
    const skip = dedupeByHash(onPages("logo", pages), PAGE_COUNT);
    expect(skip.has("logo")).toBe(true);
  });

  it("chegaraga teng sonli sahifada uchragan hash qoladi", () => {
    const pages = Array.from({ length: DEDUPE_PAGE_THRESHOLD }, (_, i) => i + 1);
    const skip = dedupeByHash(onPages("sxema", pages), PAGE_COUNT);
    expect(skip.has("sxema")).toBe(false);
  });

  // Takrorlanish soni emas, SAHIFALAR soni muhim.
  it("bitta sahifada ko'p marta uchragan hash tashlanmaydi", () => {
    const same = Array.from({ length: DEDUPE_PAGE_THRESHOLD + 3 }, () => ({
      sha256: "bezak",
      page: 2,
    }));
    expect(dedupeByHash(same, PAGE_COUNT).size).toBe(0);
  });

  it("kichik hujjatda dedupe ishlamaydi", () => {
    const pages = Array.from({ length: DEDUPE_PAGE_THRESHOLD }, (_, i) => i + 1);
    expect(dedupeByHash(onPages("logo", pages), DEDUPE_PAGE_THRESHOLD).size).toBe(0);
  });

  it("faqat takrorlangan hash tashlanadi, boshqalari qoladi", () => {
    const assets = [
      ...onPages("logo", [1, 2, 3, 4, 5]),
      ...onPages("chizma", [2, 3]),
    ];
    const skip = dedupeByHash(assets, PAGE_COUNT);
    expect([...skip]).toEqual(["logo"]);
  });
});
