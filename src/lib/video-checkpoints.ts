/**
 * Video nazorat nuqtalari (S23) — VIDEO turi dars (`CourseLesson.checkpoints`)
 * va VIDEO_SOLUTION bloki (`LessonBlock.checkpoints`) IKKALASI HAM aynan shu
 * shakl va tekshiruvni ishlatadi. Ikki modelda ikkita alohida validatsiya
 * yozilmasin deb shu yerga chiqarilgan — `PUT /api/teacher/courses/[id]/curriculum`,
 * `lib/lesson-access.ts` (o'quvchi tomoni) va o'qituvchi tahrirlagichi
 * (`VideoCheckpointsEditor`) barchasi shu funksiyani chaqiradi.
 */
export interface Checkpoint {
  /** Video shu soniyaga yetganda (oldinga harakatda) savol chiqadi. */
  atSeconds: number;
  /** Item.id — FK EMAS, LessonBlock.itemIds bilan bir xil naqsh (item o'chirilsa nuqta jim o'tkazib yuboriladi). */
  itemId: string;
}

export const MAX_CHECKPOINTS = 20;

/**
 * `value`ni (DB'dagi Json ustun yoki so'rov tanasi) checkpoints massivi
 * sifatida tekshiradi va vaqt bo'yicha tartiblab qaytaradi. Noto'g'ri shakl —
 * `null` (chaqiruvchi buni rad etish sifatida talqin qiladi). `null`/`undefined`
 * (hali hech narsa saqlanmagan) — bo'sh massiv, xato emas.
 *
 * Tekshiriladi: massiv, ko'pi bilan `MAX_CHECKPOINTS` ta, har element
 * `{ atSeconds: manfiy bo'lmagan son, itemId: bo'sh bo'lmagan satr }`, bitta
 * vaqtga ikkita nuqta qo'yilmagan (o'qituvchi tahrirlagichidagi talab).
 */
export function parseCheckpoints(value: unknown): Checkpoint[] | null {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) return null;
  if (value.length > MAX_CHECKPOINTS) return null;

  const seenSeconds = new Set<number>();
  const result: Checkpoint[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') return null;
    const atSeconds = (raw as Record<string, unknown>).atSeconds;
    const itemId = (raw as Record<string, unknown>).itemId;
    if (typeof atSeconds !== 'number' || !Number.isFinite(atSeconds) || atSeconds < 0) return null;
    if (typeof itemId !== 'string' || !itemId) return null;
    if (seenSeconds.has(atSeconds)) return null;
    seenSeconds.add(atSeconds);
    result.push({ atSeconds, itemId });
  }
  return result.sort((a, b) => a.atSeconds - b.atSeconds);
}

/**
 * Saqlash uchun — bo'sh massiv `null`ga aylantiriladi (boshqa ixtiyoriy
 * ustunlar bilan bir xil konvensiya, qarang `labelUz: b.labelUz || null`).
 * Chaqiruvchi `value` allaqachon `parseCheckpoints` bilan tasdiqlangan deb
 * hisoblaydi (bu yerda qayta tekshirilmaydi — sof shakl almashtirish).
 */
export function checkpointsToStorage(checkpoints: Checkpoint[]): Checkpoint[] | null {
  return checkpoints.length > 0 ? checkpoints : null;
}
