import {
  COLUMN_GAP_RATIO,
  FULL_WIDTH_ROW_RATIO,
  ROW_Y_TOLERANCE_RATIO,
} from "./constants";
import type { BBox, Block, Column, TextItem, TextRow } from "./types";

/**
 * PDF matn qatlamini savol bloklariga bo'luvchi sof funksiyalar.
 *
 * Hech qanday tashqi bog'liqlik yo'q — pdfjs ham, brauzer ham, baza ham.
 * Faqat kirish ma'lumoti ustida ishlaydi, shuning uchun haqiqiy PDF'siz
 * to'liq test qilinadi va server tomonda ham, brauzerda ham qayta ishlatiladi.
 *
 * QUVUR TARTIBI: items → detectColumns → (har ustunda) groupIntoRows →
 * splitIntoBlocks. Ustun — sahifa geometriyasining xususiyati, qator esa ustun
 * ICHIDAGI tushuncha, shuning uchun ustun avval aniqlanadi. Teskari tartibda
 * (avval qator) ikki ustunning bir xil balandlikdagi matni bitta qatorga
 * qo'shilib ketadi va ustunlar boshqa hech qachon ajratilmaydi.
 *
 * Koordinata konvensiyasi uchun ./types faylining boshidagi izohga qarang.
 */

// ---------------------------------------------------------------------------
// 1. Ustunlar
// ---------------------------------------------------------------------------

/**
 * Koridor markazi sahifaning O'RTA qismida bo'lishi shart; bu konstanta har
 * tomondan chetga qoldiriladigan ulushni beradi (0.3 → o'rta 40%).
 *
 * Shartsiz qolsa, oddiy bir ustunli sahifaning keng o'ng hoshiyasi ham "koridor"
 * bo'lib ko'rinadi. Hoshiya — ustun chegarasi emas, u sahifa cheti.
 */
const CORRIDOR_CENTER_MARGIN_RATIO = 0.3;

/** Sahifa eni bo'ylab hech bir bo'lak qoplamagan tik tasma. */
interface Band {
  min: number;
  max: number;
}

/**
 * Sahifa bo'laklarini ustunlarga ajratadi va har ustunni qatorlarga yig'adi.
 *
 * Ustun KORIDOR bo'yicha aniqlanadi — bo'lak markazlarini klasterlash bo'yicha
 * emas. Klasterlash abzatsli bir ustunli matnda yolg'on ijobiy beradi:
 * chekinishli satrlar markazlari o'z-o'zidan ikkita to'plamga ajralib ko'rinadi.
 * Koridor esa fizik dalil: hech bir bo'lak tegmagan tik tasma faqat ustunlar
 * orasida bo'ladi.
 *
 * CHEKLOV: taqsimot BO'LAK darajasida ketadi, shuning uchun bir necha bo'lakka
 * bo'lingan va bo'laklari koridorning ikki tomoniga tushgan sarlavha
 * ("MATEMATIKA" va "TESTI" alohida bo'lak bo'lsa) ikki ustunga ajralib ketadi.
 * Bitta keng bo'lak sifatida kelgan sarlavha to'g'ri ishlaydi — u koridorni
 * kesib o'tadi va butunicha chap ustunga tushadi.
 */
export function detectColumns(items: TextItem[], pageWidth: number): Column[] {
  if (items.length === 0) return [];

  const corridor = findCorridor(items, pageWidth);
  if (!corridor) return [buildColumn(items)];

  const boundary = (corridor.min + corridor.max) / 2;
  const left: TextItem[] = [];
  const right: TextItem[] = [];

  for (const item of items) {
    // Koridorni kesib o'tuvchi bo'lak (sarlavha, keng jadval) hech qaysi ustunga
    // to'liq tegishli emas — uni chap ustunga, o'z y pozitsiyasida qoldiramiz:
    // shunda u o'qish tartibida o'zidan keyingi savollardan oldin turadi.
    const crossesCorridor =
      item.x < corridor.max && item.x + item.w > corridor.min;
    if (crossesCorridor || item.x + item.w / 2 < boundary) left.push(item);
    else right.push(item);
  }

  // Bir tomon bo'sh qolsa bu ustun chegarasi emas, shunchaki bo'sh joy edi.
  if (left.length === 0 || right.length === 0) return [buildColumn(items)];

  return [buildColumn(left), buildColumn(right)];
}

/**
 * Ustun koridori bo'la oladigan eng keng bo'sh tasmani topadi, topilmasa null.
 *
 * Qamrov xaritasiga faqat TOR bo'laklar qo'shiladi: to'liq enli sarlavha yoki
 * jadval ikkala ustunni qoplaydi va koridorni yopib qo'yadi — u hisobga olinsa,
 * sahifa noto'g'ri bir ustunli deb topilar edi.
 */
