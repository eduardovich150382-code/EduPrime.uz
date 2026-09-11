import {
  COLUMN_SPLIT_MIN_RATIO,
  FULL_WIDTH_ROW_RATIO,
  HEADER_FOOTER_BAND_RATIO,
  IMPORT_SOURCE_LANGS,
  MAX_IMPORT_PAGES,
  MAX_SOURCE_PAGE,
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

export type ManifestErrorCode =
  | 'NO_MANIFEST'
  | 'BAD_JSON'
  | 'BAD_VERSION'
  | 'BAD_KIND'
  | 'BAD_FIELD'
  | 'UNKNOWN_LANG'
  | 'TOO_MANY_PAGES'
  | 'UNSAFE_PATH'
  | 'MISSING_FILE'
  | 'NOT_PNG';

/**
 * Xato — kod va detal, tayyor matn EMAS: foydalanuvchiga ko'rinadigan matn
 * `messages/*.json` da, sahifa uni kod bo'yicha tarjima qiladi.
 */
export interface ManifestError {
  code: ManifestErrorCode;
  detail?: string;
}

export const MANIFEST_FILE = 'manifest.json';

// ---------------------------------------------------------------------------
// 1. ZIP ichidan manifestni topish
// ---------------------------------------------------------------------------

/**
 * `manifest.json` qaysi papkada ekanini aniqlaydi.
 *
 * Skript uni ZIP ildiziga qo'yadi, lekin Windows'da papkani "Siqilgan
 * papka" qilib yuborish hammasini bitta ichki papkaga o'raydi. Faqat YAGONA
 * ichki manifest qabul qilinadi — ikkitasi bo'lsa qaysi biri to'g'ri ekanini
 * taxmin qilmaymiz.
 */
export function locateManifest(names: readonly string[]): { prefix: string } | null {
  if (names.includes(MANIFEST_FILE)) return { prefix: '' };
  const nested = names.filter((n) => /^[^/]+\/manifest\.json$/.test(n));
  if (nested.length !== 1) return null;
  return { prefix: nested[0].slice(0, -MANIFEST_FILE.length) };
}

// ---------------------------------------------------------------------------
// 2. Qat'iy tekshiruv
// ---------------------------------------------------------------------------

/** Tekshiruv ichida birinchi xatoda chiqish uchun — tashqariga chiqmaydi. */
class ManifestInvalid extends Error {
  constructor(readonly error: ManifestError) {
    super(error.code);
  }
}

function fail(code: ManifestErrorCode, detail?: string): never {
  throw new ManifestInvalid({ code, detail });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finite(value: unknown, where: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail('BAD_FIELD', where);
  return value;
}

function integer(value: unknown, where: string, min: number, max: number): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    fail('BAD_FIELD', where);
  }
  return value as number;
}

function array(value: unknown, where: string): unknown[] {
  if (!Array.isArray(value)) fail('BAD_FIELD', where);
  return value;
}

function bbox(value: unknown, where: string): BBox {
  if (!isRecord(value)) fail('BAD_FIELD', where);
  const box = {
    x: finite(value.x, `${where}.x`),
    y: finite(value.y, `${where}.y`),
    w: finite(value.w, `${where}.w`),
    h: finite(value.h, `${where}.h`),
  };
  if (box.w < 0) fail('BAD_FIELD', `${where}.w`);
  if (box.h < 0) fail('BAD_FIELD', `${where}.h`);
  return box;
}

/**
 * ZIP ichidagi yo'l — zip-slip himoyasi.
 *
 * Fayl hozir faqat xotiradan o'qiladi va diskka yozilmaydi, lekin yo'l
 * manifestdan keladi, manifestni esa ustoz qo'lda tahrirlashi yoki begona
 * fayl bo'lishi mumkin. `..`, mutlaq yo'l va teskari chiziq bu yerda to'xtaydi —
 * keyinchalik kim bu yo'lni fayl tizimiga ulasa ham xavfsiz qolsin.
 */
function zipPath(value: unknown, where: string, files: ReadonlySet<string>): string {
  if (typeof value !== 'string' || value.length === 0) fail('BAD_FIELD', where);
  const segments = value.split('/');
  const unsafe =
    value.includes('\\') ||
    value.includes('\0') ||
    value.startsWith('/') ||
    /^[a-zA-Z]:/.test(value) ||
    segments.some((s) => s === '' || s === '.' || s === '..');
  if (unsafe) fail('UNSAFE_PATH', value);
  // `/assets` marshruti PNG (yoki klient qayta kodlagan JPEG) qabul qiladi;
  // skript har doim PNG yozadi, boshqasi — qo'lda aralashtirilgan fayl.
  if (!value.toLowerCase().endsWith('.png')) fail('NOT_PNG', value);
  if (!files.has(value)) fail('MISSING_FILE', value);
  return value;
}

