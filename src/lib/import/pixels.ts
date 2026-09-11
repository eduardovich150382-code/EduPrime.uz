import { INK_LUMINANCE_THRESHOLD, INK_MERGE_GAP_PT } from "./constants";
import type { DrawOp } from "./figures";
import type { BBox } from "./types";

/**
 * Render qilingan sahifadan chizmani PIKSEL bo'yicha topuvchi sof funksiyalar.
 *
 * NIMA UCHUN PIKSEL, OPERATOR EMAS: pdfjs `getOperatorList()` chizish
 * amallarini joriy transformatsiya matritsasidagi koordinatalarda beradi —
 * haqiqiy sahifa koordinatasini olish uchun grafik holat stekini (q/Q, cm,
 * clip) qo'lda simulyatsiya qilish kerak. U murakkab, va xatosi jimgina:
 * chizma "topiladi", lekin sahifaning boshqa joyidan kesiladi. Render
 * qilingan aksda esa hech qanday matritsa yo'q — oq bo'lmagan piksel bor
 * yoki yo'q.
 *
 * Bu fayl brauzer API'siga BOG'LANMAYDI: kirish `ImageData` ning shakli
 * (`PixelSource`), `ImageData` ning o'zi emas — shu sababli node'da sun'iy
 * massiv bilan to'liq test qilinadi.
 *
 * Koordinata konvensiyasi — ./types faylining boshidagi izoh. Kirish
 * to'rtburchagi ham, natija ham PDF NUQTALARIDA; piksel faqat shu faylning
 * ichida ko'rinadi.
 */

/**
 * Render qilingan tasvirning bir bo'lagi.
 *
 * `originPt` shuning uchun kerak: chaqiruvchi butun sahifani emas, faqat
 * kerakli bandni `getImageData` qiladi (A4 300 DPI da butun sahifa ≈ 35 MB,
 * telefonda bu jiddiy), shuning uchun tasvirning (0,0) i sahifaning (0,0) i
 * bo'lmaydi.
 */
export interface PixelSource {
  /** RGBA, qator-bo'yicha — `ImageData.data` bilan bir xil tartib. */
  data: Uint8ClampedArray;
  width: number;
  height: number;
  /** Tasvirning sahifadagi yuqori-chap burchagi, PDF nuqtalarida. Sukut (0,0). */
  originPt?: { x: number; y: number };
}

/** Tasvirning piksel indekslaridagi to'rtburchagi (faqat shu fayl ichida). */
interface PixelRect {
  x0: number;
  y0: number;
  /** Chegara kirmaydi. */
  x1: number;
  /** Chegara kirmaydi. */
  y1: number;
}

// ---------------------------------------------------------------------------
// Piksel yordamchilari
// ---------------------------------------------------------------------------

/**
 * Piksel siyohmi?
 *
 * Alfa kanali ATAYLAB hisobga olinadi: pdfjs sahifani shaffof fonga render
 * qiladi, shaffof piksel esa RGBA'da (0,0,0,0) — ya'ni tekshirilmasa eng qora
 * piksel bo'lib ko'rinadi va butunlay bo'sh sahifa "siyoh"ga to'lib ketadi.
 * Shuning uchun piksel avval oq fon ustiga qo'yiladi.
 */
function isInk(data: Uint8ClampedArray, idx: number): boolean {
  const alpha = data[idx + 3] / 255;
  const luma = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  const overWhite = luma * alpha + 255 * (1 - alpha);
  return overWhite < INK_LUMINANCE_THRESHOLD;
}

/** Nuqtalardagi to'rtburchakni tasvir ichidagi piksel oralig'iga o'giradi. */
function toPixelRect(img: PixelSource, rect: BBox, scale: number): PixelRect {
  const origin = img.originPt ?? { x: 0, y: 0 };
  const clampX = (v: number) => Math.max(0, Math.min(img.width, v));
  const clampY = (v: number) => Math.max(0, Math.min(img.height, v));
  return {
    x0: clampX(Math.floor((rect.x - origin.x) * scale)),
    y0: clampY(Math.floor((rect.y - origin.y) * scale)),
    x1: clampX(Math.ceil((rect.x + rect.w - origin.x) * scale)),
    y1: clampY(Math.ceil((rect.y + rect.h - origin.y) * scale)),
  };
}

/** Piksel to'rtburchagini yana PDF nuqtalariga qaytaradi. */
function toPointBox(img: PixelSource, r: PixelRect, scale: number): BBox {
  const origin = img.originPt ?? { x: 0, y: 0 };
  return {
    x: origin.x + r.x0 / scale,
    y: origin.y + r.y0 / scale,
    w: (r.x1 - r.x0) / scale,
    h: (r.y1 - r.y0) / scale,
  };
}