function findCorridor(items: TextItem[], pageWidth: number): Band | null {
  const spans = items
    .filter((i) => i.w < FULL_WIDTH_ROW_RATIO * pageWidth)
    .map((i) => ({ min: i.x, max: i.x + i.w }))
    .sort((a, b) => a.min - b.min);
  if (spans.length === 0) return null;

  const covered: Band[] = [{ ...spans[0] }];
  for (let i = 1; i < spans.length; i++) {
    const last = covered[covered.length - 1];
    if (spans[i].min <= last.max) last.max = Math.max(last.max, spans[i].max);
    else covered.push({ ...spans[i] });
  }

  // Hoshiyalar ham nomzod bo'ladi: ular markaz sharti bilan rad etiladi, ya'ni
  // "sahifa cheti" va "ustunlar orasi" bitta o'lchov bilan ajratiladi.
  const bands: Band[] = [{ min: 0, max: covered[0].min }];
  for (let i = 1; i < covered.length; i++) {
    bands.push({ min: covered[i - 1].max, max: covered[i].min });
  }
  bands.push({ min: covered[covered.length - 1].max, max: pageWidth });

  const middleMin = CORRIDOR_CENTER_MARGIN_RATIO * pageWidth;
  const middleMax = pageWidth - middleMin;
  const minWidth = COLUMN_GAP_RATIO * pageWidth;

  // Markaz sharti eng kengini tanlashdan OLDIN qo'llanadi: haqiqiy ikki ustunli
  // sahifada o'ng hoshiya ko'pincha koridordan keng bo'ladi, avval eng kengini
  // olsak, u markaz shartida yiqilib, sahifa bir ustunli deb topilar edi.
  let best: Band | null = null;
  for (const band of bands) {
    const width = band.max - band.min;
    const center = (band.min + band.max) / 2;
    if (width < minWidth) continue;
    if (center < middleMin || center > middleMax) continue;
    if (!best || width > best.max - best.min) best = band;
  }
  return best;
}

function buildColumn(items: TextItem[]): Column {
  return {
    xMin: Math.min(...items.map((i) => i.x)),
    xMax: Math.max(...items.map((i) => i.x + i.w)),
    rows: groupIntoRows(items),
  };
}

// ---------------------------------------------------------------------------
// 2. Qatorlar
// ---------------------------------------------------------------------------

/**
 * Bir xil qatorda turgan matn bo'laklarini birlashtiradi.
 *
 * PDF matn qatlami qatorni bitta butun satr sifatida bermaydi: shrift yoki
 * kegl o'zgargan har joyda yangi bo'lak boshlanadi ("1. ", "Toshkent", " — ",
 * "poytaxt"). Shuning uchun qatorni y yaqinligi bo'yicha qayta yig'amiz.
 *
 * Kirish — BITTA USTUN bo'laklari, butun sahifa emas (detectColumns ga qarang).
 * Shu sababli bu yerda ustunlarni bilish shart emas: bir xil y dagi ikki ustun
 * matni bu bosqichga allaqachon alohida kelib tushadi.
 */
export function groupIntoRows(items: TextItem[]): TextRow[] {
  if (items.length === 0) return [];

  // y bo'yicha o'sish tartibi = tepadan pastga (konvensiyaga qarang).
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);

  const groups: TextItem[][] = [];
  let current: TextItem[] = [sorted[0]];
  let top = sorted[0].y;
  let bottom = sorted[0].y + sorted[0].h;

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    // Chegarani joriy qator va bo'lakning kattarog'idan olamiz: qatorda
    // katta kegldagi formula uchrasa, kichik matn undan uzoqlashib ketmasin.
    const tolerance = ROW_Y_TOLERANCE_RATIO * Math.max(bottom - top, item.h);

    if (item.y - top < tolerance) {
      current.push(item);
      bottom = Math.max(bottom, item.y + item.h);
    } else {
      groups.push(current);
      current = [item];
      top = item.y;
      bottom = item.y + item.h;
    }
  }
  groups.push(current);

  return groups.map(buildRow);
}

function buildRow(items: TextItem[]): TextRow {
  const ordered = [...items].sort((a, b) => a.x - b.x);
  const y = Math.min(...ordered.map((i) => i.y));
  const height = Math.max(...ordered.map((i) => i.y + i.h)) - y;
  return { y, height, items: ordered, text: joinRowText(ordered) };
}

