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
 * Koordinata konvensiyasi uchun ./types faylining boshidagi izohga qarang.
 */

// ---------------------------------------------------------------------------
// 1. Qatorlar
// ---------------------------------------------------------------------------

/**
 * Bir xil qatorda turgan matn bo'laklarini birlashtiradi.
 *
 * PDF matn qatlami qatorni bitta butun satr sifatida bermaydi: shrift yoki
 * kegl o'zgargan har joyda yangi bo'lak boshlanadi ("1. ", "Toshkent", " — ",
 * "poytaxt"). Shuning uchun qatorni y yaqinligi bo'yicha qayta yig'amiz.
 *
 * CHEKLOV: bu funksiya faqat y ni ko'radi, ustunlarni bilmaydi. Ikki ustunli
 * sahifada chap va o'ng ustun qatorlari AYNAN bir xil y da tursa, ular bitta
 * TextRow ga qo'shilib ketadi va detectColumns ularni ajratolmaydi. Amalda
 * ustun bazaviy chiziqlari kamdan-kam to'liq mos keladi, lekin bu chinakam
 * cheklov — haqiqiy PDF'larda uchrasa, ajratish detectColumns ga emas,
 * groupIntoRows dan oldingi bosqichga ko'chirilishi kerak.
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
// 2. Ustunlar
// ---------------------------------------------------------------------------

interface RowMetrics {
  row: TextRow;
  xMin: number;
  xMax: number;
  center: number;
  width: number;
}

/**
 * Sahifa ikki ustunli ekanini aniqlaydi.
 *
 * Ikki shart birga bajarilishi kerak: qator markazlari ikkita klasterga
 * ajralsin VA klasterlar orasida haqiqiy tik koridor bo'lsin. Faqat markaz
 * bo'yicha ajratish yetarli emas — bir ustunli matnda ham chekinishli
 * (abzatsli) qatorlar markazlari ikkiga bo'linib ko'rinadi.
 */
export function detectColumns(rows: TextRow[], pageWidth: number): Column[] {
  if (rows.length === 0) return [];

  const metrics: RowMetrics[] = rows
    .filter((r) => r.items.length > 0)
    .map(rowMetrics);
  if (metrics.length === 0) return [];

  // To'liq enli qatorlar (sarlavha, ko'rsatma) klasterlashga qo'shilmaydi —
  // ular ikkala ustunni kesib o'tadi va koridorni yopib qo'yadi.
  const candidates = metrics.filter(
    (m) => m.width < FULL_WIDTH_ROW_RATIO * pageWidth,
  );
  if (candidates.length < 2) return [toColumn(metrics)];

  const byCenter = [...candidates].sort((a, b) => a.center - b.center);
  const splitAt = largestCenterGapIndex(byCenter);
  const left = byCenter.slice(0, splitAt + 1);
  const right = byCenter.slice(splitAt + 1);

  const leftEdge = Math.max(...left.map((m) => m.xMax));
  const rightEdge = Math.min(...right.map((m) => m.xMin));
  if (rightEdge - leftEdge <= COLUMN_GAP_RATIO * pageWidth) {
    return [toColumn(metrics)];
  }

  const boundary = (leftEdge + rightEdge) / 2;
  const leftRows: RowMetrics[] = [];
  const rightRows: RowMetrics[] = [];
  for (const m of metrics) {
    // Koridorni kesib o'tuvchi qator (sarlavha) chap ustunga tushadi —
    // shunda u o'qish tartibida o'zidan keyingi savollardan oldin qoladi.
    const crossesCorridor = m.xMin < boundary && m.xMax > boundary;
    if (crossesCorridor || m.center < boundary) leftRows.push(m);
    else rightRows.push(m);
  }

  return [toColumn(leftRows), toColumn(rightRows)];
}

function rowMetrics(row: TextRow): RowMetrics {
  const xMin = Math.min(...row.items.map((i) => i.x));
  const xMax = Math.max(...row.items.map((i) => i.x + i.w));
  return { row, xMin, xMax, center: (xMin + xMax) / 2, width: xMax - xMin };
}

/** Markazlar ketma-ketligidagi eng katta bo'shliqdan oldingi indeks. */
function largestCenterGapIndex(byCenter: RowMetrics[]): number {
  let best = 0;
  let bestGap = -Infinity;
  for (let i = 0; i < byCenter.length - 1; i++) {
    const gap = byCenter[i + 1].center - byCenter[i].center;
    if (gap > bestGap) {
      bestGap = gap;
      best = i;
    }
  }
  return best;
}

function toColumn(metrics: RowMetrics[]): Column {
  const rows = [...metrics].sort((a, b) => a.row.y - b.row.y).map((m) => m.row);
  return {
    xMin: Math.min(...metrics.map((m) => m.xMin)),
    xMax: Math.max(...metrics.map((m) => m.xMax)),
    rows,
  };
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
