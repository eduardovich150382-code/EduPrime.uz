import type { AIImportResult } from '@/types';

/**
 * `AiImportPanel` natijani qanday ko'rsatishini hal qiladi.
 *
 * Komponentdan ALOHIDA sof funksiya: Vitest `node` muhitida ishlaydi va
 * komponentni render qilmaydi, "yashil xabar qachon chiqadi" qarori esa
 * aynan test bilan qo'riqlanishi kerak — avval 0 savol + kvota xatosi ham
 * "✅ import qilindi" deb ko'rsatilgan.
 */
export type AiImportStatus = 'success' | 'quota' | 'failed';

export function getAiImportStatus(result: AIImportResult): AiImportStatus {
  // Muvaffaqiyat — faqat haqiqatan savol kelganda. `totalFound` ga
  // qaralmaydi: AI uni savollardan mustaqil to'ldiradi va noto'g'ri bo'lishi mumkin.
  if ((result.questions?.length ?? 0) > 0) return 'success';
  if (result.errorCode === 'AI_QUOTA_EXHAUSTED') return 'quota';
  return 'failed';
}
