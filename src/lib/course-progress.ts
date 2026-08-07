import { db } from './db';
import { computeLockedLessonIds } from './course-lock';

/**
 * QUIZ turidagi kurs darsiga bog'langan test yechilgach chaqiriladi
 * (POST /api/tests/[id]/submit'dan). Agar dars qulflanmagan bo'lsa (yoki
 * kursda sequentialUnlock o'chiq bo'lsa) — LessonProgress'ni yangilaydi:
 * eng yaxshi ball saqlanadi, minPassPercent talab qilinsa shunga
 * yetgandagina "tugatilgan" deb belgilanadi. Kerak bo'lsa butun kursni
 * ham "tugatildi" deb belgilaydi (mavjud /api/lessons/[id]/progress
 * bilan bir xil naqsh).
 */
export async function creditQuizLessonProgress(userId: string, lessonId: string, percentage: number): Promise<void> {
  const lesson = await db.courseLesson.findUnique({
    where: { id: lessonId },
    select: { id: true, type: true, minPassPercent: true, section: { select: { courseId: true } } },
  });
  if (!lesson || lesson.type !== 'QUIZ') return;

  const courseId = lesson.section.courseId;
  const enrollment = await db.courseEnrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment) return;

  const course = await db.course.findUnique({ where: { id: courseId }, select: { sequentialUnlock: true } });
  const allLessonsOrdered = await db.courseLesson.findMany({
    where: { section: { courseId } },
    orderBy: [{ section: { order: 'asc' } }, { order: 'asc' }],
    select: { id: true, type: true, minPassPercent: true },
  });
  const progressRows = await db.lessonProgress.findMany({
    where: { userId, lessonId: { in: allLessonsOrdered.map((l) => l.id) } },
  });

  if (course?.sequentialUnlock) {
    const lockedIds = computeLockedLessonIds(
      allLessonsOrdered,
      new Map(progressRows.map((p) => [p.lessonId, { completed: p.completed, bestScorePercent: p.bestScorePercent }])),
      true
    );
    // Talaba qulflangan darsning testiga havolani to'g'ridan-to'g'ri
    // (masalan eski/ulashilgan link orqali) topib yechgan bo'lishi mumkin —
    // bunday holda kredit berilmaydi, chunki oldingi darslar hali
    // "o'tilmagan".
    if (lockedIds.has(lessonId)) return;
  }

  const existing = progressRows.find((p) => p.lessonId === lessonId);
  const bestScorePercent = Math.max(existing?.bestScorePercent ?? 0, percentage);
  const passed = lesson.minPassPercent == null || percentage >= lesson.minPassPercent;
  const completed = existing?.completed || passed;

  await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: {
      bestScorePercent,
      ...(completed ? { completed: true, completedAt: existing?.completedAt ?? new Date() } : {}),
    },
    create: {
      userId,
      lessonId,
      completed,
      bestScorePercent,
      completedAt: completed ? new Date() : null,
    },
  });

  if (completed && !enrollment.completedAt) {
    const doneCount = await db.lessonProgress.count({
      where: { userId, lessonId: { in: allLessonsOrdered.map((l) => l.id) }, completed: true },
    });
    if (doneCount >= allLessonsOrdered.length) {
      await db.courseEnrollment.update({ where: { id: enrollment.id }, data: { completedAt: new Date() } });
    }
  }
}
