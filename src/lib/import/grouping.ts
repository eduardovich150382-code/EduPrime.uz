import { FULL_WIDTH_ROW_RATIO } from './constants';
import {
  centerX,
  centerY,
  columnLayout,
  inHeaderFooterBand,
  union,
  type Manifest,
  type ManifestBlock,
  type ManifestImage,
  type ManifestPage,
} from './manifest';
import type { BBox } from './types';

/**
 * Manifest bloklarini savollarga guruhlash — BUTUN HUJJAT bo'ylab.
 *
 * Haqiqiy to'plamda savol chap ustun oxirida boshlanib o'ng ustun tepasida,
 * yoki sahifa oxirida boshlanib keyingi sahifada davom etadi. Sahifama-sahifa
 * guruhlashda bu davom (variantlar, rasm) hech bir savolga ulanmay qolardi —
 * sinovda savollarning ~20% i shundan shikastlangan. Shuning uchun bloklar
 * avval bitta uzluksiz o'qish ketma-ketligiga yoyiladi, savol chegaralari esa
 * shu ketma-ketlik ustida topiladi: sahifa va ustun chegarasi savolni uzmaydi.
 *
 * O'QISH TARTIBI bbox'dan hisoblanadi, manifestdagi `order` dan EMAS: PyMuPDF
 * `sort=True` bloklarni (y, x) bo'yicha saralaydi va ikki ustunni qatorma-
 * qator aralashtiradi (Innova 23-bet: order 3 = chap "9.", order 4 = o'ng
 * "15*.", order 5 = chap "A) 1,5" — 9-savol variantlari). `order` ga ishonilsa
 * 9 ning variantlari 15 ga yopishardi.
 *
 * Fayl SOF — ./manifest kabi brauzer, baza va fflate'ga bog'lanmaydi.
 */

/** O'qish tartibidagi bitta blok. `order` — manifestdagi asl qiymat, faqat ma'lumot uchun. */
export interface LinearBlock {
  page: number;
  order: number;
  bbox: BBox;
  text: string;
  /** 0 dan butun hujjat bo'ylab uzluksiz — o'qish tartibidagi o'rni. */
  globalIndex: number;
}

export type ImageRef = ManifestImage & { page: number };

export interface QuestionDraft {
  /** Savol raqami (`15*.` → 15). */
  number: number | null;
  blocks: LinearBlock[];
  startPage: number;
  endPage: number;
  spansPages: boolean;
  images: ImageRef[];
}

export interface GroupedDocument {
  /** Massiv indeksi — `ImportDraft.order`: manifest o'zgarmas ekan, u ham o'zgarmaydi. */
  questions: QuestionDraft[];
  /** Birinchi savol boshidan oldingi bloklar (sarlavha, mundarija, oldingi bet davomi). */
  preamble: LinearBlock[];
  /** Kolontitul tasmasidagi bloklar — sahifa raqami, nashr nomi. */
  furniture: LinearBlock[];
  /** Hech bir savolga tushmagan rasmlar: preamble'ga yoki kolontitulga tegishli. */
  unassignedImages: ImageRef[];
}

/** `/blocks` marshrutiga ketadigan savol — rasm fayli o'rniga yuklangan asset. */
export interface UploadGroup {
  order: number;
  number: number | null;
  text: string;
  startPage: number;
  endPage: number;
  /** Har sahifadagi bloklar va rasmlar qamrovi — ko'p sahifali savolda bir nechta. */
  regions: { page: number; bbox: BBox }[];
  images: { assetId: string; page: number; bbox: BBox }[];
}

// ---------------------------------------------------------------------------
// 1. O'qish tartibi
// ---------------------------------------------------------------------------

/**
 * Blokning sahifadagi o'rni. `band` — to'liq enli bloklar ajratgan gorizontal
 * tasma raqami; `column` — 0 chap, 1 o'ng, DIVIDER tasmani yopuvchi to'liq
 * enli blok. (band, column) juftligi o'qish tartibini bir qiymatda beradi.
 */
