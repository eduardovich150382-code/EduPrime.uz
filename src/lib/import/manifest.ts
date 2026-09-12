import {
  COLUMN_SPLIT_MIN_RATIO,
  FULL_WIDTH_ROW_RATIO,
  HEADER_FOOTER_BAND_RATIO,
} from './constants';
import type { BBox } from './types';

/**
 * PyMuPDF manifesti — import quvurining birinchi bosqichi.
 *
 * Ustoz kompyuterida `Rasm_ajratgich.py` (matn qatlami bor PDF) yoki
 * `scan_kesuvchi.py` (skan) ishga tushadi va `manifest.json` + `rasmlar/` +
 * `sahifalar/` dan iborat ZIP beradi. Brauzerdagi pdfjs geometriyasi
 * (./columns, ./blocks, ./figures, ./pixels) o'rniga shu ishlatiladi: PyMuPDF
 * matn bloklari va rasm koordinatalarini PDF'ning o'zidan oladi, biz esa
 * ularni siyoh va bo'shliqlardan taxmin qilardik.
 *
 * Bu fayl SOF: fflate ham, brauzer ham, baza ham yo'q — ZIP'ni ochish
 * ./manifest-client da. Koordinatalar ./types dagi konvensiyada (PDF
 * nuqtasi, yuqori-chap boshlanish, `y` pastga) — skript ham aynan shunday
 * yozadi (`fitz.Rect` → x/y/w/h).
 *
 * Bu yerda — manifest turlari va sahifa geometriyasi (ustunlar, kolontitul
 * tasmasi). Savollarga guruhlash — ./grouping, u butun hujjat ustida ishlaydi.
 */

export interface ManifestBlock {
  order: number;
  bbox: BBox;
  text: string;
}

export interface ManifestImage {
  order: number;
  bbox: BBox;
  /** ZIP ichidagi yo'l, manifest papkasiga nisbatan (`rasmlar/rasm_12.png`). */
  file: string;
}

export interface ManifestPage {
  /** ASL PDF sahifa raqami — `pageCount` dan katta bo'lishi odatiy. */
  page: number;
  width: number;
  height: number;
  pageImage?: string;
  blocks: ManifestBlock[];
  images: ManifestImage[];
}

export interface Manifest {
  version: number;
  kind: 'auto' | 'scanned';
  sourceFile: string;
  sourceLang: string;
  pageCount: number;
  pages: ManifestPage[];
}

export {
  MANIFEST_FILE,
  locateManifest,
  parseManifest,
  type ManifestError,
  type ManifestErrorCode,
} from './manifest-validate';

// ---------------------------------------------------------------------------
// 1. Ustunlar
// ---------------------------------------------------------------------------

export function centerX(b: BBox): number {
  return b.x + b.w / 2;
}

export function centerY(b: BBox): number {
  return b.y + b.h / 2;
}

/**
 * Markazi sahifaning yuqori/quyi tasmasida — kolontitul ("~ 23 ~ Innova
 * o'quv markazi"). Markaz bo'yicha, butunlay tasma ichida bo'lishi shart
 * emas: PyMuPDF kolontitulni ba'zan ostidagi satr bilan bitta blokka qo'shadi
 * va blok tasmadan biroz chiqib ketadi.
 */
export function inHeaderFooterBand(b: BBox, page: ManifestPage): boolean {
  const band = HEADER_FOOTER_BAND_RATIO * page.height;
  const cy = centerY(b);
  return cy < band || cy > page.height - band;
}

export interface ColumnLayout {
  columns: { xMin: number; xMax: number }[];
  /** Ikki ustun orasidagi chegara (x-markaz bo'yicha); bitta ustunda `null`. */
  splitX: number | null;
}

function span(blocks: ManifestBlock[]): { xMin: number; xMax: number } {
  return {
    xMin: Math.min(...blocks.map((b) => b.bbox.x)),
    xMax: Math.max(...blocks.map((b) => b.bbox.x + b.bbox.w)),
  };
}

export function columnLayout(page: ManifestPage): ColumnLayout {
  // Sarlavha va kolontitul ikkala ustunni kesib o'tadi — ularning markazi
  // sahifa o'rtasiga tushib, ustunlar orasidagi bo'shliqni "to'ldirib"
  // qo'yardi (./constants#FULL_WIDTH_ROW_RATIO izohiga qarang).
  const eligible = page.blocks.filter(
    (b) => b.bbox.w <= FULL_WIDTH_ROW_RATIO * page.width && !inHeaderFooterBand(b.bbox, page),
  );
  if (eligible.length === 0) return { columns: [{ xMin: 0, xMax: page.width }], splitX: null };

  const centers = eligible.map((b) => centerX(b.bbox)).sort((a, b) => a - b);
  let gap = 0;
  let at = -1;
  for (let i = 0; i < centers.length - 1; i++) {
    const d = centers[i + 1] - centers[i];
    if (d > gap) {
      gap = d;
      at = i;
    }
  }

  // Eng katta oraliq — ikki klasterning bir-biriga eng yaqin markazlari
  // orasidagi masofa. U ham chegaradan katta bo'lsa, klasterlar aniq ajralgan.
  if (at < 0 || gap <= COLUMN_SPLIT_MIN_RATIO * page.width) {
    return { columns: [span(eligible)], splitX: null };
  }
  const splitX = (centers[at] + centers[at + 1]) / 2;
  const left = eligible.filter((b) => centerX(b.bbox) < splitX);
  const right = eligible.filter((b) => centerX(b.bbox) >= splitX);
  return { columns: [span(left), span(right)], splitX };
}

/**
 * Sahifa ustunlari — blok x-markazlarini ikki klasterga ajratish orqali.
 * Ikkitadan ko'p ustun qidirilmaydi: DTM va maktab to'plamlarida uchinchi
 * ustun amalda uchramaydi, har qanday uch ustunli "topilma" esa shovqin.
 */
export function detectColumnsFromBlocks(page: ManifestPage): { xMin: number; xMax: number }[] {
  return columnLayout(page).columns;
}

/** To'rtburchaklarning birlashgan qamrovi. Bo'sh massiv berilmasin. */
export function union(boxes: BBox[]): BBox {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const right = Math.max(...boxes.map((b) => b.x + b.w));
  const bottom = Math.max(...boxes.map((b) => b.y + b.h));
  return { x, y, w: right - x, h: bottom - y };
}
