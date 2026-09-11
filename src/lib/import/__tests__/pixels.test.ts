import { describe, expect, it } from "vitest";
import { INK_MERGE_GAP_PT } from "../constants";
import { findInkRegions, trimWhitespace, type PixelSource } from "../pixels";
import type { BBox } from "../types";

/**
 * Sun'iy `ImageData` massivlari — haqiqiy rasm ham, brauzer ham kerak emas.
 * Sukut bo'yicha `scale` 1 olinadi: bitta piksel = bitta nuqta, shuning uchun
 * kutilgan qiymatlarni qo'lda hisoblash oson va test masshtab arifmetikasini
 * emas, sohalarni topish mantig'ini tekshiradi.
 */
function whiteImage(width: number, height: number, originPt?: { x: number; y: number }): PixelSource {
  const data = new Uint8ClampedArray(width * height * 4);
  data.fill(255);
  return { data, width, height, originPt };
}

/** Berilgan to'rtburchakni qora bilan to'ldiradi (piksel koordinatalarida). */
function fill(img: PixelSource, x: number, y: number, w: number, h: number): void {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      const idx = (py * img.width + px) * 4;
      img.data[idx] = 0;
      img.data[idx + 1] = 0;
      img.data[idx + 2] = 0;
      img.data[idx + 3] = 255;
    }
  }
}

const WHOLE: BBox = { x: 0, y: 0, w: 100, h: 100 };

describe("findInkRegions", () => {
  it("bitta bog'langan sohani bitta DrawOp qilib qaytaradi", () => {
    const img = whiteImage(100, 100);
    fill(img, 10, 20, 30, 15);

    const ops = findInkRegions(img, WHOLE, 1);

    expect(ops).toHaveLength(1);
    expect(ops[0]).toEqual({ kind: "path", x: 10, y: 20, w: 30, h: 15 });
  });

  it("uzoq turgan ikki sohani alohida qoldiradi", () => {
    const img = whiteImage(100, 100);
    fill(img, 5, 5, 10, 10);
    fill(img, 60, 5, 10, 10);

    const ops = findInkRegions(img, WHOLE, 1);

    expect(ops).toHaveLength(2);
    expect(ops.map((o) => o.x).sort((a, b) => a - b)).toEqual([5, 60]);
  });

  it("INK_MERGE_GAP_PT dan yaqin ikki sohani birlashtiradi", () => {
    const img = whiteImage(100, 100);
    // Bo'shliq chegaradan kichik — bu bitta chizmaning uzuq chizig'i.
    const gap = INK_MERGE_GAP_PT - 1;
    fill(img, 10, 10, 10, 10);
    fill(img, 20 + gap, 10, 10, 10);

    const ops = findInkRegions(img, WHOLE, 1);

    expect(ops).toHaveLength(1);
    expect(ops[0].x).toBe(10);
    expect(ops[0].w).toBe(10 + gap + 10);
  });

  it("butunlay oq band uchun bo'sh massiv qaytaradi", () => {
    const img = whiteImage(100, 100);
    fill(img, 10, 80, 20, 10); // siyoh bor, lekin banddan tashqarida

    expect(findInkRegions(img, { x: 0, y: 0, w: 100, h: 50 }, 1)).toEqual([]);
  });

  it("band tashqarisidagi siyohni hisobga olmaydi", () => {
    const img = whiteImage(100, 100);
    fill(img, 10, 10, 20, 20); // band ichida
    fill(img, 10, 70, 20, 20); // band tashqarisida

    const ops = findInkRegions(img, { x: 0, y: 0, w: 100, h: 50 }, 1);

    expect(ops).toHaveLength(1);
    expect(ops[0].y).toBe(10);
  });

  it("shaffof pikselni siyoh deb hisoblamaydi", () => {
    // pdfjs sahifani shaffof fonga render qiladi: RGBA (0,0,0,0) tekshirilmasa
    // eng qora piksel bo'lib ko'rinardi va butun sahifa "siyoh"ga to'lardi.
    const data = new Uint8ClampedArray(50 * 50 * 4); // hammasi 0, alfa ham 0
    const img: PixelSource = { data, width: 50, height: 50 };

    expect(findInkRegions(img, { x: 0, y: 0, w: 50, h: 50 }, 1)).toEqual([]);
  });

  it("originPt ni hisobga olib sahifa koordinatasini qaytaradi", () => {
    // Tasvir — sahifaning (200, 300) nuqtasidan boshlangan bandi.
    const img = whiteImage(100, 100, { x: 200, y: 300 });
    fill(img, 10, 20, 30, 15);

    const ops = findInkRegions(img, { x: 200, y: 300, w: 100, h: 100 }, 1);

    expect(ops).toHaveLength(1);
    expect(ops[0].x).toBe(210);
    expect(ops[0].y).toBe(320);
  });

  it("masshtabni qo'llab, pikselni nuqtaga o'giradi", () => {
    const img = whiteImage(100, 100);
    fill(img, 20, 40, 20, 20);

    const ops = findInkRegions(img, { x: 0, y: 0, w: 50, h: 50 }, 2);

    expect(ops).toHaveLength(1);
    expect(ops[0]).toEqual({ kind: "path", x: 10, y: 20, w: 10, h: 10 });
  });

  it("qiya chiziqni bitta soha deb qoldiradi", () => {
    // 8-qo'shnilik bo'lmasa diagonal chiziq har qatorda uzilib, o'nlab mayda
    // sohaga parchalanib ketardi.
    const img = whiteImage(100, 100);
    for (let i = 0; i < 40; i++) fill(img, 10 + i, 10 + i, 1, 1);

    expect(findInkRegions(img, WHOLE, 1)).toHaveLength(1);
  });
});

describe("trimWhitespace", () => {
  it("chekkadagi oq hoshiyani qirqadi", () => {
    const img = whiteImage(100, 100);
    fill(img, 30, 40, 20, 10);

    const box = trimWhitespace(img, WHOLE, 1);

    expect(box).toEqual({ x: 30, y: 40, w: 20, h: 10 });
  });

  it("butunlay oq soha uchun nol o'lchamli to'rtburchak qaytaradi", () => {
    const img = whiteImage(100, 100);

    const box = trimWhitespace(img, WHOLE, 1);

    expect(box.w).toBe(0);
    expect(box.h).toBe(0);
  });

  it("berilgan to'rtburchakdan tashqariga chiqmaydi", () => {
    const img = whiteImage(100, 100);
    fill(img, 5, 5, 90, 90);

    const box = trimWhitespace(img, { x: 20, y: 20, w: 30, h: 30 }, 1);

    expect(box).toEqual({ x: 20, y: 20, w: 30, h: 30 });
  });

  it("originPt li tasvirda sahifa koordinatasini qaytaradi", () => {
    const img = whiteImage(100, 100, { x: 200, y: 300 });
    fill(img, 30, 40, 20, 10);

    const box = trimWhitespace(img, { x: 200, y: 300, w: 100, h: 100 }, 1);

    expect(box).toEqual({ x: 230, y: 340, w: 20, h: 10 });
  });
});
