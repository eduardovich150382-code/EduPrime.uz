// Sahifa-darajasidagi render navbati — pdf.js va canvas'dan mustaqil, sof TS.
// Haqiqiy chizish (`renderPage`) chaqiruvchi tomonidan in'ektsiya qilinadi,
// shuning uchun "sahifa ko'rinishga kirdi" / "yashirindi" hodisalariga javoban
// navbatga qo'yish, takroriy so'rovlarni cheklash va bekor qilingan render'ni
// xato deb hisoblamaslik mantig'i pdf.js'siz, node muhitida to'liq test
// qilinadi (`PdfCanvasViewer` faqat haqiqiy `renderPage`'ni ulaydi).

export type PageRenderStatus = 'pending' | 'rendering' | 'done';

export interface PageRenderTask {
  promise: Promise<void>;
  cancel: () => void;
}

export type PdfPageLogEvent =
  | 'queued' | 'skipped-duplicate' | 'skipped-zero-width' | 'cancelled' | 'done' | 'failed';

export interface PdfPageRenderQueueOptions {
  renderPage: (pageNumber: number) => PageRenderTask;
  /** Diagnostika uchun — component'da `console.debug('[pdf] ...')`ga ulanadi, testlarda shart emas. */
  log?: (event: PdfPageLogEvent, pageNumber: number, extra?: unknown) => void;
}

function isRenderCancelledError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'RenderingCancelledException';
}

/**
 * Har bir sahifa uchun render holatini kuzatadi: `pending` (hali chizilmagan
 * yoki ko'rinishdan chiqib qayta boshlanishga tayyor) -> `rendering` (faol
 * `RenderTask` bor) -> `done`. Sahifa ko'rinishdan chiqsa (`onPageHidden`)
 * faol vazifa `cancel()` qilinadi va holat yana `pending`ga tushadi — canvas
 * yo'q qilinganda (komponent tomonidan) keyingi safar qayta chizilishi
 * uchun. Bekor qilingan render (`RenderingCancelledException`) — kutilgan
 * holat, xato emas.
 */
export class PdfPageRenderQueue {
  private statuses = new Map<number, PageRenderStatus>();
  private tasks = new Map<number, PageRenderTask>();
  private containerWidth = 0;
  private version = 0;
  private listeners = new Set<() => void>();
  private readonly renderPage: PdfPageRenderQueueOptions['renderPage'];
  private readonly log: NonNullable<PdfPageRenderQueueOptions['log']>;

  constructor(options: PdfPageRenderQueueOptions) {
    this.renderPage = options.renderPage;
    this.log = options.log ?? (() => {});
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getVersion = (): number => this.version;

  private bump() {
    this.version += 1;
    this.listeners.forEach((listener) => listener());
  }

  private setStatus(pageNumber: number, status: PageRenderStatus) {
    if (this.statuses.get(pageNumber) === status) return;
    this.statuses.set(pageNumber, status);
    this.bump();
  }

  getStatus(pageNumber: number): PageRenderStatus {
    return this.statuses.get(pageNumber) ?? 'pending';
  }

  setContainerWidth(width: number): void {
    this.containerWidth = width;
  }

  /** IntersectionObserver sahifa ko'rinishga kirganini xabar qilganda chaqiriladi. */
  onPageVisible(pageNumber: number): void {
    if (this.containerWidth <= 0) {
      this.log('skipped-zero-width', pageNumber);
      return; // haqiqiy kenglik hali noma'lum — ResizeObserver kutilyapti
    }
    const status = this.getStatus(pageNumber);
    if (status === 'rendering' || status === 'done') {
      this.log('skipped-duplicate', pageNumber, status);
      return; // bitta sahifa ikki marta navbatga qo'yilmaydi
    }

    this.setStatus(pageNumber, 'rendering');
    this.log('queued', pageNumber);
    const task = this.renderPage(pageNumber);
    this.tasks.set(pageNumber, task);
    task.promise.then(
      () => {
        if (this.tasks.get(pageNumber) !== task) return; // bu vazifa allaqachon almashtirilgan/bekor qilingan
        this.tasks.delete(pageNumber);
        this.log('done', pageNumber);
        this.setStatus(pageNumber, 'done');
      },
      (error: unknown) => {
        if (this.tasks.get(pageNumber) !== task) return;
        this.tasks.delete(pageNumber);
        if (isRenderCancelledError(error)) {
          this.log('cancelled', pageNumber); // kutilgan holat — xato emas
        } else {
          this.log('failed', pageNumber, error); // haqiqiy xato — jimgina yo'qolmasin deb log qilinadi
        }
        // Ikkala holatda ham `pending`ga qaytadi: sahifa qayta ko'rinishga
        // kirsa qayta uriniladi (bekor qilingan bo'lsa — kutilgan qayta urinish;
        // haqiqiy xato bo'lsa ham keyingi urinishga imkon beriladi).
        this.setStatus(pageNumber, 'pending');
      },
    );
  }

  /** Sahifa ko'rinishdan chiqqanda (yoki komponent uni olib tashlaganda) chaqiriladi. */
  onPageHidden(pageNumber: number): void {
    const task = this.tasks.get(pageNumber);
    if (task) {
      this.tasks.delete(pageNumber);
      task.cancel();
    }
    this.setStatus(pageNumber, 'pending');
  }

  /** Komponent butunlay yopilganda — barcha faol renderlarni bekor qiladi. */
  cancelAll(): void {
    this.tasks.forEach((task) => task.cancel());
    this.tasks.clear();
  }
}
