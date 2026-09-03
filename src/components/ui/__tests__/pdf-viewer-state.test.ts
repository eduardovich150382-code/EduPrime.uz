import { describe, it, expect, vi } from 'vitest';
import {
  PdfViewerController, WorkerUnavailableError, classifyPdfLoadError, computePageScale, IDLE_STATE,
} from '../pdf-viewer-state';

describe('PdfViewerController', () => {
  it('boshlang\'ich holat idle', () => {
    const controller = new PdfViewerController();
    expect(controller.getState()).toEqual(IDLE_STATE);
  });

  it('start() darhol loading holatiga o\'tkazadi', () => {
    const controller = new PdfViewerController();
    controller.start(() => new Promise(() => {})); // hech qachon tugamaydi
    expect(controller.getState()).toEqual({ status: 'loading' });
  });

  it('muvaffaqiyatli yuklash success holatiga o\'tkazadi', async () => {
    const controller = new PdfViewerController();
    controller.start(() => Promise.resolve({ pageCount: 12 }));
    await Promise.resolve(); // mikrotask navbatini bo'shatish
    expect(controller.getState()).toEqual({ status: 'success', pageCount: 12 });
  });

  it('xato holatida fallback:true va sabab load-failed bo\'ladi', async () => {
    const controller = new PdfViewerController();
    controller.start(() => Promise.reject(new Error('network xatosi')));
    await Promise.resolve();
    expect(controller.getState()).toEqual({ status: 'error', fallback: true, reason: 'load-failed' });
  });

  it('worker topilmagan holatda sabab worker-unavailable bo\'ladi', async () => {
    const controller = new PdfViewerController();
    controller.start(() => Promise.reject(new WorkerUnavailableError()));
    await Promise.resolve();
    expect(controller.getState()).toEqual({ status: 'error', fallback: true, reason: 'worker-unavailable' });
  });

  it('cancel() holatni idle qiladi va keyinroq kelgan natijani e\'tiborsiz qoldiradi', async () => {
    const controller = new PdfViewerController();
    let resolveLoad!: (result: { pageCount: number }) => void;
    controller.start(() => new Promise((resolve) => { resolveLoad = resolve; }));

    controller.cancel();
    expect(controller.getState()).toEqual(IDLE_STATE);

    resolveLoad({ pageCount: 3 }); // foydalanuvchi darsdan chiqib ketgandan keyin tugaydi
    await Promise.resolve();
    await Promise.resolve();
    expect(controller.getState()).toEqual(IDLE_STATE); // sizib chiqmadi
  });

  it('darsni tez almashtirish (start() ustma-ust chaqirilishi) — faqat oxirgi natija qo\'llanadi', async () => {
    const controller = new PdfViewerController();
    let resolveFirst!: (result: { pageCount: number }) => void;
    controller.start(() => new Promise((resolve) => { resolveFirst = resolve; }));

    controller.start(() => Promise.resolve({ pageCount: 5 }));
    await Promise.resolve();
    expect(controller.getState()).toEqual({ status: 'success', pageCount: 5 });

    resolveFirst({ pageCount: 999 }); // birinchi (almashtirilgan) yuklash kech tugaydi
    await Promise.resolve();
    await Promise.resolve();
    expect(controller.getState()).toEqual({ status: 'success', pageCount: 5 }); // eski natija e'tiborsiz
  });

  it('subscribe() har bir holat o\'zgarishida chaqiriladi, unsubscribe qilingach chaqirilmaydi', async () => {
    const controller = new PdfViewerController();
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);

    controller.start(() => Promise.resolve({ pageCount: 1 }));
    await Promise.resolve();
    expect(listener).toHaveBeenCalledWith({ status: 'loading' });
    expect(listener).toHaveBeenCalledWith({ status: 'success', pageCount: 1 });

    unsubscribe();
    controller.cancel();
    expect(listener).not.toHaveBeenCalledWith(IDLE_STATE);
  });
});

describe('classifyPdfLoadError', () => {
  it('WorkerUnavailableError -> worker-unavailable', () => {
    expect(classifyPdfLoadError(new WorkerUnavailableError())).toBe('worker-unavailable');
  });

  it('"worker" so\'zi bilan Error -> worker-unavailable', () => {
    expect(classifyPdfLoadError(new Error('Failed to fetch worker script'))).toBe('worker-unavailable');
  });

  it('oddiy Error -> load-failed', () => {
    expect(classifyPdfLoadError(new Error('Invalid PDF structure'))).toBe('load-failed');
  });

  it('Error bo\'lmagan qiymat (masalan string throw) -> load-failed', () => {
    expect(classifyPdfLoadError('nimadir noto\'g\'ri ketdi')).toBe('load-failed');
    expect(classifyPdfLoadError(undefined)).toBe('load-failed');
  });
});

describe('computePageScale', () => {
  it('konteyner kengligiga moslashtiradi', () => {
    expect(computePageScale(360, 600)).toBeCloseTo(0.6);
  });

  it('min chegaradan pastga tushmaydi', () => {
    expect(computePageScale(50, 2000, { min: 0.4 })).toBe(0.4);
  });

  it('max chegaradan oshmaydi', () => {
    expect(computePageScale(3000, 300, { max: 3 })).toBe(3);
  });

  it('nomavjud o\'lchamlarda min qiymatga tushadi', () => {
    expect(computePageScale(0, 600)).toBe(0.4);
    expect(computePageScale(360, 0)).toBe(0.4);
  });
});
