import { groupIntoRows } from "./blocks";
import {
  COLUMN_GAP_MIN_PT,
  CORRIDOR_BIN_PT,
  CORRIDOR_CENTER_BAND,
  CORRIDOR_MAX_COVERAGE,
  CORRIDOR_MAX_COVERAGE_CAP,
  CORRIDOR_TOLERATED_ROWS,
  FULL_WIDTH_ROW_RATIO,
  HEADER_FOOTER_BAND_RATIO,
  MIN_COLUMN_ROWS,
} from "./constants";
import type { Column, TextItem, TextRow } from "./types";

/**
 * Sahifani matn ustunlariga ajratish — quvurning birinchi bosqichi
 * (items → detectColumns → har ustunda groupIntoRows → splitIntoBlocks).
 *
 * Ustun KORIDOR bo'yicha aniqlanadi — bo'lak markazlarini klasterlash bo'yicha
 * emas. Klasterlash abzatsli bir ustunli matnda yolg'on ijobiy beradi:
 * chekinishli satrlar markazlari o'z-o'zidan ikkita to'plamga ajralib ko'rinadi.
 * Koridor esa fizik dalil: deyarli hech bir qator tegmagan tik tasma faqat
 * ustunlar orasida bo'ladi.
 *
 * "Deyarli" — muhim so'z. Koridor MUTLAQO bo'sh bo'lishi talab qilinmaydi:
 * ikki ustunni kesuvchi sarlavha yoki javoblar jadvali haqiqiy PDF'larda
 * odatiy, va ular butun sahifani bir ustunli qilib qo'ymasligi kerak. Shuning
 * uchun har tik ustuncha uchun uni kesuvchi QATORLAR ULUSHI o'lchanadi va
 * past ulushli tasma koridor hisoblanadi.
 *
 * Hisobot (`CorridorReport`) qaror bilan birga qaytadi: natija yomon chiqsa,
 * diagnostikada qaysi shart yiqilgani va haqiqiy oraliq necha nuqta ekani
 * ko'rinadi — chegarani taxmin bilan emas, o'lchangan qiymat bilan sozlash uchun.
 */

/** Koridor bo'yicha qaror; `TWO_COLUMNS` dan boshqasi — bitta ustun. */
export type CorridorDecision =
  | "TWO_COLUMNS"
  | "NO_BAND"
  | "CENTER_FAIL"
  | "WIDTH_FAIL"
  | "SIDE_ROWS_FAIL";

/** Past qoplamali tik tasma, PDF nuqtalarida. */
export interface CorridorBand {
  min: number;
  max: number;
  width: number;
  /** Tasma ichidagi eng yuqori ustuncha qoplamasi (qatorlar ulushi). */
  coverage: number;
}

export interface CorridorReport {
  /** Hisobga olingan (tana) matn qatorlari soni. */
  rows: number;
  /** Shu sahifa uchun qo'llangan qoplama chegarasi. */
  effectiveMaxCoverage: number;
  /**
   * Sahifaning o'rta zonasidagi eng past ustuncha qoplamasi. Koridor qoplama
   * sababli tasmaga aylanmasa, chegaraga qanchalik yaqin kelgani shu yerda.
   */
  minCenterCoverage: number | null;
  bestBand: CorridorBand | null;
  centerOk: boolean;
  widthOk: boolean;
  leftRows: number;
  rightRows: number;
  decision: CorridorDecision;
}

/**
 * Ustun koridorini qidiradi va har bir shart natijasini hisobotga yozadi.
 *
 * Qatorlar SAHIFA darajasida yig'iladi (ustunlar hali ma'lum emas) — ikki
 * ustunning bir xil balandlikdagi matni bitta qatorga qo'shilib ketadi, lekin
 * bu yerda zararsiz: bizga faqat "shu ustunchani nechta qator kesadi" kerak.
 * Ulush ELEMENT soni bo'yicha emas, qator bo'yicha olinadi — aks holda zich
 * matn (bir qatorda o'nlab bo'lak) ustunchani bir necha marta sanardi.
 */
