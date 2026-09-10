import {
  DEDUPE_PAGE_THRESHOLD,
  DIVIDER_MAX_HEIGHT_PT,
  DIVIDER_WIDTH_RATIO,
  FIGURE_GAP_RATIO,
  FIGURE_MIN_SIZE_PT,
  FIGURE_PADDING_PT,
  HEADER_FOOTER_BAND_RATIO,
  OPTION_SPLIT_MAX,
  OPTION_SPLIT_MIN,
} from "./constants";
import type { BBox, Block } from "./types";

/**
 * Savol blokidagi chizma sohasini topuvchi sof funksiyalar.
 *
 * NIMA UCHUN SOHA, RASM EMAS: fizika va geometriya chizmalari PDF'da odatda
 * rasm obyekti (XObject/Image) emas, balki vektor chiziqlar to'plami
 * (constructPath / stroke / fill). Shuning uchun "rasmni ajratib olish"
 * ishlamaydi — biz chizma turgan TO'RTBURCHAKNI aniqlaymiz, keyin uni render
 * qilingan sahifadan kesib olamiz.
 *
 * Bu yerda kesish ham, yuklash ham yo'q: faqat geometriya. Hech qanday tashqi
 * bog'liqlik yo'q, shuning uchun haqiqiy PDF'siz to'liq test qilinadi.
 *
 * Koordinata konvensiyasi uchun ./types faylining boshidagi izohga qarang —
 * `DrawOp` ham xuddi shu tizimda keladi (PDF nuqtasi, yuqori-chap boshlanish,
 * `y` pastga o'sadi). pdfjs koordinatasini o'girish — chaqiruvchining ishi.
 */

/** Sahifadagi bitta chizish amalining qamrovi (chiziq yoki rasm obyekti). */
export interface DrawOp {
  kind: "path" | "image";
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Kesib olinadigan chizma sohasi. */
export interface FigureRegion {
  bbox: BBox;
  /** OPTION_ROW — yonma-yon variant chizmalaridan biri. */
  kind: "FIGURE" | "OPTION_ROW";
  /** 0.5 .. 1 — ops bo'shliqni qanchalik to'liq egallagani. */
  confidence: number;
}

export interface FigureOptions {
  /** Sukut bo'yicha FIGURE_GAP_RATIO. */
  gapRatio?: number;
  /** Sukut bo'yicha FIGURE_PADDING_PT. */
  paddingPt?: number;
}

// ---------------------------------------------------------------------------
// Yordamchilar
// ---------------------------------------------------------------------------

/** Ops qamrovini o'rab turuvchi to'rtburchak + har tomondan hoshiya. */
function opsBBox(ops: DrawOp[], padding: number): BBox {
  const x = Math.min(...ops.map((o) => o.x));
  const y = Math.min(...ops.map((o) => o.y));
  const right = Math.max(...ops.map((o) => o.x + o.w));
  const bottom = Math.max(...ops.map((o) => o.y + o.h));
  return {
    x: x - padding,
    y: y - padding,
    w: right - x + padding * 2,
    h: bottom - y + padding * 2,
  };
}

/** Ikki to'rtburchak kesishadimi (faqat chekka tegishi kesishuv emas). */
function intersects(op: DrawOp, box: BBox): boolean {
  return (
    op.x + op.w > box.x &&
    op.x < box.x + box.w &&
    op.y + op.h > box.y &&
    op.y < box.y + box.h
  );
}

// ---------------------------------------------------------------------------
// 1. Chizma sohalarini topish
// ---------------------------------------------------------------------------

/**
 * Blok qatorlari orasidagi katta tik bo'shliqlardan chizma sohalarini topadi.
 *
 * Bo'shliqning o'zi dalil emas — matn oralig'ida shunchaki bo'sh joy ham
 * bo'ladi. Shuning uchun bo'shliq faqat unga tushadigan chizish amali bo'lsa
 * tasdiqlanadi, va soha bo'shliqning to'lig'i emas, ops'larning HAQIQIY
 * qamroviga qisqartiriladi: aks holda kesilgan rasm bo'sh oq maydonga to'lib
 * ketadi va chizma uning ichida kichkina bo'lib qoladi.
 */
export function findFigureRegions(
  block: Block,
  ops: DrawOp[],
  opts: FigureOptions = {},
): FigureRegion[] {
  const gapRatio = opts.gapRatio ?? FIGURE_GAP_RATIO;
  const padding = opts.paddingPt ?? FIGURE_PADDING_PT;

  const rows = [...block.rows].sort((a, b) => a.y - b.y);
  if (rows.length < 2 || ops.length === 0) return [];

  const avgRowHeight = rows.reduce((sum, r) => sum + r.height, 0) / rows.length;
  if (avgRowHeight <= 0) return [];

  const regions: FigureRegion[] = [];

  for (let i = 0; i < rows.length - 1; i++) {
    const top = rows[i].y + rows[i].height;
    const bottom = rows[i + 1].y;
    const gapHeight = bottom - top;
    if (gapHeight <= gapRatio * avgRowHeight) continue;

    // Bo'shliqning gorizontal chegarasi — blokning o'zi. Qo'shni ustundagi
    // chizma bu blokka tegishli emas.
    const band: BBox = { x: block.bbox.x, y: top, w: block.bbox.w, h: gapHeight };
    const inside = ops.filter((op) => intersects(op, band));
    if (inside.length === 0) continue; // shunchaki bo'sh joy

    const bbox = opsBBox(inside, padding);
    // Ishonch — ops bo'shliqning qancha qismini egallagani. To'liq egallagan
    // bo'shliq chizma ekaniga shubha kam; bir chetida turgan mayda shtrix esa
    // qo'lda tekshirishga muhtoj.
    const covered = (bbox.h - padding * 2) / gapHeight;
    regions.push({
      bbox,
      kind: "FIGURE",
      confidence: Math.min(1, 0.5 + 0.5 * covered),
    });
  }

  return regions;
}

// ---------------------------------------------------------------------------
// 2. Variantlar qatorini bo'lish
// ---------------------------------------------------------------------------

/** Ops'larning `x` oraliqlarini kesishuvi bo'yicha birlashtiradi. */
function mergeXSpans(ops: DrawOp[]): { min: number; max: number }[] {
  const spans = ops
    .map((o) => ({ min: o.x, max: o.x + o.w }))
    .sort((a, b) => a.min - b.min);

  const merged: { min: number; max: number }[] = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span.min <= last.max) {
      last.max = Math.max(last.max, span.max);
    } else {
      merged.push({ ...span });
    }
  }
  return merged;
}

