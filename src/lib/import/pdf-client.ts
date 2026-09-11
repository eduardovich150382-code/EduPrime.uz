/**
 * @deprecated PyMuPDF manifest yo'li bilan almashtirildi, qarang
 * lib/import/manifest.ts. Asosiy import yo'li bu faylni chaqirmaydi; kod va
 * testlari ataylab qoldirilgan — o'chirish alohida PR'da.
 */
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { RENDER_DPI } from './constants';
import type { TextItem } from './types';

/**
 * PDF'ni BRAUZERDA o'qish — quvurning yagona pdfjs'ga bog'liq qatlami.
 *
 * NIMA UCHUN BRAUZERDA: canvas u yerda tayyor, Vercel funksiyasining vaqt
 * chegarasi tegmaydi va server xarajati nolga tushadi. Buning evaziga bu
 * fayl unit test qilinmaydi (canvas, worker, `createImageBitmap` — hammasi
 * brauzer API'si); uning o'rniga sahifadagi `?debug=1` diagnostikasi
 * natijani haqiqiy PDF'da ko'z bilan tekshirish imkonini beradi.
 *
 * pdfjs sozlamasi `components/ui/PdfCanvasViewer.tsx` dagi bilan AYNAN bir
 * xil: dinamik import (og'ir kutubxona boshlang'ich paketga tushmasin) va
 * bundler orqali hal qilinadigan worker manzili (CDN emas — versiya
 * package.json da qotirilgan va u bilan mos kelishi kafolatlanishi kerak).
 */

/** 1 nuqta = 1/72 dyuym — PDF o'lchov birligi. */
const POINTS_PER_INCH = 72;

/** Render masshtabi: piksel/nuqta. `pixels.ts` funksiyalariga shu uzatiladi. */
export const RENDER_SCALE = RENDER_DPI / POINTS_PER_INCH;

/** Sahifa o'lchami va matn bo'laklari — hammasi PDF nuqtalarida. */
export interface PageText {
  items: TextItem[];
  pageWidth: number;
  pageHeight: number;
}

/**
 * pdfjs modulini bir marta yuklaydi va worker'ni sozlaydi.
 *
 * Modul darajasida keshlanadi: `getDocument` har chaqirilganda
 * `GlobalWorkerOptions` ni qayta yozish shart emas, va 40 sahifalik faylda
 * dinamik import qayta-qayta kutilmasin.
 */
let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;

function loadPdfjs(): Promise<typeof import('pdfjs-dist')> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString();
      return lib;
    });
  }
  return pdfjsPromise;
}

/**
 * Faylni PDF hujjati sifatida ochadi.
 *
 * Kirish — `ArrayBuffer`, URL emas: fayl foydalanuvchining o'zida turibdi va
 * uni serverdan qayta yuklab olish behuda (bir necha MB va kutish vaqti).
 */
export async function loadPdf(data: ArrayBuffer): Promise<PDFDocumentProxy> {
  const pdfjsLib = await loadPdfjs();
  return pdfjsLib.getDocument({ data }).promise;
}

/**
 * Sahifaning matn qatlamini quvurning koordinata konvensiyasida qaytaradi
 * (yuqoridan pastga, PDF nuqtalarida — ./types faylining boshidagi izoh).
 *
 * O'GIRISH QO'LDA HISOBLANMAYDI: `viewport.transform` va
 * `Util.transform` pdfjs'ning o'zinikidir, shuning uchun aylantirilgan
 * (`/Rotate 90`) yoki noodatiy `MediaBox` li sahifalarda ham to'g'ri
 * ishlaydi. Qo'lda `pageHeight - y` yozilsa, aynan shunday sahifalarda
 * koordinata jimgina noto'g'ri chiqardi.
 */
export async function extractText(pdf: PDFDocumentProxy, pageNum: number): Promise<PageText> {
  const pdfjsLib = await loadPdfjs();
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();

  const items: TextItem[] = [];
  for (const raw of content.items) {
    if (!('str' in raw)) continue; // TextMarkedContent — matn emas
    const str = raw.str;
    if (!str.trim()) continue;

    const m = pdfjsLib.Util.transform(viewport.transform, raw.transform);
    // Matritsadan: [a, b, c, d, e, f] — (e, f) matn asosining chap nuqtasi,
    // `d` esa tik masshtab. Balandlik `raw.height` da nolga teng bo'lib
    // qolishi mumkin (ba'zi shriftlarda), shuning uchun matritsa zaxira.
    const height = raw.height || Math.abs(m[3]) || 0;
    items.push({
      str,
      x: m[4],
      y: m[5] - height, // `y` — bo'lakning TEPASI, asosi emas
      w: raw.width,
      h: height,
    });
  }

  return { items, pageWidth: viewport.width, pageHeight: viewport.height };
}

/**
 * Sahifani canvas'ga render qiladi.
 *
 * Fon ATAYLAB oq bilan to'ldiriladi: pdfjs sahifani shaffof fonga chizadi,
 * shaffof piksel esa RGBA'da (0,0,0,0) — ya'ni `pixels.ts` uchun eng qora
 * piksel. To'ldirilmasa butun sahifa "siyoh" bo'lib chiqardi. (`isInk` ham
 * alfani hisobga oladi, lekin himoya ikki tomonlama bo'lgani ma'qul — bu
 * canvas shuningdek diagnostika rasmiga ham asos bo'ladi.)
 */
export async function renderPageToCanvas(
  pdf: PDFDocumentProxy,
  pageNum: number,
  dpi: number = RENDER_DPI,
): Promise<HTMLCanvasElement> {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: dpi / POINTS_PER_INCH });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D kontekst olinmadi');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
}

/**
 * Canvas'ni bo'shatadi.
 *
 * 40 sahifalik faylda har sahifa 300 DPI da ≈ 35 MB egallaydi — havolani
 * tashlashning o'zi yetarli emas, chunki brauzer canvas xotirasini darhol
 * qaytarmaydi. O'lchamni nolga tushirish uni majburlaydi.
 */
export function releaseCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 0;
  canvas.height = 0;
}