export function analyzeCorridor(
  items: TextItem[],
  pageWidth: number,
  pageHeight: number,
): CorridorReport {
  const rows = groupIntoRows(bodyItems(items, pageWidth, pageHeight));
  const report: CorridorReport = {
    rows: rows.length,
    effectiveMaxCoverage: effectiveMaxCoverage(rows.length),
    minCenterCoverage: null,
    bestBand: null,
    centerOk: false,
    widthOk: false,
    leftRows: 0,
    rightRows: 0,
    decision: "NO_BAND",
  };
  if (rows.length === 0 || pageWidth <= 0) return report;

  const coverage = binCoverage(rows, pageWidth);
  const middleMin = ((1 - CORRIDOR_CENTER_BAND) / 2) * pageWidth;
  const middleMax = pageWidth - middleMin;
  const isCentered = (band: CorridorBand) => {
    const center = (band.min + band.max) / 2;
    return center >= middleMin && center <= middleMax;
  };

  coverage.forEach((value, b) => {
    const center = (b + 0.5) * CORRIDOR_BIN_PT;
    if (center < middleMin || center > middleMax) return;
    if (report.minCenterCoverage === null || value < report.minCenterCoverage) {
      report.minCenterCoverage = value;
    }
  });

  // Hoshiyalar ham nomzod bo'ladi: ular markaz sharti bilan rad etiladi, ya'ni
  // "sahifa cheti" va "ustunlar orasi" bitta o'lchov bilan ajratiladi.
  const bands = lowCoverageBands(coverage, report.effectiveMaxCoverage, pageWidth);
  if (bands.length === 0) return report;

  // Markaz sharti eng kengini tanlashdan OLDIN qo'llanadi: haqiqiy ikki ustunli
  // sahifada o'ng hoshiya ko'pincha koridordan keng bo'ladi, avval eng kengini
  // olsak, u markaz shartida yiqilib, sahifa bir ustunli deb topilar edi.
  const centered = bands.filter(isCentered);
  const best =
    centered.length > 0
      ? centered.reduce((a, b) => (b.width > a.width ? b : a))
      : // Hisobot uchun: markazga eng yaqin tasma — "nima uchun topilmadi"
        // savoliga eng ko'p javob beradigani.
        bands.reduce((a, b) =>
          distanceToCenter(b, pageWidth) < distanceToCenter(a, pageWidth) ? b : a,
        );

  report.bestBand = best;
  report.centerOk = centered.length > 0;
  report.widthOk = best.width >= COLUMN_GAP_MIN_PT;
  // Eni yiqilgan holatda ham sanaladi — diagnostikada hamma shart birdaniga
  // ko'rinsin, bittasini tuzatib, keyingisiga yana bir aylanish ketmasin.
  const sides = countSideRows(rows, best);
  report.leftRows = sides.left;
  report.rightRows = sides.right;

  if (!report.centerOk) report.decision = "CENTER_FAIL";
  else if (!report.widthOk) report.decision = "WIDTH_FAIL";
  else if (sides.left < MIN_COLUMN_ROWS || sides.right < MIN_COLUMN_ROWS) {
    report.decision = "SIDE_ROWS_FAIL";
  } else report.decision = "TWO_COLUMNS";

  return report;
}

/**
 * Qator soniga moslashuvchan qoplama chegarasi.
 *
 * Qattiq 3% siyrak sahifada bitta kesuvchi qatorga ham yetmaydi (1/25 = 4%),
 * shuning uchun kamida `CORRIDOR_TOLERATED_ROWS` ta qator doim kechiriladi;
 * shift esa haqiqiy bir ustunli matn ikkiga bo'linishining oldini oladi.
 */
export function effectiveMaxCoverage(rowCount: number): number {
  if (rowCount <= 0) return CORRIDOR_MAX_COVERAGE;
  return Math.min(
    CORRIDOR_MAX_COVERAGE_CAP,
    Math.max(CORRIDOR_MAX_COVERAGE, CORRIDOR_TOLERATED_ROWS / rowCount),
  );
}

/**
 * Koridorni aniqlashda hisobga olinadigan bo'laklar.
 *
 * Kolontitul tasmasiga BUTUNLAY tushgan bo'lak (sahifa raqami, fan nomi)
 * tashlanadi — `figures.ts` dagi `HEADER_FOOTER` bilan aynan bir xil talqin,
 * ikkisi ajralib ketmasin. To'liq enli bo'lak ham tashlanadi: u ikkala
 * ustunni qoplaydi va hech qanday koridor haqida ma'lumot bermaydi.
 */
function bodyItems(items: TextItem[], pageWidth: number, pageHeight: number): TextItem[] {
  const band = HEADER_FOOTER_BAND_RATIO * pageHeight;
  return items.filter(
    (i) =>
      i.w < FULL_WIDTH_ROW_RATIO * pageWidth &&
      i.y + i.h > band &&
      i.y < pageHeight - band,
  );
}

/** Har ustunchani kesib o'tuvchi qatorlar ulushi. */
function binCoverage(rows: TextRow[], pageWidth: number): number[] {
  const binCount = Math.ceil(pageWidth / CORRIDOR_BIN_PT);
  const counts = new Array<number>(binCount).fill(0);
  // Bitta qator ustunchani faqat bir marta sanasin — qatordagi bo'laklar
  // soni qoplamaga ta'sir qilmasligi kerak.
  const lastRow = new Array<number>(binCount).fill(-1);

  rows.forEach((row, r) => {
    for (const item of row.items) {
      if (item.w <= 0) continue;
      const first = Math.max(0, Math.floor(item.x / CORRIDOR_BIN_PT));
      const last = Math.min(binCount - 1, Math.ceil((item.x + item.w) / CORRIDOR_BIN_PT) - 1);
      for (let b = first; b <= last; b++) {
        if (lastRow[b] === r) continue;
        lastRow[b] = r;
        counts[b]++;
      }
    }
  });

  return counts.map((count) => count / rows.length);
}