/**
 * Bo'laklarni bitta satrga birlashtiradi.
 *
 * PDF'da probel ko'pincha alohida belgi sifatida saqlanmaydi — u shunchaki
 * keyingi bo'lakning x siljishi bo'lib qoladi. Bo'shliq o'rtacha belgi
 * enidan katta bo'lsa, uni so'z oralig'i deb hisoblaymiz.
 */
function joinRowText(items: TextItem[]): string {
  const charWidth = averageCharWidth(items);
  let text = "";
  let prevRight: number | null = null;

  for (const item of items) {
    if (
      prevRight !== null &&
      item.x - prevRight > charWidth &&
      !/\s$/.test(text) &&
      !/^\s/.test(item.str)
    ) {
      text += " ";
    }
    text += item.str;
    prevRight = item.x + item.w;
  }
  return text;
}

function averageCharWidth(items: TextItem[]): number {
  const widths = items
    .filter((i) => i.str.length > 0 && i.w > 0)
    .map((i) => i.w / i.str.length);
  if (widths.length === 0) return 0;
  return widths.reduce((sum, w) => sum + w, 0) / widths.length;
}

// ---------------------------------------------------------------------------
// 3. Bloklar
// ---------------------------------------------------------------------------

/**
 * Savol boshini bildiruvchi naqshlar — faqat qator BOSHIDA.
 *
 * Qator boshiga bog'lash matn ichidagi raqamlarni ("1990-yilda", "2.5 kg")
 * himoya qiladi: raqamdan keyin darhol . yoki ) yoki -savol kelishi shart,
 * "1990" da esa keyingi belgi yana raqam bo'lgani uchun hech bir naqsh mos
 * kelmaydi.
 */
const QUESTION_START_PATTERNS: RegExp[] = [
  /^\s*(\d{1,3})\s*[.)]\s+/,
  /^\s*№\s*(\d{1,3})\b/,
  /^\s*(\d{1,3})\s*-\s*(savol|masala|question)\b/i,
];

function questionNumber(text: string): number | null {
  for (const pattern of QUESTION_START_PATTERNS) {
    const match = pattern.exec(text);
    if (match) return Number(match[1]);
  }
  return null;
}

/**
 * Ustunlarni savol bloklariga bo'ladi.
 *
 * Ustunlar chapdan o'ngga ketma-ket aylanib chiqiladi, shuning uchun ustun
 * chegarasi blokni uzmaydi: chap ustun oxirida boshlangan savol o'ng ustun
 * boshida davom etishi mumkin — ikki ustunli to'plamlarda odatiy hol.
 *
 * Hech qanday savol boshi topilmasa bo'sh massiv qaytadi — chaqiruvchi zaxira
 * yo'lni (masalan AI orqali bo'lish) o'zi tanlaydi.
 */
export function splitIntoBlocks(columns: Column[], page: number): Block[] {
  const blocks: Block[] = [];
  let current: { number: number | null; rows: TextRow[] } | null = null;

  for (const column of columns) {
    for (const row of column.rows) {
      const number = questionNumber(row.text);
      if (number !== null) {
        if (current) blocks.push(makeBlock(current, blocks.length, page));
        current = { number, rows: [row] };
      } else if (current) {
        current.rows.push(row);
      }
      // current hali yo'q bo'lsa — bu birinchi savolgacha bo'lgan sarlavha
      // yoki kolontitul; u hech bir blokka tegishli emas va tashlab yuboriladi.
    }
  }
  if (current) blocks.push(makeBlock(current, blocks.length, page));

  return blocks;
}

function makeBlock(
  acc: { number: number | null; rows: TextRow[] },
  index: number,
  page: number,
): Block {
  const block: Block = {
    index,
    number: acc.number,
    rows: acc.rows,
    page,
    bbox: { x: 0, y: 0, w: 0, h: 0 },
  };
  block.bbox = blockBBox(block);
  return block;
}

// ---------------------------------------------------------------------------
// 4. Chegara to'rtburchagi
// ---------------------------------------------------------------------------

/** Blokdagi barcha qatorlarni qamrab oluvchi to'rtburchak. */
export function blockBBox(block: Block): BBox {
  const items = block.rows.flatMap((row) => row.items);
  if (items.length === 0) return { x: 0, y: 0, w: 0, h: 0 };

  const x = Math.min(...items.map((i) => i.x));
  const y = Math.min(...items.map((i) => i.y));
  const right = Math.max(...items.map((i) => i.x + i.w));
  const bottom = Math.max(...items.map((i) => i.y + i.h));
  return { x, y, w: right - x, h: bottom - y };
}