interface Placed {
  block: ManifestBlock;
  furniture: boolean;
  band: number;
  column: number;
}

const DIVIDER = 2;

function segmentKey(band: number, column: number): number {
  return band * (DIVIDER + 1) + column;
}

function byPosition(a: ManifestBlock, b: ManifestBlock): number {
  return a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x;
}

interface PageLayout {
  placed: Placed[];
  splitX: number | null;
  /** To'liq enli ajratuvchilarning tepasi (y) — o'sish tartibida. */
  dividerYs: number[];
}

/**
 * Sahifani o'qish tartibida joylaydi: yuqori kolontitul → tana → quyi
 * kolontitul.
 *
 * Ikki ustunli sahifada to'liq enli blok (bo'lim sarlavhasi, ko'rsatma)
 * sahifani tasmalarga bo'ladi va har tasma alohida o'qiladi: chap ustun, o'ng
 * ustun, keyin ajratuvchi. Tasmasiz o'qilsa sarlavhadan PASTDAGI chap ustun
 * savollari sarlavhadan YUQORIDAGI o'ng ustun savollaridan oldin kelardi.
 * Bir ustunli sahifada keng blok ajratuvchi emas — u yerda deyarli har blok keng.
 */
function layoutPage(page: ManifestPage): PageLayout {
  const { splitX } = columnLayout(page);
  const furniture = page.blocks.filter((b) => inHeaderFooterBand(b.bbox, page));
  const body = page.blocks.filter((b) => !inHeaderFooterBand(b.bbox, page));
  const top = furniture.filter((b) => centerY(b.bbox) < page.height / 2).sort(byPosition);
  const bottom = furniture.filter((b) => centerY(b.bbox) >= page.height / 2).sort(byPosition);

  const dividers =
    splitX === null
      ? []
      : body.filter((b) => b.bbox.w > FULL_WIDTH_ROW_RATIO * page.width).sort(byPosition);
  const dividerYs = dividers.map((d) => d.bbox.y);
  const bandOf = (y: number): number => dividerYs.filter((dy) => dy < y).length;

  const placedBody: Placed[] = body.map((block) => {
    const dividerIndex = dividers.indexOf(block);
    if (dividerIndex >= 0) return { block, furniture: false, band: dividerIndex, column: DIVIDER };
    const column = splitX === null || centerX(block.bbox) < splitX ? 0 : 1;
    return { block, furniture: false, band: bandOf(block.bbox.y), column };
  });
  placedBody.sort(
    (a, b) => segmentKey(a.band, a.column) - segmentKey(b.band, b.column) || byPosition(a.block, b.block),
  );

  const asFurniture = (block: ManifestBlock): Placed => ({ block, furniture: true, band: -1, column: 0 });
  return {
    placed: [...top.map(asFurniture), ...placedBody, ...bottom.map(asFurniture)],
    splitX,
    dividerYs,
  };
}

interface FlatBlock extends Placed {
  linear: LinearBlock;
}

interface FlatPage {
  page: ManifestPage;
  layout: PageLayout;
  blocks: FlatBlock[];
}

function flatten(manifest: Manifest): FlatPage[] {
  let next = 0;
  return [...manifest.pages]
    .sort((a, b) => a.page - b.page)
    .map((page) => {
      const layout = layoutPage(page);
      const blocks = layout.placed.map((p) => ({
        ...p,
        linear: {
          page: page.page,
          order: p.block.order,
          bbox: p.block.bbox,
          text: p.block.text,
          globalIndex: next++,
        },
      }));
      return { page, layout, blocks };
    });
}

/**
 * Manifestdagi barcha bloklar bitta massivda, o'qish tartibida: sahifa raqami
 * bo'yicha, sahifa ichida — `layoutPage` tartibida. Kolontitul bloklari ham
 * shu yerda (hech narsa yo'qolmaydi), ularni `groupIntoQuestions` ajratadi.
 */