/**
 * Qoplamasi chegaradan oshmaydigan uzluksiz ustunchalar tasmalari.
 *
 * Tasma chegaralari ustuncha chegaralarida — qisman tegilgan ustuncha ham
 * qoplangan hisoblanadi, shuning uchun o'lchangan en haqiqiy oraliqdan faqat KICHIK
 * chiqadi (xato har doim "bir ustun" tomonga).
 */
function lowCoverageBands(
  coverage: number[],
  maxCoverage: number,
  pageWidth: number,
): CorridorBand[] {
  const bands: CorridorBand[] = [];
  let start = -1;
  let peak = 0;

  for (let b = 0; b <= coverage.length; b++) {
    const low = b < coverage.length && coverage[b] <= maxCoverage;
    if (low) {
      if (start < 0) {
        start = b;
        peak = 0;
      }
      peak = Math.max(peak, coverage[b]);
    } else if (start >= 0) {
      const min = start * CORRIDOR_BIN_PT;
      const max = Math.min(b * CORRIDOR_BIN_PT, pageWidth);
      bands.push({ min, max, width: max - min, coverage: peak });
      start = -1;
    }
  }
  return bands;
}

function distanceToCenter(band: CorridorBand, pageWidth: number): number {
  return Math.abs((band.min + band.max) / 2 - pageWidth / 2);
}

/**
 * Koridorning chap va o'ng tomonida bo'lagi bor qatorlar soni.
 *
 * Koridorni kesuvchi bo'lak (shovqin) hech bir tomonga sanalmaydi. Bir xil
 * qatorda ikkala ustun matni bo'lsa, qator ikkala tomonga ham sanaladi.
 */
function countSideRows(rows: TextRow[], band: CorridorBand): { left: number; right: number } {
  let left = 0;
  let right = 0;
  for (const row of rows) {
    if (row.items.some((i) => i.x + i.w <= band.min)) left++;
    if (row.items.some((i) => i.x >= band.max)) right++;
  }
  return { left, right };
}

/**
 * Sahifa bo'laklarini ustunlarga ajratadi va har ustunni qatorlarga yig'adi.
 *
 * `corridor` odatda tashqaridan uzatiladi (run-import) — shunda diagnostikada
 * ko'rsatiladigan hisobot aynan shu taqsimlashda ishlatilgani kafolatlanadi.
 *
 * CHEKLOV: taqsimot BO'LAK darajasida ketadi, shuning uchun bir necha bo'lakka
 * bo'lingan va bo'laklari koridorning ikki tomoniga tushgan sarlavha
 * ("MATEMATIKA" va "TESTI" alohida bo'lak bo'lsa) ikki ustunga ajralib ketadi.
 * Bitta keng bo'lak sifatida kelgan sarlavha to'g'ri ishlaydi — u koridorni
 * kesib o'tadi va butunicha chap ustunga tushadi.
 */
export function detectColumns(
  items: TextItem[],
  pageWidth: number,
  pageHeight: number,
  corridor: CorridorReport = analyzeCorridor(items, pageWidth, pageHeight),
): Column[] {
  if (items.length === 0) return [];
  if (corridor.decision !== "TWO_COLUMNS" || !corridor.bestBand) {
    return [buildColumn(items)];
  }

  const { min, max } = corridor.bestBand;
  const boundary = (min + max) / 2;
  const left: TextItem[] = [];
  const right: TextItem[] = [];

  // Aniqlashdan chetlatilgan bo'laklar (kolontitul, to'liq enli) ham shu yerda
  // taqsimlanadi — ular faqat koridorni topishda hisobga olinmagan edi.
  for (const item of items) {
    // Koridorni kesib o'tuvchi bo'lak (sarlavha, keng jadval) hech qaysi ustunga
    // to'liq tegishli emas — uni chap ustunga, o'z y pozitsiyasida qoldiramiz:
    // shunda u o'qish tartibida o'zidan keyingi savollardan oldin turadi.
    const crossesCorridor = item.x < max && item.x + item.w > min;
    if (crossesCorridor || item.x + item.w / 2 < boundary) left.push(item);
    else right.push(item);
  }

  // Ikkala tomon bo'sh emasligi kafolatlangan: TWO_COLUMNS har tomonda
  // MIN_COLUMN_ROWS qatorni talab qiladi.
  return [buildColumn(left), buildColumn(right)];
}

function buildColumn(items: TextItem[]): Column {
  return {
    xMin: Math.min(...items.map((i) => i.x)),
    xMax: Math.max(...items.map((i) => i.x + i.w)),
    rows: groupIntoRows(items),
  };
}
