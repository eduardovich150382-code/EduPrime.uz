import { FIGURE_GAP_RATIO } from "./constants";
import {
  figureSkipReason,
  findFigureRegions,
  splitOptionRow,
  type DrawOp,
  type FigureRegion,
  type FigureSkipReason,
} from "./figures";
import type { BBox, Block } from "./types";

/**
 * Quvurning QAROR qismi — sof funksiyalar.
 *
 * Bu yerda pdfjs ham, canvas ham, tarmoq ham yo'q: kirish — bloklar va
 * topilgan siyoh sohalari, chiqish — qaysi soha saqlanadi va qaysi biri nima
 * sababdan tashlanadi. Brauzerdagi orkestratsiya ./run-import faylida, u shu
 * funksiyalarni chaqiradi.
 *
 * Shunday ajratilgani uchun butun qaror mantig'i node'da, haqiqiy PDF'siz
 * test qilinadi — va diagnostika rejimi ham aynan shu natijani chizadi,
 * ya'ni ekranda ko'ringan narsa serverga yoziladigan narsaning o'zi.
 */

/**
 * Soha nima uchun saqlanmagani.
 *
 * `NO_INK` va `DEDUPE` `figures.ts` dagi uchta sababga qo'shiladi: birinchisi
 * qatorlar orasidagi bo'shliq shunchaki bo'sh joy bo'lgan holat (chizma
 * umuman topilmadi), ikkinchisi esa bir necha sahifada takrorlangani uchun
 * logotip deb topilgan soha — u faqat BARCHA sahifalar ishlangach ma'lum
 * bo'ladi, shuning uchun bu faylda emas, ./run-import da qo'llanadi.
 */
export type SkipReason = FigureSkipReason | "NO_INK" | "DEDUPE";

export interface SkippedRegion {
  bbox: BBox;
  reason: SkipReason;
}

/** Bitta nomzod band bo'yicha tahlil natijasi. */
export interface BlockAnalysis {
  /** Qatorlar orasidagi bo'shliq — diagnostikada sariq. */
  band: BBox;
  /** Shu bandga tushgan siyoh sohalari. */
  ops: DrawOp[];
  /** Saqlanadigan chizmalar — diagnostikada qizil. */
  confirmed: FigureRegion[];
  /** Tashlangan sohalar va sababi — diagnostikada kulrang. */
  skipped: SkippedRegion[];
}

/** Ikki to'rtburchak kesishadimi (chekka tegishi kesishuv emas). */
function overlaps(a: BBox, b: BBox): boolean {
  return (
    a.x + a.w > b.x && a.x < b.x + b.w && a.y + a.h > b.y && a.y < b.y + b.h
  );
}

/**
 * Blok qatorlari orasidagi, chizma bo'lishi mumkin bo'lgan bo'shliqlar.
 *
 * `findFigureRegions` bilan AYNAN bir xil chegara ishlatiladi (o'rtacha qator
 * balandligining `FIGURE_GAP_RATIO` barobari) — aks holda bu yerda nomzod
 * deb ko'rsatilgan band u yerda e'tiborsiz qolib, diagnostika rasmi
 * haqiqatdan chetga chiqardi.
 *
 * Bandning gorizontal chegarasi — blokning o'zi: qo'shni ustundagi chizma bu
 * blokka tegishli emas.
 */
export function candidateBands(block: Block, gapRatio: number = FIGURE_GAP_RATIO): BBox[] {
  const rows = [...block.rows].sort((a, b) => a.y - b.y);
  if (rows.length < 2) return [];

  const avgRowHeight = rows.reduce((sum, r) => sum + r.height, 0) / rows.length;
  if (avgRowHeight <= 0) return [];

  const bands: BBox[] = [];
  for (let i = 0; i < rows.length - 1; i++) {
    const top = rows[i].y + rows[i].height;
    const gapHeight = rows[i + 1].y - top;
    if (gapHeight <= gapRatio * avgRowHeight) continue;
    bands.push({ x: block.bbox.x, y: top, w: block.bbox.w, h: gapHeight });
  }
  return bands;
}

/**
 * Blokdagi har bir nomzod band uchun: qaysi chizma saqlanadi, qaysi biri
 * nima sababdan tashlanadi.
 *
 * `findFigureRegions` bir marta, BUTUN blok uchun chaqiriladi va natijasi
 * bandlarga taqsimlanadi — soha chegaralarini bu yerda qayta hisoblash
 * ikkita mustaqil realizatsiya hosil qilardi va ular vaqt o'tib ajralib
 * ketardi.
 */
export function analyzeBlockFigures(
  block: Block,
  ops: DrawOp[],
  pageBox: BBox,
): BlockAnalysis[] {
  const bands = candidateBands(block);
  const regions = findFigureRegions(block, ops);

  return bands.map((band) => {
    const bandOps = ops.filter((op) => overlaps(op, band));
    const analysis: BlockAnalysis = { band, ops: bandOps, confirmed: [], skipped: [] };

    // Soha o'z bandi ichidan chiqmaydi (u bandga tushgan ops'lardan
    // yasalgan), shuning uchun kesishuv bo'yicha taqsimlash yetarli.
    const bandRegions = regions.filter((r) => overlaps(r.bbox, band));

    if (bandRegions.length === 0) {
      analysis.skipped.push({ bbox: band, reason: "NO_INK" });
      return analysis;
    }

    for (const region of bandRegions) {
      // Yonma-yon turgan A/B/C/D chizmalari alohida rasm bo'lishi kerak —
      // bitta keng rasmda variantni savolga bog'lab bo'lmaydi.
      for (const part of splitOptionRow(region, ops)) {
        const reason = figureSkipReason(part, pageBox);
        if (reason) analysis.skipped.push({ bbox: part.bbox, reason });
        else analysis.confirmed.push(part);
      }
    }

    return analysis;
  });
}

// ---------------------------------------------------------------------------
// Draft uchun yordamchilar
// ---------------------------------------------------------------------------

/** Bir blokdan foydalanuvchi ko'radigan matn — qatorlar tartibi saqlanadi. */
export function blockText(block: Block): string {
  return [...block.rows]
    .sort((a, b) => a.y - b.y)
    .map((row) => row.text)
    .join("\n");
}

/**
 * Blokning `ImportDraft.order` qiymati.
 *
 * Sahifa raqamidan HISOBLANADI, o'suvchi hisoblagichdan emas: uzilgan import
 * qayta ulanganda tugagan sahifalar o'tkazib yuboriladi va hisoblagich
 * boshqacha qiymatdan boshlanardi — o'sha blok endi boshqa `order` bilan
 * yozilib, `@@unique([jobId, order])` idempotentligi buzilardi. Bu formula
 * esa sahifalar qaysi tartibda va necha marta ishlansa ham bir xil natija
 * beradi. Oraliqdagi bo'shliqlar zararsiz — `order` faqat saralash va
 * yagonalik uchun ishlatiladi.
 *
 * `BLOCKS_PER_PAGE` sahifadagi bloklar sonidan katta bo'lishi shart, aks
 * holda keyingi sahifaning birinchi bloki oldingisining oxirgisi bilan
 * to'qnashardi.
 */
export const BLOCKS_PER_PAGE = 1000;

export function draftOrder(page: number, blockIndex: number): number {
  return page * BLOCKS_PER_PAGE + blockIndex;
}