export function flattenBlocks(manifest: Manifest): LinearBlock[] {
  return flatten(manifest).flatMap((p) => p.blocks.map((b) => b.linear));
}

// ---------------------------------------------------------------------------
// 2. Savol boshi
// ---------------------------------------------------------------------------

/**
 * Savol boshi — faqat blok BOSHIDA.
 *
 * Birinchi naqsh: raqam, ixtiyoriy yulduzcha (`15*.` — haqiqiy to'plamda
 * qiyin savol belgisi), nuqta yoki qavs, keyin probel YOKI darhol harf
 * (PyMuPDF probelni ba'zan yutadi: "9.Grafikdan"). Nuqtadan keyin darhol
 * raqam kelsa — bu o'nli son ("2.5 m/s"), savol emas. `\d{1,3}` "1990-yilda"
 * ni ham o'tkazmaydi: to'rtinchi raqamdan keyin `.` yoki `)` yo'q.
 */
const QUESTION_START_PATTERNS: RegExp[] = [
  /^\s*(\d{1,3})\s*\*?\s*[.)](?:\s+|(?=\p{L}))/u,
  /^\s*№\s*(\d{1,3})\b/,
  /^\s*(\d{1,3})\s*-\s*(savol|masala|question|soru)\b/i,
];

export function questionNumber(text: string): number | null {
  for (const pattern of QUESTION_START_PATTERNS) {
    const match = pattern.exec(text);
    if (match) return Number(match[1]);
  }
  return null;
}

// ---------------------------------------------------------------------------
// 3. Guruhlash va rasmlar
// ---------------------------------------------------------------------------

function overlapsX(a: BBox, b: BBox): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w;
}

/**
 * Rasm tegishli bo'lgan blok (anker) — AI'siz, faqat geometriya.
 *
 * 1. Shu sahifada rasm bilan x bo'yicha kesishgan va tepasi rasm MARKAZIDAN
 *    yuqorida turgan bloklardan eng pastdagisi. Markaz — tepa emas: savol
 *    matni yonidagi rasm tepasi matndan biroz yuqorida bo'lishi mumkin, u
 *    holda rasm oldingi savol variantlariga ketib qolardi.
 * 2. Bunday blok yo'q (ustun yoki sahifa tepasi) — rasm ustunidan o'qish
 *    tartibida OLDIN kelgan oxirgi blok: o'ng ustun tepasi uchun chap ustun
 *    oxiri, chap ustun tepasi uchun oldingi sahifaning oxirgi bloki. Ya'ni
 *    rasm paydo bo'lgan paytdagi ochiq savol.
 */
function anchorOf(image: ManifestImage, flat: FlatPage, previousLast: number | null): number | null {
  const body = flat.blocks.filter((b) => !b.furniture);
  const cy = centerY(image.bbox);

  let best: FlatBlock | null = null;
  for (const b of body) {
    if (!overlapsX(b.block.bbox, image.bbox) || b.block.bbox.y >= cy) continue;
    if (!best || b.block.bbox.y >= best.block.bbox.y) best = b;
  }
  if (best) return best.linear.globalIndex;

  const { splitX, dividerYs } = flat.layout;
  const column = splitX === null || centerX(image.bbox) < splitX ? 0 : 1;
  const key = segmentKey(dividerYs.filter((dy) => dy < cy).length, column);
  const before = body.filter((b) => segmentKey(b.band, b.column) < key);
  return before.length > 0 ? before[before.length - 1].linear.globalIndex : previousLast;
}

/**
 * Hujjatni savollarga bo'ladi: har savol o'z boshidan keyingi savol
 * boshigacha davom etadi, sahifa yoki ustun o'zgarsa ham.
 *
 * Birinchi savolgacha bo'lgan bloklar `preamble` ga, kolontitul `furniture`
 * ga tushadi — ikkalasi ham qaytariladi, lekin hech bir savolga ulanmaydi.
 */
