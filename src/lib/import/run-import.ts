import type { PDFDocumentProxy } from 'pdfjs-dist';
import { detectColumns, splitIntoBlocks } from './blocks';
import { MAX_IMPORT_PAGES } from './constants';
import { dedupeByHash, type DrawOp, type FigureRegion } from './figures';
import {
  RENDER_SCALE,
  extractText,
  releaseCanvas,
  renderPageToCanvas,
} from './pdf-client';
import {
  analyzeBlockFigures,
  candidateBands,
  type BlockAnalysis,
  type SkipReason,
} from './pipeline';
export { blockText, draftOrder } from './pipeline';
import { findInkRegions, trimWhitespace, type PixelSource } from './pixels';
import type { BBox, Block, Column } from './types';

/**
 * Brauzerdagi orkestratsiya — pdfjs, canvas va sof qaror qatlamini ulaydi.
 *
 * Bu fayl ATAYLAB serverdan xabarsiz: u faqat sahifani tahlil qilib natija
 * qaytaradi, yuklashni chaqiruvchi (sahifa) bajaradi. Shu sababli
 * diagnostika rejimi (`?debug=1`) va haqiqiy import AYNAN bir xil kodni
 * ishlatadi — ekranda ko'ringan narsa serverga yoziladigan narsaning o'zi
 * bo'ladi, ikkita ajralib ketadigan yo'l emas.
 */

/** Kesib olingan bitta chizma. */
export interface CropResult {
  page: number;
  /** Oq hoshiya qirqilgandan keyingi soha, PDF nuqtalarida. */
  bbox: BBox;
  blob: Blob;
  widthPx: number;
  heightPx: number;
  sha256: string;
  /** `ImportAsset.kind` bilan bir xil lug'at. */
  kind: 'FIGURE' | 'OPTION';
}

/** Bitta blok bo'yicha tahlil — diagnostika hisoboti uchun. */
export interface BlockReport {
  blockIndex: number;
  questionNumber: number | null;
  bbox: BBox;
  analyses: BlockAnalysis[];
}

/** Bitta sahifa bo'yicha to'liq natija. */
export interface PageResult {
  page: number;
  pageWidth: number;
  pageHeight: number;
  columns: BBox[];
  blocks: Block[];
  reports: BlockReport[];
  crops: CropResult[];
}

export interface ImportProgress {
  page: number;
  totalPages: number;
  /** Foydalanuvchiga ko'rsatiladigan bosqich kaliti. */
  stage: 'text' | 'render' | 'figures' | 'upload';
}

/** Sahifadan ko'p fayl qabul qilinmaydi — brauzer xotirasi va kvota himoyasi. */
export class TooManyPagesError extends Error {
  constructor(readonly pageCount: number) {
    super(`PDF ${pageCount} sahifa, ruxsat etilgani ${MAX_IMPORT_PAGES}`);
    this.name = 'TooManyPagesError';
  }
}

// ---------------------------------------------------------------------------
// Yordamchilar
// ---------------------------------------------------------------------------

/** Ustunlarni diagnostikada chizish uchun to'rtburchakka aylantiradi. */
function columnBoxes(columns: Column[], pageHeight: number): BBox[] {
  return columns.map((c) => ({ x: c.xMin, y: 0, w: c.xMax - c.xMin, h: pageHeight }));
}

async function sha256Hex(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas PNG ga aylanmadi'));
    }, 'image/png');
  });
}

/** Sahifa canvas'idan berilgan sohani (nuqtalarda) kesib, PNG qaytaradi. */
async function cropRegion(
  pageCanvas: HTMLCanvasElement,
  bbox: BBox,
): Promise<{ blob: Blob; widthPx: number; heightPx: number } | null> {
  const sx = Math.max(0, Math.floor(bbox.x * RENDER_SCALE));
  const sy = Math.max(0, Math.floor(bbox.y * RENDER_SCALE));
  const sw = Math.min(pageCanvas.width - sx, Math.ceil(bbox.w * RENDER_SCALE));
  const sh = Math.min(pageCanvas.height - sy, Math.ceil(bbox.h * RENDER_SCALE));
  if (sw <= 0 || sh <= 0) return null;

  const out = document.createElement('canvas');
  out.width = sw;
  out.height = sh;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('2D kontekst olinmadi');
  // Fon oq — kesilgan rasm PNG'da shaffof bo'lib qolmasin (ko'rib chiqish
  // ekranida qora mavzuda o'qib bo'lmas edi).
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, sw, sh);
  // `drawImage` — `ImageData` orqali emas: kesish GPU tomonida bajariladi va
  // oraliqda yana bir nusxa xotirada paydo bo'lmaydi.
  ctx.drawImage(pageCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

  const blob = await toBlob(out);
  const result = { blob, widthPx: sw, heightPx: sh };
  releaseCanvas(out);
  return result;
}

/** Sohaning o'zini (butun sahifani emas) piksel manbai qilib oladi. */
function readPixels(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  rect: BBox,
): PixelSource | null {
  const sx = Math.max(0, Math.floor(rect.x * RENDER_SCALE));
  const sy = Math.max(0, Math.floor(rect.y * RENDER_SCALE));
  const sw = Math.min(canvas.width - sx, Math.ceil(rect.w * RENDER_SCALE));
  const sh = Math.min(canvas.height - sy, Math.ceil(rect.h * RENDER_SCALE));
  if (sw <= 0 || sh <= 0) return null;

  const image = ctx.getImageData(sx, sy, sw, sh);
  return {
    data: image.data,
    width: image.width,
    height: image.height,
    // Tasvir sahifaning bir bo'lagi, shuning uchun uning (0,0) i sahifaning
    // (0,0) i emas — `pixels.ts` koordinatani shu orqali qaytaradi.
    originPt: { x: sx / RENDER_SCALE, y: sy / RENDER_SCALE },
  };
}

