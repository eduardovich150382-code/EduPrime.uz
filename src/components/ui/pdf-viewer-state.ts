// PDF ko'ruvchining yuklash holat mashinasi — pdf.js'dan mustaqil, sof TS.
// `PdfCanvasViewer` bu modulni node muhitida test qilib bo'lmaydigan qismdan
// (pdf.js, canvas, DOM) ajratib turadi: `PdfViewerController.start()` chaqiruvchi
// tomonidan berilgan `loadFn` orqali ishlaydi, shuning uchun pdf.js'ni haqiqiy
// import qilmasdan ham (mock loadFn bilan) yuklash/muvaffaqiyat/xato/bekor
// qilish holatlarini to'liq test qilish mumkin.

export type PdfViewerFailureReason = 'load-failed' | 'worker-unavailable';

export type PdfViewerState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; pageCount: number }
  | { status: 'error'; fallback: true; reason: PdfViewerFailureReason };

export const IDLE_STATE: PdfViewerState = { status: 'idle' };

/**
 * pdf.js worker fayli (build vaqtida `new URL(...)` orqali bandlangan) manzili
 * bo'sh chiqsa, buni jim tarzda "fake worker"ga tushirib (butun render'ni asosiy
 * oqimda, sekin va telefonni qotirib) qoldirish o'rniga aniq xato sifatida
 * ko'rsatamiz — sababi diagnostika qilinadigan bo'lsin.
 */
export class WorkerUnavailableError extends Error {
  constructor(message = "PDF worker fayli topilmadi") {
    super(message);
    this.name = 'WorkerUnavailableError';
  }
}

export function classifyPdfLoadError(error: unknown): PdfViewerFailureReason {
  if (error instanceof WorkerUnavailableError) return 'worker-unavailable';
  if (error instanceof Error && /worker/i.test(error.message)) return 'worker-unavailable';
  return 'load-failed';
}

interface LoadResult {
  pageCount: number;
}

/**
 * Har bir `start()` chaqiruvi "avlod" (generation) raqamini oshiradi — eski
 * (bekor qilingan yoki almashtirilgan) yuklash keyinroq tugasa ham, uning
 * natijasi e'tiborsiz qoldiriladi. Bu foydalanuvchi darsni tez almashtirsa
 * (masalan PDF hali yuklanayotganda boshqa darsga o'tsa) eski holat yangi
 * komponentga sizib chiqmasligini kafolatlaydi.
 */
export class PdfViewerController {
  private generation = 0;
  private state: PdfViewerState = IDLE_STATE;
  private listeners = new Set<(state: PdfViewerState) => void>();

  getState = (): PdfViewerState => this.state;

  subscribe = (listener: (state: PdfViewerState) => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private setState(next: PdfViewerState) {
    this.state = next;
    this.listeners.forEach((listener) => listener(next));
  }

  start(loadFn: () => Promise<LoadResult>): void {
    const generation = ++this.generation;
    this.setState({ status: 'loading' });
    loadFn().then(
      (result) => {
        if (generation !== this.generation) return; // bekor qilingan yoki almashtirilgan
        this.setState({ status: 'success', pageCount: result.pageCount });
      },
      (error: unknown) => {
        if (generation !== this.generation) return;
        this.setState({ status: 'error', fallback: true, reason: classifyPdfLoadError(error) });
      },
    );
  }

  cancel(): void {
    this.generation += 1; // kutilayotgan natijani bekor qiladi
    this.setState(IDLE_STATE);
  }
}

export interface ScaleBounds {
  min?: number;
  max?: number;
}

/**
 * PDF sahifasini konteyner kengligiga moslashtirish uchun masshtab —
 * gorizontal aylanish bo'lmasligi shart bo'lgani uchun natija konteyner
 * kengligidan oshib ketmaydi (max bilan yuqoridan ham cheklanadi, juda tor
 * ekranlarda mikroskopik matn chizilib qolmasligi uchun min bilan pastdan).
 */
export function computePageScale(containerWidth: number, intrinsicPageWidth: number, bounds: ScaleBounds = {}): number {
  const { min = 0.4, max = 3 } = bounds;
  if (containerWidth <= 0 || intrinsicPageWidth <= 0) return min;
  const scale = containerWidth / intrinsicPageWidth;
  return Math.min(max, Math.max(min, scale));
}
