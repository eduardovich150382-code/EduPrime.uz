'use client';

import {
  useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore,
} from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, Download, ExternalLink } from 'lucide-react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { PdfViewerController, WorkerUnavailableError, computePageScale } from './pdf-viewer-state';
import { PdfPageRenderQueue, type PageRenderStatus } from './pdf-page-render-queue';

interface Props {
  fileUrl: string;
  title: string;
}

const MIN_SCALE = 0.4;
const MAX_SCALE = 3;
// Sahifalar ko'rinishga yetib kelishidan biroz oldin chizilsin (silliq
// aylantirish uchun) va ko'rinishdan chiqqach darhol emas, biroz keyin
// tashlansin — lekin baribir faqat "yaqin atrofdagilar" tirik qoladi, 50
// sahifalik PDF'ning barchasi emas (xotira uchun).
const OBSERVER_ROOT_MARGIN = '600px 0px';

function debugLog(event: string, ...details: unknown[]) {
  // Diagnostika uchun ataylab har doim (prod'da ham) yoqilgan — real
  // qurilmada masofaviy debug orqali tekshirish uchun.
  console.debug('[pdf]', event, ...details);
}

/**
 * pdf.js bilan PDF'ni canvas'larga chizadi. Faqat DALIL ko'rinish maydoniga
 * kirgan sahifa render qilinadi (IntersectionObserver + `PdfPageRenderQueue`);
 * ko'rinmaydigan sahifa — bo'sh joy egallovchi placeholder, canvas emas.
 * Hujjat yuklash holati `PdfViewerController`da, sahifa render navbati
 * `PdfPageRenderQueue`da — ikkalasi ham pdf.js'dan mustaqil va alohida
 * test qilingan; bu komponent ularni JSX'ga o'giradi.
 */
