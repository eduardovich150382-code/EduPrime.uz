/**
 * Hujjatdan import quvurining geometriya turlari.
 *
 * KOORDINATA KONVENSIYASI — butun quvur (bbox, ImportAsset.bbox,
 * ImportDraft.sourceBbox) shu yagona konvensiyada ishlaydi:
 *
 *   - Birlik — PDF nuqtasi (point), piksel EMAS. Shu tufayli koordinatalar
 *     render masshtabidan (zoom, DPI) mustaqil: bir marta saqlangan bbox
 *     istalgan masshtabda qayta ishlatiladi.
 *   - Boshlanish nuqtasi — sahifaning yuqori-chap burchagi.
 *   - `x` o'ngga, `y` PASTGA o'sadi. Ya'ni `y` — bo'lakning/qatorning tepasi,
 *     katta `y` = sahifaning pasti.
 *
 * Shuning uchun bu yerdagi funksiyalarda hech qanday teskari saralash yo'q:
 * `y` bo'yicha o'sish tartibi to'g'ridan-to'g'ri o'qish tartibini beradi.
 *
 * pdfjs matn qatlamini pastdan-yuqoriga (PDF user space) beradi — uni
 * viewport koordinatalariga o'girish CHAQIRUVCHINING ishi, bu kutubxonaniki
 * emas. Kutubxona pdfjs'ga, brauzerga yoki bazaga bog'lanmaydi.
 */

/** PDF matn qatlamidan olingan bitta matn bo'lagi. */
export interface TextItem {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Bir gorizontal qatorga tushgan bo'laklar va ularning birlashgan matni. */
export interface TextRow {
  y: number;
  height: number;
  items: TextItem[];
  text: string;
}

/** Sahifaning bitta matn ustuni. */
export interface Column {
  xMin: number;
  xMax: number;
  rows: TextRow[];
}

/** To'rtburchak — ImportAsset.bbox va ImportDraft.sourceBbox bilan bir xil shakl. */
export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Bitta savolga tegishli deb aniqlangan qatorlar to'plami. */
export interface Block {
  index: number;
  number: number | null;
  rows: TextRow[];
  page: number;
  bbox: BBox;
}