// ---------------------------------------------------------------------------
// Sahifa quvuri
// ---------------------------------------------------------------------------

/**
 * Bitta sahifani to'liq ishlaydi: matn → bloklar → chizmalar → kesilgan PNG.
 *
 * BUTUN SAHIFANING `ImageData` SI OLINMAYDI: A4 300 DPI da u ≈ 35 MB, va
 * auditoriyaning 80% i telefonda. Piksel faqat nomzod bandlar va tasdiqlangan
 * sohalar uchun o'qiladi — sahifada odatda bir necha MB bo'ladi.
 */
export interface ProcessPageOptions {
  onStage?: (stage: ImportProgress['stage']) => void;
  /**
   * Sahifa canvas'i BO'SHATILISHIDAN OLDIN chaqiriladi — diagnostika rejimi
   * shu yerda aksni kichraytirib nusxalaydi. Canvas chaqiruvdan keyin yaroqsiz
   * bo'ladi, shuning uchun havolasini saqlab qo'yish mumkin emas (40 sahifalik
   * faylda ularni saqlash telefon xotirasini shundoq ham tugatardi).
   */
  onCanvas?: (canvas: HTMLCanvasElement, result: PageResult) => void | Promise<void>;
}

export async function processPage(
  pdf: PDFDocumentProxy,
  page: number,
  options: ProcessPageOptions = {},
): Promise<PageResult> {
  const { onStage, onCanvas } = options;
  onStage?.('text');
  const { items, pageWidth, pageHeight } = await extractText(pdf, page);
  const columns = detectColumns(items, pageWidth);
  const blocks = splitIntoBlocks(columns, page);
  const pageBox: BBox = { x: 0, y: 0, w: pageWidth, h: pageHeight };

  const result: PageResult = {
    page,
    pageWidth,
    pageHeight,
    columns: columnBoxes(columns, pageHeight),
    blocks,
    reports: [],
    crops: [],
  };

  // Matn bloklari yo'q sahifada (muqova, mundarija) render ham keraksiz.
  if (blocks.length === 0) return result;

  onStage?.('render');
  const canvas = await renderPageToCanvas(pdf, page);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D kontekst olinmadi');

  try {
    onStage?.('figures');
    for (const block of blocks) {
      const ops: DrawOp[] = [];
      for (const band of candidateBands(block)) {
        const pixels = readPixels(ctx, canvas, band);
        if (pixels) ops.push(...findInkRegions(pixels, band, RENDER_SCALE));
      }

      const analyses = analyzeBlockFigures(block, ops, pageBox);
      result.reports.push({
        blockIndex: block.index,
        questionNumber: block.number,
        bbox: block.bbox,
        analyses,
      });

      for (const analysis of analyses) {
        for (const region of analysis.confirmed) {
          const crop = await cropConfirmed(ctx, canvas, region, page);
          if (crop) result.crops.push(crop);
        }
      }
    }

    await onCanvas?.(canvas, result);
  } finally {
    releaseCanvas(canvas);
  }

  return result;
}

/** Tasdiqlangan sohani qirqib, PNG va hash bilan qaytaradi. */
async function cropConfirmed(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  region: FigureRegion,
  page: number,
): Promise<CropResult | null> {
  const pixels = readPixels(ctx, canvas, region.bbox);
  if (!pixels) return null;

  const trimmed = trimWhitespace(pixels, region.bbox, RENDER_SCALE);
  if (trimmed.w <= 0 || trimmed.h <= 0) return null;

  const cropped = await cropRegion(canvas, trimmed);
  if (!cropped) return null;

  return {
    page,
    bbox: trimmed,
    blob: cropped.blob,
    widthPx: cropped.widthPx,
    heightPx: cropped.heightPx,
    sha256: await sha256Hex(cropped.blob),
    kind: region.kind === 'OPTION_ROW' ? 'OPTION' : 'FIGURE',
  };
}

/**
 * Sahifalar bo'ylab takrorlangan grafikalarni (logotip, kolontitul bezagi)
 * belgilaydi.
 *
 * Faqat BARCHA sahifalar ishlangach chaqirilishi mumkin — takroriylik bir
 * sahifaga qarab aniqlanmaydi.
 */
export function markDuplicates(
  crops: CropResult[],
  pageCount: number,
): { kept: CropResult[]; skipped: { crop: CropResult; reason: SkipReason }[] } {
  const duplicateHashes = dedupeByHash(crops, pageCount);
  const kept: CropResult[] = [];
  const skipped: { crop: CropResult; reason: SkipReason }[] = [];
  for (const crop of crops) {
    if (duplicateHashes.has(crop.sha256)) skipped.push({ crop, reason: 'DEDUPE' });
    else kept.push(crop);
  }
  return { kept, skipped };
}

/** Sahifa sonini tekshiradi — 40 dan ko'pi qabul qilinmaydi. */
export function assertPageCount(pdf: PDFDocumentProxy): number {
  if (pdf.numPages > MAX_IMPORT_PAGES) throw new TooManyPagesError(pdf.numPages);
  return pdf.numPages;
}