export default function PdfCanvasViewer({ fileUrl, title }: Props) {
  const t = useTranslations('courseLearn');
  const tCommon = useTranslations('common');

  const [controller] = useState(() => new PdfViewerController());
  const state = useSyncExternalStore(controller.subscribe, controller.getState);

  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const pageWrapperRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const containerWidthRef = useRef(0);

  const [visiblePages, setVisiblePages] = useState<Set<number>>(() => new Set());
  const [currentPage, setCurrentPage] = useState(1);
  // Haqiqiy kenglik kelgunicha ko'rinish kuzatuvi (IntersectionObserver)
  // ataylab boshlanmaydi — aks holda birinchi kadrda ko'ringan sahifa
  // (masalan 1-sahifa) kenglik hali 0 bo'lganda "ko'rindi" deb belgilanib,
  // navbat uni sukut bilan o'tkazib yuborishi va keyin hech qachon qayta
  // urinilmasligi mumkin edi.
  const [hasWidth, setHasWidth] = useState(false);

  // Haqiqiy sahifa chizuvchi — navbatga in'ektsiya qilinadi. Har doim
  // ref'lardan "jonli" qiymat o'qiydi, shuning uchun bog'liqliksiz barqaror.
  const renderPage = useCallback((pageNumber: number) => {
    let cancelled = false;
    let renderTask: RenderTask | null = null;

    const promise = (async () => {
      const pdf = pdfDocRef.current;
      const canvas = canvasRefs.current.get(pageNumber);
      debugLog('render:start', pageNumber, { hasPdf: !!pdf, hasCanvas: !!canvas });
      if (!pdf || !canvas) {
        // Navbat canvas DOM'ga qo'yilgandan keyingina chaqiradi — bu yerga
        // tushish kutilmagan holat, shuning uchun aniq xato bilan chiqamiz.
        throw new Error(`${pageNumber}-sahifa uchun canvas yoki hujjat topilmadi`);
      }

      const page = await pdf.getPage(pageNumber);
      if (cancelled) {
        debugLog('render:cancelled-before-draw', pageNumber);
        return;
      }

      const intrinsicWidth = page.getViewport({ scale: 1 }).width;
      const scale = computePageScale(containerWidthRef.current, intrinsicWidth, { min: MIN_SCALE, max: MAX_SCALE });
      const outputScale = window.devicePixelRatio || 1;
      const cssViewport = page.getViewport({ scale });
      const deviceViewport = page.getViewport({ scale: scale * outputScale });

      // Canvas o'lchami FAQAT shu yerda, bir marta o'rnatiladi — navbat
      // bitta sahifani ikki marta render qilishga yo'l qo'ymaydi, shuning
      // uchun bu joy qayta ishga tushmaydi (aks holda o'rnatish canvas'ni
      // tozalab, chizilgan tasvirni o'chirib yuborardi).
      canvas.width = Math.floor(deviceViewport.width);
      canvas.height = Math.floor(deviceViewport.height);
      canvas.style.width = `${Math.floor(cssViewport.width)}px`;
      canvas.style.height = `${Math.floor(cssViewport.height)}px`;

      const context = canvas.getContext('2d');
      if (!context) throw new Error('2D kontekst olinmadi');

      if (cancelled) {
        debugLog('render:cancelled-before-task', pageNumber);
        return;
      }
      renderTask = page.render({ canvasContext: context, viewport: deviceViewport });
      debugLog('render:task-started', pageNumber);
      await renderTask.promise;
      debugLog('render:done', pageNumber);
    })();

    return {
      promise,
      cancel: () => {
        cancelled = true;
        if (renderTask) {
          debugLog('render:cancel-task', pageNumber);
          renderTask.cancel();
        }
      },
    };
  }, []);

  const [queue] = useState(() => new PdfPageRenderQueue({
    renderPage,
    log: (event, pageNumber, extra) => debugLog(`queue:${event}`, pageNumber, extra),
  }));
  const queueVersion = useSyncExternalStore(queue.subscribe, queue.getVersion);

  // Konteyner kengligini kuzatish — haqiqiy kenglik kelmaguncha navbat
  // hech qanday render boshlamaydi (`queue.setContainerWidth`).
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (!width) return;
      const rounded = Math.floor(width);
      debugLog('container-width', rounded);
      containerWidthRef.current = rounded;
      queue.setContainerWidth(rounded);
      setHasWidth(true);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [queue]);

  // Hujjatni yuklash — dars almashtirilsa (fileUrl o'zgarsa) yoki komponent
  // yopilsa oldingi yuklash va barcha faol sahifa renderlari bekor qilinadi.
  useEffect(() => {
    pdfDocRef.current = null;
    canvasRefs.current.clear();
    pageWrapperRefs.current.clear();
    setVisiblePages(new Set());
    setCurrentPage(1);

    debugLog('doc:load-start', fileUrl);
    controller.start(async () => {
      const pdfjsLib = await import('pdfjs-dist');
      const workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
      if (!workerSrc) throw new WorkerUnavailableError();
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
      const pdf = await pdfjsLib.getDocument(fileUrl).promise;
      pdfDocRef.current = pdf;
      debugLog('doc:loaded', { pageCount: pdf.numPages });
      return { pageCount: pdf.numPages };
    });

    return () => {
      debugLog('doc:cleanup', fileUrl);
      controller.cancel();
      queue.cancelAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl]);

  // Qaysi sahifa qutilari ko'rinish maydoniga yaqinligini kuzatadi.
  // Ko'rinishdan chiqqan sahifaning faol renderi shu yerda bekor qilinadi.
  useEffect(() => {
    if (state.status !== 'success' || !hasWidth) return;
    const root = containerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver((entries) => {
      setVisiblePages((prev) => {
        let changed = false;
        const next = new Set(prev);
        entries.forEach((entry) => {
          const pageNumber = Number(entry.target.getAttribute('data-page-number'));
          if (!pageNumber) return;
          if (entry.isIntersecting) {
            if (!next.has(pageNumber)) { next.add(pageNumber); changed = true; }
          } else if (next.has(pageNumber)) {
            next.delete(pageNumber);
            changed = true;
            debugLog('visibility:hidden', pageNumber);
            queue.onPageHidden(pageNumber);
          }
        });
        return changed ? next : prev;
      });
    }, { root, rootMargin: OBSERVER_ROOT_MARGIN, threshold: 0.01 });

    pageWrapperRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [state, hasWidth, queue]);

  // Ko'rinishga kirgan sahifalarni navbatga qo'yadi. Bu effect faqat
  // `visiblePages` commit qilingandan (canvas DOM'ga qo'yilgandan) KEYIN
  // ishga tushadi — shuning uchun `renderPage` ichida canvas hech qachon
  // topilmay qolmaydi (eski, iframesiz versiyadagi bosh xato aynan shu edi:
  // fon sikli canvas hali DOM'da yo'q paytda ishlagan).
  useEffect(() => {
    visiblePages.forEach((pageNumber) => {
      if (!canvasRefs.current.get(pageNumber)) return;
      debugLog('visibility:visible', pageNumber);
      queue.onPageVisible(pageNumber);
    });
  }, [visiblePages, queue]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { scrollTop } = container;
    let closestPage = 1;
    let closestDistance = Infinity;
    pageWrapperRefs.current.forEach((el, pageNumber) => {
      const distance = Math.abs(el.offsetTop - scrollTop);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPage = pageNumber;
      }
    });
    setCurrentPage(closestPage);
  }, []);

  if (state.status === 'error') {
    debugLog('doc:error', state.reason);
    return (
      <div className="flex flex-col items-center text-center gap-3 py-8 px-4 rounded-xl border border-border bg-gray-50">
        <AlertCircle size={28} className="text-gray-300" />
        <p className="text-sm text-text-secondary">{t('pdfLoadError')}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary inline-flex items-center gap-2 min-h-[44px] !px-4 text-sm"
          >
            <ExternalLink size={16} /> {t('pdfOpenExternally')}
          </a>
          <a href={fileUrl} download className="btn-secondary inline-flex items-center gap-2 min-h-[44px] !px-4 text-sm">
            <Download size={16} /> {t('pdfDownload')}
          </a>
        </div>
      </div>
    );
  }

  const pageCount = state.status === 'success' ? state.pageCount : 0;

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="relative w-full overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-gray-100 space-y-2 p-2"
        style={{ height: '70vh', maxHeight: 640 }}
      >
        {state.status === 'loading' && (
          <div className="flex items-center justify-center h-full text-sm text-text-secondary">{tCommon('loading')}</div>
        )}
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNumber) => {
          // `queueVersion` shu qatorni har bir holat o'zgarishida qayta
          // o'qishga majbur qiladi — o'zi hech narsa qaytarmaydi, faqat
          // React'ga "qayta render qil" deb signal beradi.
          void queueVersion;
          const status: PageRenderStatus = queue.getStatus(pageNumber);
          const showCanvas = visiblePages.has(pageNumber) || status !== 'pending';
          return (
            <div
              key={pageNumber}
              data-page-number={pageNumber}
              ref={(el) => {
                if (el) pageWrapperRefs.current.set(pageNumber, el);
                else pageWrapperRefs.current.delete(pageNumber);
              }}
              className="flex justify-center"
            >
              {showCanvas ? (
                <canvas
                  ref={(el) => {
                    if (el) canvasRefs.current.set(pageNumber, el);
                    else canvasRefs.current.delete(pageNumber);
                  }}
                  className="max-w-full rounded shadow-sm bg-white"
                />
              ) : (
                <div className="w-full aspect-[3/4] max-w-[420px] rounded bg-gray-200 animate-pulse" />
              )}
            </div>
          );
        })}
      </div>
      {pageCount > 0 && (
        <div className="flex items-center justify-between text-xs text-text-secondary px-1">
          <span className="truncate">{title}</span>
          <span className="font-medium flex-shrink-0">{currentPage} / {pageCount}</span>
        </div>
      )}
    </div>
  );
}