export function groupIntoQuestions(manifest: Manifest): GroupedDocument {
  const pages = flatten(manifest);
  const questions: QuestionDraft[] = [];
  const preamble: LinearBlock[] = [];
  const furniture: LinearBlock[] = [];
  const unassignedImages: ImageRef[] = [];
  /** globalIndex → savol indeksi. Preamble bloklari bu yerda yo'q. */
  const owner = new Map<number, number>();

  for (const { blocks } of pages) {
    for (const b of blocks) {
      if (b.furniture) {
        furniture.push(b.linear);
        continue;
      }
      const number = questionNumber(b.linear.text);
      if (number !== null) {
        questions.push({ number, blocks: [], startPage: 0, endPage: 0, spansPages: false, images: [] });
      }
      const current = questions[questions.length - 1];
      if (!current) {
        preamble.push(b.linear);
        continue;
      }
      current.blocks.push(b.linear);
      owner.set(b.linear.globalIndex, questions.length - 1);
    }
  }

  let previousLast: number | null = null;
  for (const flat of pages) {
    const images = [...flat.page.images].sort((a, b) => a.order - b.order);
    for (const image of images) {
      const ref: ImageRef = { ...image, page: flat.page.page };
      const anchor = inHeaderFooterBand(image.bbox, flat.page) ? null : anchorOf(image, flat, previousLast);
      const index = anchor === null ? undefined : owner.get(anchor);
      if (index === undefined) unassignedImages.push(ref);
      else questions[index].images.push(ref);
    }
    const body = flat.blocks.filter((b) => !b.furniture);
    if (body.length > 0) previousLast = body[body.length - 1].linear.globalIndex;
  }

  for (const q of questions) {
    const pageNumbers = [...q.blocks.map((b) => b.page), ...q.images.map((i) => i.page)];
    q.startPage = Math.min(...pageNumbers);
    q.endPage = Math.max(...pageNumbers);
    q.spansPages = q.startPage !== q.endPage;
  }

  return { questions, preamble, furniture, unassignedImages };
}

// ---------------------------------------------------------------------------
// 4. Yuklash shakli
// ---------------------------------------------------------------------------

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Bloklar `\n` bilan ulanadi: blok ichidagi qator ko'chishlari PyMuPDF'ning
 * satr bo'linishi, bloklar chegarasi esa odatda "savol matni | variantlar"
 * chegarasi — keyingi bosqich uchun foydali.
 */
export function questionText(q: QuestionDraft): string {
  return q.blocks.map((b) => normalizeText(b.text)).join('\n');
}

/** Har sahifadagi bloklar va rasmlar qamrovi, sahifa tartibida. */
export function questionRegions(q: QuestionDraft): UploadGroup['regions'] {
  const byPage = new Map<number, BBox[]>();
  for (const item of [...q.blocks, ...q.images]) {
    byPage.set(item.page, [...(byPage.get(item.page) ?? []), item.bbox]);
  }
  return [...byPage.entries()]
    .sort(([a], [b]) => a - b)
    .map(([page, boxes]) => ({ page, bbox: union(boxes) }));
}

/**
 * Savolni marshrut shakliga o'giradi: rasm fayli → yuklangan asset.
 * Yuklanmagan (juda katta, rad etilgan) rasm tushirib qoldiriladi — savol
 * rasmsiz qoladi, lekin butun import to'xtab qolmaydi.
 */
export function toUploadGroup(
  q: QuestionDraft,
  order: number,
  assetIds: ReadonlyMap<string, string>,
): UploadGroup {
  const images: UploadGroup['images'] = [];
  for (const image of q.images) {
    const assetId = assetIds.get(image.file);
    if (assetId) images.push({ assetId, page: image.page, bbox: image.bbox });
  }
  return {
    order,
    number: q.number,
    text: questionText(q),
    startPage: q.startPage,
    endPage: q.endPage,
    regions: questionRegions(q),
    images,
  };
}
