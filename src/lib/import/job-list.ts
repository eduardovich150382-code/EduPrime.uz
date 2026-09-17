export interface JobItem {
  id: string;
  fileName: string;
  createdAt: string;
  drafts: number;
}

/**
 * Yangilangan importlar ro'yxatiga tanlangan importni saqlab qolish.
 *
 * API faqat oxirgi 20 tasini qaytaradi: ustoz boshqa vkladkada yangi importlar
 * yaratsa, tanlangani ro'yxatdan siqib chiqishi mumkin. Unda `<select>` qiymati
 * optionsiz qolib, xarita ko'rinib turgan holda "Importni tanlang" deb ko'rsatardi.
 */
export function mergeJobs(prev: JobItem[] | null, next: JobItem[], selectedId: string): JobItem[] {
  if (!selectedId || next.some((job) => job.id === selectedId)) return next;
  const kept = prev?.find((job) => job.id === selectedId);
  return kept ? [...next, kept] : next;
}
