'use client';

import {
  useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore,
} from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, Download, ExternalLink } from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { PdfViewerController, WorkerUnavailableError, computePageScale } from './pdf-viewer-state';

interface Props {
  fileUrl: string;
  title: string;
}

const MIN_SCALE = 0.4;
const MAX_SCALE = 3;

/**
 * pdf.js bilan PDF'ni canvas'larga chizadi. Yuklash/xato holatlari
 * `PdfViewerController`da (mustaqil, node muhitida test qilingan) —
 * bu komponent shunchaki uni JSX'ga o'giradi.
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

  const [renderedCount, setRenderedCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);

  // Konteyner kengligini kuzatish — mobil aylanish yoki ekran o'lchami
  // o'zgarganda sahifalar konteyner kengligiga qayta moslashtirilishi uchun
  // (gorizontal aylanish bo'lmasligi shart).
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidth(Math.floor(width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Hujjatni yuklash — `fileUrl` o'zgarganda (yoki komponent unmount
  // bo'lganda, masalan foydalanuvchi boshqa darsga o'tsa) oldingi yuklash
  // bekor qilinadi (`controller.cancel()`), shuning uchun kech kelgan
  // natija endi ko'rinmayotgan komponentga sizib chiqmaydi.
  useEffect(() => {
    pdfDocRef.current = null;
    setRenderedCount(0);
    setCurrentPage(1);
    canvasRefs.current.clear();
    pageWrapperRefs.current.clear();

    controller.start(async () => {
      const pdfjsLib = await import('pdfjs-dist');
      const workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
      if (!workerSrc) throw new WorkerUnavailableError();
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
      const pdf = await pdfjsLib.getDocument(fileUrl).promise;
      pdfDocRef.current = pdf;
      return { pageCount: pdf.numPages };
    });

    return () => controller.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl]);

  const renderPage = useCallback(async (pageNumber: number) => {
    const pdf = pdfDocRef.current;
    const canvas = canvasRefs.current.get(pageNumber);
    if (!pdf || !canvas || containerWidth <= 0) return;

    const page = await pdf.getPage(pageNumber);
    const intrinsicWidth = page.getViewport({ scale: 1 }).width;
    const scale = computePageScale(containerWidth, intrinsicWidth, { min: MIN_SCALE, max: MAX_SCALE });
    const viewport = page.getViewport({ scale });

    const outputScale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    const context = canvas.getContext('2d');
    if (!context) return;
    const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;
    await page.render({ canvasContext: context, viewport, transform }).promise;
  }, [containerWidth]);

  // Sahifalarni ketma-ket, progressiv chizish — birinchi sahifa ko'ringach
  // qolganlari fonda davom etadi, katta fayl uchun butun hujjat kutilmaydi.
  useEffect(() => {
    if (state.status !== 'success' || containerWidth <= 0) return;
    let cancelled = false;
    (async () => {
      for (let n = 1; n <= state.pageCount; n += 1) {
        if (cancelled) return;
        await renderPage(n);
        if (cancelled) return;
        setRenderedCount(n);
      }
    })();
    return () => { cancelled = true; };
  }, [state, containerWidth, renderPage]);

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
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNumber) => (
          <div
            key={pageNumber}
            ref={(el) => {
              if (el) pageWrapperRefs.current.set(pageNumber, el);
              else pageWrapperRefs.current.delete(pageNumber);
            }}
            className="flex justify-center"
          >
            {pageNumber <= renderedCount ? (
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
        ))}
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