// ---------------------------------------------------------------------------
// Bog'langan sohalar
// ---------------------------------------------------------------------------

/**
 * Sohalar qator-bo'yicha yugurishlarni (run) birlashtirish orqali topiladi,
 * piksel-bo'yicha BFS bilan EMAS: 300 DPI da bitta band millionlab pikseldan
 * iborat va har piksel uchun navbat elementini yaratish sezilarli sekin.
 * Yugurishlar soni esa odatda pikselnikidan yuzlab marta kam.
 */
class UnionFind {
  private parent: number[] = [];

  make(): number {
    this.parent.push(this.parent.length);
    return this.parent.length - 1;
  }

  find(a: number): number {
    let root = a;
    while (this.parent[root] !== root) root = this.parent[root];
    // Yo'lni qisqartirish — uzun zanjir hosil bo'lib qolmasin.
    let cur = a;
    while (this.parent[cur] !== root) {
      const next = this.parent[cur];
      this.parent[cur] = root;
      cur = next;
    }
    return root;
  }

  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[rb] = ra;
  }
}

/** Bitta qatordagi uzluksiz siyoh bo'lagi. */
interface Run {
  x0: number;
  /** Chegara kirmaydi. */
  x1: number;
  id: number;
}

/** Berilgan qatordagi siyoh yugurishlarini topadi. */
function scanRow(img: PixelSource, y: number, x0: number, x1: number, uf: UnionFind): Run[] {
  const runs: Run[] = [];
  const rowStart = y * img.width;
  let start = -1;
  for (let x = x0; x < x1; x++) {
    if (isInk(img.data, (rowStart + x) * 4)) {
      if (start < 0) start = x;
    } else if (start >= 0) {
      runs.push({ x0: start, x1: x, id: uf.make() });
      start = -1;
    }
  }
  if (start >= 0) runs.push({ x0: start, x1, id: uf.make() });
  return runs;
}

/**
 * Ustma-ust tushgan yugurishlarni bog'laydi.
 *
 * Qiya tegish ham bog'lanish deb qabul qilinadi (8-qo'shnilik): diagonal
 * chiziq aks holda har qatorda uzilib, o'nlab mayda soha bo'lib chiqardi.
 */
function linkRows(prev: Run[], cur: Run[], uf: UnionFind): void {
  for (const run of cur) {
    for (const above of prev) {
      if (above.x1 < run.x0 || above.x0 > run.x1) continue;
      uf.union(above.id, run.id);
    }
  }
}

// ---------------------------------------------------------------------------
// Sohalarni birlashtirish
// ---------------------------------------------------------------------------

/** Ikki to'rtburchak orasidagi bo'shliq (kesishsa — 0). */
function gapBetween(a: BBox, b: BBox): { dx: number; dy: number } {
  return {
    dx: Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w)),
    dy: Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h)),
  };
}

function unite(a: BBox, b: BBox): BBox {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    w: Math.max(a.x + a.w, b.x + b.w) - x,
    h: Math.max(a.y + a.h, b.y + b.h) - y,
  };
}

/**
 * Yaqin turgan sohalarni bitta chizmaga yig'adi.
 *
 * Chizma deyarli hech qachon uzluksiz emas: o'q uchi, punktir chiziq va
 * alohida turgan belgilar ayrim sohalar bo'lib chiqadi. Ular birlashtirilmasa
 * bitta chizma o'nlab mayda rasmga parchalanib ketadi.
 *
 * Barqarorlashguncha takrorlanadi: A va B birlashgach, hosil bo'lgan kattaroq
 * to'rtburchak endi C ga ham yetib borishi mumkin — bitta o'tishda bunday
 * zanjirlar to'liq yig'ilmay qoladi.
 */
function mergeNearby(boxes: BBox[], gapPt: number): BBox[] {
  let current = boxes;
  let changed = true;
  while (changed) {
    changed = false;
    const next: BBox[] = [];
    for (const box of current) {
      let merged = box;
      for (let i = next.length - 1; i >= 0; i--) {
        const gap = gapBetween(next[i], merged);
        if (gap.dx < gapPt && gap.dy < gapPt) {
          merged = unite(next[i], merged);
          next.splice(i, 1);
          changed = true;
        }
      }
      next.push(merged);
    }
    current = next;
  }
  return current;
}

// ---------------------------------------------------------------------------
// Ommaviy API
// ---------------------------------------------------------------------------

