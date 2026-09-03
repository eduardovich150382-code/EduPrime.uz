import { describe, it, expect, vi } from 'vitest';
import { PdfPageRenderQueue, type PageRenderTask } from '../pdf-page-render-queue';

function makeTask(): { task: PageRenderTask; resolve: () => void; reject: (error: unknown) => void; cancel: ReturnType<typeof vi.fn> } {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
  const cancel = vi.fn();
  return { task: { promise, cancel }, resolve, reject, cancel };
}

describe('PdfPageRenderQueue', () => {
  it('sahifa ko\'rinishga kirganda render navbatiga qo\'shiladi', () => {
    const { task } = makeTask();
    const renderPage = vi.fn().mockReturnValue(task);
    const queue = new PdfPageRenderQueue({ renderPage });
    queue.setContainerWidth(360);

    queue.onPageVisible(1);

    expect(renderPage).toHaveBeenCalledTimes(1);
    expect(renderPage).toHaveBeenCalledWith(1);
    expect(queue.getStatus(1)).toBe('rendering');
  });

  it('render tugagach holat done bo\'ladi', async () => {
    const { task, resolve } = makeTask();
    const renderPage = vi.fn().mockReturnValue(task);
    const queue = new PdfPageRenderQueue({ renderPage });
    queue.setContainerWidth(360);

    queue.onPageVisible(1);
    resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(queue.getStatus(1)).toBe('done');
  });

  it('bitta sahifa ikki marta render navbatiga tushmaydi', () => {
    const { task } = makeTask();
    const renderPage = vi.fn().mockReturnValue(task);
    const queue = new PdfPageRenderQueue({ renderPage });
    queue.setContainerWidth(360);

    queue.onPageVisible(1);
    queue.onPageVisible(1); // hali "rendering" — qayta chaqirilmasligi kerak
    queue.onPageVisible(1);

    expect(renderPage).toHaveBeenCalledTimes(1);
  });

  it('render tugagan (done) sahifa qayta ko\'rinishga kirsa qayta so\'ralmaydi', async () => {
    const { task, resolve } = makeTask();
    const renderPage = vi.fn().mockReturnValue(task);
    const queue = new PdfPageRenderQueue({ renderPage });
    queue.setContainerWidth(360);

    queue.onPageVisible(1);
    resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(queue.getStatus(1)).toBe('done');

    queue.onPageVisible(1);
    expect(renderPage).toHaveBeenCalledTimes(1); // done holatda qayta so'ralmadi
  });

  it('bekor qilingan render (RenderingCancelledException) xato deb hisoblanmaydi', async () => {
    const { task, reject } = makeTask();
    const renderPage = vi.fn().mockReturnValue(task);
    const log = vi.fn();
    const queue = new PdfPageRenderQueue({ renderPage, log });
    queue.setContainerWidth(360);

    queue.onPageVisible(1);
    const cancelledError = Object.assign(new Error('Rendering cancelled'), { name: 'RenderingCancelledException' });
    reject(cancelledError);
    await Promise.resolve();
    await Promise.resolve();

    expect(queue.getStatus(1)).toBe('pending'); // 'error' holati yo'q — qayta ko'rinsa qayta uriniladi
    expect(log).toHaveBeenCalledWith('cancelled', 1);
    expect(log).not.toHaveBeenCalledWith('failed', 1, expect.anything());
  });

  it('onPageHidden — faol vazifani bekor qiladi va holatni pending qiladi', () => {
    const { task, cancel } = makeTask();
    const renderPage = vi.fn().mockReturnValue(task);
    const queue = new PdfPageRenderQueue({ renderPage });
    queue.setContainerWidth(360);

    queue.onPageVisible(1);
    expect(queue.getStatus(1)).toBe('rendering');

    queue.onPageHidden(1);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(queue.getStatus(1)).toBe('pending');
  });

  it('onPageHidden dan keyin sahifa qayta ko\'rinishga kirsa qaytadan navbatga qo\'yiladi', () => {
    const first = makeTask();
    const second = makeTask();
    const renderPage = vi.fn().mockReturnValueOnce(first.task).mockReturnValueOnce(second.task);
    const queue = new PdfPageRenderQueue({ renderPage });
    queue.setContainerWidth(360);

    queue.onPageVisible(1);
    queue.onPageHidden(1);
    queue.onPageVisible(1);

    expect(renderPage).toHaveBeenCalledTimes(2);
    expect(queue.getStatus(1)).toBe('rendering');
  });

  it('kenglik 0 bo\'lganda render boshlanmaydi', () => {
    const { task } = makeTask();
    const renderPage = vi.fn().mockReturnValue(task);
    const queue = new PdfPageRenderQueue({ renderPage }); // setContainerWidth chaqirilmagan — 0

    queue.onPageVisible(1);

    expect(renderPage).not.toHaveBeenCalled();
    expect(queue.getStatus(1)).toBe('pending');
  });

  it('haqiqiy (bekor qilinmagan) xato ham pending holatiga qaytaradi va failed sifatida log qilinadi', async () => {
    const { task, reject } = makeTask();
    const renderPage = vi.fn().mockReturnValue(task);
    const log = vi.fn();
    const queue = new PdfPageRenderQueue({ renderPage, log });
    queue.setContainerWidth(360);

    queue.onPageVisible(1);
    const realError = new Error('PDF sahifasi buzilgan');
    reject(realError);
    await Promise.resolve();
    await Promise.resolve();

    expect(queue.getStatus(1)).toBe('pending');
    expect(log).toHaveBeenCalledWith('failed', 1, realError);
  });

  it('cancelAll() barcha faol vazifalarni bekor qiladi', () => {
    const a = makeTask();
    const b = makeTask();
    const renderPage = vi.fn().mockReturnValueOnce(a.task).mockReturnValueOnce(b.task);
    const queue = new PdfPageRenderQueue({ renderPage });
    queue.setContainerWidth(360);

    queue.onPageVisible(1);
    queue.onPageVisible(2);
    queue.cancelAll();

    expect(a.cancel).toHaveBeenCalledTimes(1);
    expect(b.cancel).toHaveBeenCalledTimes(1);
  });

  it('subscribe() holat o\'zgarganda chaqiriladi', async () => {
    const { task, resolve } = makeTask();
    const renderPage = vi.fn().mockReturnValue(task);
    const queue = new PdfPageRenderQueue({ renderPage });
    queue.setContainerWidth(360);
    const listener = vi.fn();
    queue.subscribe(listener);

    queue.onPageVisible(1);
    expect(listener).toHaveBeenCalledTimes(1); // pending -> rendering

    resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(2); // rendering -> done
  });
});