/**
 * Yonma-yon turgan 3–5 ta chizmani (A/B/C/D variantlari) alohida sohalarga
 * bo'ladi.
 *
 * Ajratuvchi bo'shliq mutlaq qiymat bilan emas, eng katta bo'shliqqa nisbatan
 * aniqlanadi: chizmalar orasidagi masofa hujjatdan hujjatga o'zgaradi, lekin
 * bitta chizma ICHIDAGI bo'shliqlar (o'q uchi, belgi, shtrixlar) har doim
 * chizmalar orasidagidan sezilarli kichik bo'ladi.
 *
 * Bo'laklar soni 3–5 dan tashqarida chiqsa, bo'linish ishonchsiz — ehtimol
 * bitta murakkab sxema parchalanmoqda — shuning uchun soha butunligicha
 * qaytariladi.
 */
export function splitOptionRow(region: FigureRegion, ops: DrawOp[]): FigureRegion[] {
  const inside = ops.filter((op) => intersects(op, region.bbox));
  if (inside.length === 0) return [region];

  const bands = mergeXSpans(inside);
  if (bands.length < OPTION_SPLIT_MIN) return [region];

  const gaps = bands.slice(1).map((band, i) => ({
    width: band.min - bands[i].max,
    // Bo'linish chegarasi — bo'shliqning o'rtasi.
    at: (bands[i].max + band.min) / 2,
  }));
  const maxGap = Math.max(...gaps.map((g) => g.width));
  if (maxGap <= 0) return [region];

  const boundaries = gaps
    .filter((g) => g.width * FIGURE_GAP_RATIO >= maxGap)
    .map((g) => g.at);
  const partCount = boundaries.length + 1;
  if (partCount < OPTION_SPLIT_MIN || partCount > OPTION_SPLIT_MAX) return [region];

  // Har bir amal markazi bo'yicha o'z bo'lagiga tushadi.
  const parts: DrawOp[][] = Array.from({ length: partCount }, () => []);
  for (const op of inside) {
    const center = op.x + op.w / 2;
    let index = 0;
    while (index < boundaries.length && center > boundaries[index]) index++;
    parts[index].push(op);
  }

  if (parts.some((part) => part.length === 0)) return [region];

  return parts.map((part) => ({
    bbox: opsBBox(part, FIGURE_PADDING_PT),
    kind: "OPTION_ROW" as const,
    confidence: region.confidence,
  }));
}

// ---------------------------------------------------------------------------
// 3. Filtrlar
// ---------------------------------------------------------------------------

/**
 * Soha chizma emas — tashlab yuborilsinmi?
 *
 * Uchta yolg'on ijobiy holatni kesadi: mayda shtrix, savollar orasidagi
 * gorizontal ajratuvchi chiziq va kolontitul bezagi.
 */
export function shouldSkipFigure(region: FigureRegion, pageBox: BBox): boolean {
  const { y, w, h } = region.bbox;

  if (w < FIGURE_MIN_SIZE_PT || h < FIGURE_MIN_SIZE_PT) return true;

  if (w > DIVIDER_WIDTH_RATIO * pageBox.w && h < DIVIDER_MAX_HEIGHT_PT) return true;

  // Kolontitul — soha BUTUNLAY tasma ichida bo'lsa. Tasmaga qisman kirib
  // turgan chizma savolniki bo'lishi mumkin, u tashlanmaydi.
  const band = HEADER_FOOTER_BAND_RATIO * pageBox.h;
  if (y + h <= pageBox.y + band) return true;
  if (y >= pageBox.y + pageBox.h - band) return true;

  return false;
}

/**
 * Bir necha sahifada takrorlanadigan grafikalarning hash'larini qaytaradi —
 * bular logotip yoki kolontitul bezagi, savol chizmasi emas.
 *
 * Sahifalar SONI sanaladi, takrorlanish soni emas: bitta sahifada bir xil
 * bezak bir necha marta chizilishi mumkin, bu uni logotip qilmaydi.
 */
export function dedupeByHash(
  assets: { sha256: string; page: number }[],
  pageCount: number,
): Set<string> {
  // Kichik hujjatda chegara ma'nosini yo'qotadi: 3 sahifalik faylda har
  // sahifada uchraydigan chizma umuman tashlanmasligi kerak.
  if (pageCount <= DEDUPE_PAGE_THRESHOLD) return new Set();

  const pagesByHash = new Map<string, Set<number>>();
  for (const asset of assets) {
    const pages = pagesByHash.get(asset.sha256) ?? new Set<number>();
    pages.add(asset.page);
    pagesByHash.set(asset.sha256, pages);
  }

  const skip = new Set<string>();
  for (const [hash, pages] of pagesByHash) {
    if (pages.size > DEDUPE_PAGE_THRESHOLD) skip.add(hash);
  }
  return skip;
}