/**
 * Berilgan band ichidagi siyoh sohalarini topadi va har birini bitta `DrawOp`
 * qilib qaytaradi (PDF nuqtalarida).
 *
 * Natija to'g'ridan-to'g'ri `findFigureRegions` ga uzatiladi — shuning uchun
 * `kind: 'path'`: render qilingan aksda vektor chiziqni joylashtirilgan
 * rasmdan ajratib bo'lmaydi, va quvurning keyingi bosqichlari bu farqni
 * baribir ishlatmaydi.
 *
 * Butun sahifa emas, faqat `bandRect` skanerlanadi — sahifada chizma
 * bo'lmagan joy ko'p va uni tekshirish behuda vaqt.
 *
 * `scale` — piksel/nuqta nisbati (`RENDER_DPI / 72`).
 */
export function findInkRegions(img: PixelSource, bandRect: BBox, scale: number): DrawOp[] {
  const rect = toPixelRect(img, bandRect, scale);
  if (rect.x1 <= rect.x0 || rect.y1 <= rect.y0) return [];

  const uf = new UnionFind();
  const extents = new Map<number, PixelRect>();
  const allRuns: Run[] = [];
  let prev: Run[] = [];

  for (let y = rect.y0; y < rect.y1; y++) {
    const runs = scanRow(img, y, rect.x0, rect.x1, uf);
    for (const run of runs) {
      extents.set(run.id, { x0: run.x0, y0: y, x1: run.x1, y1: y + 1 });
      allRuns.push(run);
    }
    linkRows(prev, runs, uf);
    prev = runs;
  }

  if (allRuns.length === 0) return [];

  // Qamrov ildiz bo'yicha yig'iladi va `find` faqat HAMMA birlashtirish
  // tugagach chaqiriladi — skanerlash paytida chaqirilsa oraliq ildiz olinib,
  // keyinroq bog'langan yugurishlar alohida sohada qolib ketardi.
  const byRoot = new Map<number, PixelRect>();
  for (const run of allRuns) {
    const root = uf.find(run.id);
    const own = extents.get(run.id) as PixelRect;
    const acc = byRoot.get(root);
    if (!acc) {
      byRoot.set(root, { ...own });
      continue;
    }
    acc.x0 = Math.min(acc.x0, own.x0);
    acc.y0 = Math.min(acc.y0, own.y0);
    acc.x1 = Math.max(acc.x1, own.x1);
    acc.y1 = Math.max(acc.y1, own.y1);
  }

  const boxes = [...byRoot.values()].map((r) => toPointBox(img, r, scale));
  return mergeNearby(boxes, INK_MERGE_GAP_PT).map((bbox) => ({
    kind: "path" as const,
    x: bbox.x,
    y: bbox.y,
    w: bbox.w,
    h: bbox.h,
  }));
}

/**
 * To'rtburchak chekkalaridagi butunlay oq qator va ustunlarni qirqadi.
 *
 * Ortiqcha oq maydon ikki marta zarar: kesilgan rasm kattalashadi va ko'rib
 * chiqish ekranida chizmaning o'zi uning ichida kichkina bo'lib qoladi.
 *
 * Soha butunlay oq bo'lsa eni va bo'yi NOL qaytariladi — chaqiruvchi bunday
 * sohani saqlamasligi kerak.
 *
 * `scale` — `findInkRegions` dagi bilan bir xil piksel/nuqta nisbati. U
 * majburiy: tasvir pikselda, to'rtburchak esa nuqtada o'lchanadi, shuning
 * uchun nisbatsiz ularni solishtirib bo'lmaydi.
 */
export function trimWhitespace(img: PixelSource, rect: BBox, scale: number): BBox {
  const r = toPixelRect(img, rect, scale);
  if (r.x1 <= r.x0 || r.y1 <= r.y0) return { x: rect.x, y: rect.y, w: 0, h: 0 };

  let top = -1;
  let bottom = -1;
  let left = r.x1;
  let right = r.x0;

  for (let y = r.y0; y < r.y1; y++) {
    const rowStart = y * img.width;
    let rowLeft = -1;
    let rowRight = -1;
    for (let x = r.x0; x < r.x1; x++) {
      if (!isInk(img.data, (rowStart + x) * 4)) continue;
      if (rowLeft < 0) rowLeft = x;
      rowRight = x;
    }
    if (rowLeft < 0) continue;
    if (top < 0) top = y;
    bottom = y;
    left = Math.min(left, rowLeft);
    right = Math.max(right, rowRight);
  }

  if (top < 0) return { x: rect.x, y: rect.y, w: 0, h: 0 };
  return toPointBox(img, { x0: left, y0: top, x1: right + 1, y1: bottom + 1 }, scale);
}