function parsePage(raw: unknown, where: string, files: ReadonlySet<string>): ManifestPage {
  if (!isRecord(raw)) fail('BAD_FIELD', where);

  const page = integer(raw.page, `${where}.page`, 1, MAX_SOURCE_PAGE);
  const width = finite(raw.width, `${where}.width`);
  const height = finite(raw.height, `${where}.height`);
  if (width <= 0) fail('BAD_FIELD', `${where}.width`);
  if (height <= 0) fail('BAD_FIELD', `${where}.height`);

  const blocks = array(raw.blocks, `${where}.blocks`).map((b, i): ManifestBlock => {
    const at = `${where}.blocks[${i}]`;
    if (!isRecord(b)) fail('BAD_FIELD', at);
    if (typeof b.text !== 'string') fail('BAD_FIELD', `${at}.text`);
    return {
      order: integer(b.order, `${at}.order`, 0, Number.MAX_SAFE_INTEGER),
      bbox: bbox(b.bbox, `${at}.bbox`),
      text: b.text,
    };
  });

  const images = array(raw.images, `${where}.images`).map((img, i): ManifestImage => {
    const at = `${where}.images[${i}]`;
    if (!isRecord(img)) fail('BAD_FIELD', at);
    return {
      order: integer(img.order, `${at}.order`, 0, Number.MAX_SAFE_INTEGER),
      bbox: bbox(img.bbox, `${at}.bbox`),
      file: zipPath(img.file, `${at}.file`, files),
    };
  });

  const result: ManifestPage = { page, width, height, blocks, images };
  if (raw.pageImage !== undefined && raw.pageImage !== null) {
    result.pageImage = zipPath(raw.pageImage, `${where}.pageImage`, files);
  }
  return result;
}

/**
 * Manifestni qat'iy tekshiradi va TOZA nusxasini qaytaradi (ortiqcha
 * maydonlar tashlanadi).
 *
 * `files` — ZIP ichidagi fayl yo'llari, manifest papkasiga nisbatan.
 * Birinchi xatoda to'xtaydi: detal (masalan `pages[0].blocks[2].bbox.x`)
 * skriptdagi xatoni aniq ko'rsatadi, xatolar ro'yxati esa ustozga
 * foydasiz — skript bitta joyda buziladi.
 */
export function parseManifest(
  raw: unknown,
  files: ReadonlySet<string>,
): { manifest: Manifest } | { error: ManifestError } {
  try {
    if (!isRecord(raw)) fail('BAD_FIELD', '(root)');
    if (raw.version !== 1) fail('BAD_VERSION', String(raw.version));
    if (raw.kind !== 'auto' && raw.kind !== 'scanned') fail('BAD_KIND', String(raw.kind));
    if (typeof raw.sourceFile !== 'string' || raw.sourceFile.trim() === '') {
      fail('BAD_FIELD', 'sourceFile');
    }
    // Noma'lum til jimgina 'uz' ga TUSHIRILMAYDI: skriptda `ASL_TIL`
    // noto'g'ri qolgan bo'lsa, ustoz buni shu yerda bilib olishi kerak.
    if (typeof raw.sourceLang !== 'string') fail('BAD_FIELD', 'sourceLang');
    if (!(IMPORT_SOURCE_LANGS as readonly string[]).includes(raw.sourceLang)) {
      fail('UNKNOWN_LANG', raw.sourceLang);
    }

    const rawPages = array(raw.pages, 'pages');
    if (rawPages.length === 0) fail('BAD_FIELD', 'pages');
    if (rawPages.length > MAX_IMPORT_PAGES) fail('TOO_MANY_PAGES', String(rawPages.length));
    if (raw.pageCount !== rawPages.length) fail('BAD_FIELD', 'pageCount');

    const pages = rawPages.map((p, i) => parsePage(p, `pages[${i}]`, files));
    // Sahifa raqami `pagesDone` va `ImportAsset.page` kaliti — takrorlansa
    // ikki sahifa bir-birining natijasini bosib ketardi.
    const seen = new Set<number>();
    pages.forEach((p, i) => {
      if (seen.has(p.page)) fail('BAD_FIELD', `pages[${i}].page`);
      seen.add(p.page);
    });

    return {
      manifest: {
        version: 1,
        kind: raw.kind,
        sourceFile: raw.sourceFile,
        sourceLang: raw.sourceLang,
        pageCount: pages.length,
        pages,
      },
    };
  } catch (err) {
    if (err instanceof ManifestInvalid) return { error: err.error };
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 3. Ustunlar
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
// 4. Savollarga guruhlash
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
