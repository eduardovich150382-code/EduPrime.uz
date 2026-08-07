/**
 * Kurs darslarini ketma-ket ochish (tomchilab ochish) uchun umumiy
 * yordamchi funksiya. Course.sequentialUnlock yoqilgan bo'lsa, dars faqat
 * undan oldingi barcha darslar "o'tilgan" bo'lgandagina ochiladi:
 * - VIDEO/TEXT/PDF dars: LessonProgress.completed = true (talaba o'zi
 *   "Tugatdim" tugmasi bilan belgilaydi — qat'iy nazoratsiz)
 * - QUIZ dars: LessonProgress.completed = true VA (agar minPassPercent
 *   qo'yilgan bo'lsa) bestScorePercent >= minPassPercent
 *
 * Bitta darsning holati boshqa barcha keyingi darslarni ham qulflaydi —
 * hatto ular DB'da avvaldan "completed" deb belgilangan bo'lsa ham
 * (masalan sequentialUnlock keyinroq yoqilgan bo'lsa).
 */

export interface LockableLesson {
  id: string;
  type: string;
  minPassPercent: number | null;
}

export interface LessonProgressState {
  completed: boolean;
  bestScorePercent: number | null;
}

export function isLessonSatisfied(lesson: LockableLesson, progress: LessonProgressState | undefined): boolean {
  if (!progress?.completed) return false;
  if (lesson.type === 'QUIZ' && lesson.minPassPercent != null) {
    return (progress.bestScorePercent ?? 0) >= lesson.minPassPercent;
  }
  return true;
}

// lessons — kurs bo'ylab GLOBAL ketma-ket tartibda (bo'limlar tartibi, so'ng
// har bo'lim ichidagi darslar tartibi) berilishi shart.
export function computeLockedLessonIds(
  lessons: LockableLesson[],
  progressByLessonId: Map<string, LessonProgressState>,
  sequentialUnlock: boolean
): Set<string> {
  const locked = new Set<string>();
  if (!sequentialUnlock) return locked;

  let allPriorSatisfied = true;
  for (const lesson of lessons) {
    if (!allPriorSatisfied) locked.add(lesson.id);
    const satisfied = isLessonSatisfied(lesson, progressByLessonId.get(lesson.id));
    allPriorSatisfied = allPriorSatisfied && satisfied;
  }
  return locked;
}
