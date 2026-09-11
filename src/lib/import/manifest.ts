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

/** Bitta savol: savol boshi bloki, undan keyingi bloklar va rasmlar. */
export interface QuestionGroup {
  /** `ImportDraft.order` — `planManifest` sahifalar bo'ylab uzluksiz qo'yadi. */
  order: number;
  page: number;
  /** Savol raqami (`15*.` → 15). */
  number: number;
  text: string;
  /** Bloklar va rasmlarning birlashgan qamrovi — `ImportDraft.sourceBbox`. */
  bbox: BBox;
  images: ManifestImage[];
}

/** `/blocks` marshrutiga ketadigan guruh — rasm fayli o'rniga yuklangan asset. */
export interface UploadGroup {
  order: number;
  number: number;
  text: string;
  bbox: BBox;
  images: { assetId: string; bbox: BBox }[];
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

function centerX(b: BBox): number {
  return b.x + b.w / 2;
}

function centerY(b: BBox): number {
  return b.y + b.h / 2;
}

/**
 * Markazi sahifaning yuqori/quyi tasmasida — kolontitul ("~ 23 ~ Innova
 * o'quv markazi"). Markaz bo'yicha, butunlay tasma ichida bo'lishi shart
 * emas: PyMuPDF kolontitulni ba'zan ostidagi satr bilan bitta blokka qo'shadi
 * va blok tasmadan biroz chiqib ketadi.
 */
function inHeaderFooterBand(b: BBox, page: ManifestPage): boolean {
  const band = HEADER_FOOTER_BAND_RATIO * page.height;
  const cy = centerY(b);
  return cy < band || cy > page.height - band;
}

interface ColumnLayout {
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

function columnLayout(page: ManifestPage): ColumnLayout {
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

// ---------------------------------------------------------------------------
// 2. Savollarga guruhlash
// ---------------------------------------------------------------------------

/**
 * Savol boshi — blok BOSHIDA raqam, ixtiyoriy yulduzcha (`15*.` — haqiqiy
 * to'plamda qiyin savol belgisi), nuqta yoki qavs, keyin:
 *   - HARF — probel ixtiyoriy, PyMuPDF uni ba'zan yutib yuboradi
 *     ("9.Grafikdan");
 *   - yoki PROBEL va RAQAM — haqiqiy to'plamda "24. 1-rasmda jism..." bor,
 *     faqat harf talab qilinganda bu savol jimgina yo'qolardi.
 *
 * Raqamdan oldin probel MAJBURIY: shunda blok boshidagi o'nli son ("2.5 kg",
 * "3,5") savol boshi bo'lib qolmaydi.
 */
const QUESTION_START = /^\s*(\d{1,3})\s*\*?\s*[.)](?:\s*(?=\p{L})|\s+(?=\d))/u;

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function union(boxes: BBox[]): BBox {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const right = Math.max(...boxes.map((b) => b.x + b.w));
  const bottom = Math.max(...boxes.map((b) => b.y + b.h));
  return { x, y, w: right - x, h: bottom - y };
}

interface OpenGroup {
  number: number;
  startY: number;
  blocks: ManifestBlock[];
  images: ManifestImage[];
}

/**
 * Sahifani savollarga bo'ladi.
 *
 * Har ustun MUSTAQIL: savol o'z ustunidagi keyingi savol boshigacha davom
 * etadi. Ustundagi birinchi savolgacha bo'lgan qism (bloklar ham, rasmlar
 * ham) HECH BIR savolga qo'shilmaydi — haqiqiy to'plamda (Innova, 23-bet) u
 * OLDINGI SAHIFA savolining davomi: 22-betdagi 8-savolning rasmi va
 * variantlari 23-bet tepasida turadi. Uni shu sahifaning biror savoliga
 * ulash noto'g'ri variantlarni biriktirardi; u sahifa aksida (`pageImage`)
 * saqlanib qoladi.
 *
 * Bloklar `\n` bilan ulanadi: har blok ichidagi qator ko'chishlari
 * PyMuPDF'ning satr bo'linishi, bloklar chegarasi esa odatda "savol matni |
 * variantlar" chegarasi — keyingi bosqich uchun foydali.
 *
 * `order` — sahifa ichidagi tartib; global tartibni `planManifest` qo'yadi.
 */
export function groupIntoQuestions(page: ManifestPage): QuestionGroup[] {
  const { columns, splitX } = columnLayout(page);
  const columnOf = (b: BBox): number => (splitX === null || centerX(b) < splitX ? 0 : 1);

  const blocks = page.blocks.filter((b) => !inHeaderFooterBand(b.bbox, page));
  const perColumn: OpenGroup[][] = columns.map(() => []);

  columns.forEach((_, col) => {
    const ordered = blocks
      .filter((b) => columnOf(b.bbox) === col)
      .sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x);

    let current: OpenGroup | null = null;
    for (const block of ordered) {
      const match = QUESTION_START.exec(block.text);
      if (match) {
        current = { number: Number(match[1]), startY: block.bbox.y, blocks: [block], images: [] };
        perColumn[col].push(current);
      } else if (current) {
        current.blocks.push(block);
      }
    }
  });

  // Rasm — markazi tushgan ustun va savol oralig'iga: [savol boshi y,
  // keyingi savol boshi y), oxirgisi uchun sahifa oxirigacha.
  const images = [...page.images].sort((a, b) => a.order - b.order);
  for (const image of images) {
    if (inHeaderFooterBand(image.bbox, page)) continue;
    const groups = perColumn[columnOf(image.bbox)];
    const cy = centerY(image.bbox);
    for (let i = groups.length - 1; i >= 0; i--) {
      if (groups[i].startY <= cy) {
        groups[i].images.push(image);
        break;
      }
    }
  }

  return perColumn.flat().map((g, index) => ({
    order: index,
    page: page.page,
    number: g.number,
    text: g.blocks.map((b) => normalizeText(b.text)).join('\n'),
    bbox: union([...g.blocks.map((b) => b.bbox), ...g.images.map((img) => img.bbox)]),
    images: g.images,
  }));
}

/**
 * Butun manifest bo'yicha guruhlar — `order` sahifalar bo'ylab uzluksiz.
 *
 * Tartib har chaqiruvda BIR XIL: manifest o'zgarmas, sahifalar esa raqam
 * bo'yicha saralanadi. Shuning uchun qayta ulanishda tugagan sahifalar
 * yuklanmasa ham ular hisobga olinadi va qolgan sahifalar avvalgi `order`
 * ni oladi — `@@unique([jobId, order])` upsert'i dublikat yaratmaydi.
 */
export function planManifest(
  manifest: Manifest,
): { page: ManifestPage; groups: QuestionGroup[] }[] {
  let next = 0;
  return [...manifest.pages]
    .sort((a, b) => a.page - b.page)
    .map((page) => {
      const groups = groupIntoQuestions(page).map((g) => ({ ...g, order: next++ }));
      return { page, groups };
    });
}

/**
 * Guruhni marshrut shakliga o'giradi: rasm fayli → yuklangan asset.
 * Yuklanmagan (juda katta, rad etilgan) rasm tushirib qoldiriladi — savol
 * rasmsiz qoladi, lekin butun sahifa to'xtab qolmaydi.
 */
export function toUploadGroup(
  group: QuestionGroup,
  assetIds: ReadonlyMap<string, string>,
): UploadGroup {
  const images: UploadGroup['images'] = [];
  for (const image of group.images) {
    const assetId = assetIds.get(image.file);
    if (assetId) images.push({ assetId, bbox: image.bbox });
  }
  return { order: group.order, number: group.number, text: group.text, bbox: group.bbox, images };
}
