/**
 * Bitta navbat — ustma-ust tushgan saqlashlarni ketma-ketlashtiradi.
 *
 * Nega kerak: test yaratish sahifasida avtosaqlash (30s interval) va qo'lda
 * "Saqlash" tugmasi bir vaqtda `PUT .../questions` ga ketishi mumkin edi. Har
 * bir so'rov o'z tranzaksiyasida avval mavjud savollarni o'qiydi; ikkinchisi
 * birinchisining commit qilinmagan yozuvini ko'rmagani uchun ikkalasi ham
 * hammasini qaytadan yaratardi — 31 savol 62 ga aylanardi.
 *
 * `busy` bilan avtosaqlash ish ketayotganda o'zini o'tkazib yuboradi (30
 * soniyadan keyin qaytadan urinadi), qo'lda saqlash esa navbatga turib
 * ketayotgan avtosaqlash tugashini kutadi — ustozning aniq harakati hech
 * qachon jimgina tashlab yuborilmasin.
 */
export interface SaveQueue {
  /** Navbatga qo'shadi va o'z navbati kelganda bajaradi. */
  enqueue<T>(task: () => Promise<T>): Promise<T>;
  /** Navbatda yoki bajarilayotgan ish bormi. */
  readonly busy: boolean;
  /** Bundan keyin yangi ish qabul qilinmaydi (sahifa yopilayotganda). */
  close(): void;
  readonly closed: boolean;
}

/** `close()` dan keyin `enqueue` qilinganda qaytariladigan xato. */
export class SaveQueueClosedError extends Error {
  constructor() {
    super('Save queue closed');
    this.name = 'SaveQueueClosedError';
  }
}

export function createSaveQueue(): SaveQueue {
  let tail: Promise<unknown> = Promise.resolve();
  let pending = 0;
  let closed = false;

  return {
    get busy() {
      return pending > 0;
    },
    get closed() {
      return closed;
    },
    close() {
      closed = true;
    },
    enqueue<T>(task: () => Promise<T>): Promise<T> {
      if (closed) return Promise.reject(new SaveQueueClosedError());
      pending++;
      // Zanjir `catch` bilan davom etadi: bitta saqlash yiqilsa (masalan tarmoq
      // uzilsa) keyingi navbatdagi ish baribir ishga tushsin.
      const run = tail.then(() => task());
      tail = run.catch(() => {});
      // Xato chaqiruvchiga uzatiladi — qo'lda saqlash ustozga xabar ko'rsatadi.
      return run.finally(() => {
        pending--;
      });
    },
  };
}
