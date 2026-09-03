/**
 * PRACTICE bloki (S22b) uchun kirish tekshiruvi — "shu foydalanuvchi shu
 * darsning shu blokini ko'ra oladimi" degan savolga GET /api/courses/[id]/learn
 * bilan BIR XIL qoida bo'yicha javob beradi: kursga yozilgan (yoki
 * egasi/ADMIN — preview) bo'lishi va dars sequentialUnlock bo'yicha
 * qulflanmagan bo'lishi kerak.
 *
 * `lib/course-lock.ts`ning o'zi TEGILMAYDI (CLAUDE.md) — bu yerda faqat
 * uning sof `computeLockedLessonIds` funksiyasi chaqiriladi, xuddi
 * `GET /api/courses/[id]/learn` qilgani kabi. Ikkita marshrut (practice
 * start va check) bir xil DB so'rovlarini takrorlamasin deb shu yerga
 * chiqarilgan.
 */
import { db } from './db';
import { computeLockedLessonIds } from './course-lock';

export interface PracticeBlockAccess {
  id: string;
  labelUz: string | null;
  itemIds: string[];
}

export type PracticeAccessResult =
  | { ok: true; block: PracticeBlockAccess }
  | { ok: false; status: number; error: string };

export async function loadPracticeBlockAccess(
  blockId: string,
  userId: string,
  role: string
): Promise<PracticeAccessResult> {
  const block = await db.lessonBlock.findUnique({
    where: { id: blockId },
    select: {
      id: true,
      type: true,
      labelUz: true,
      itemIds: true,
      lesson: {
        select: {
          id: true,
          section: {
            select: {
              course: {
                select: {
                  id: true,
                  teacherId: true,
                  sequentialUnlock: true,
                  teacher: { select: { userId: true } },
                  sections: {
                    orderBy: { order: 'asc' },
                    select: {
                      lessons: {
                        orderBy: { order: 'asc' },
                        select: { id: true, type: true, minPassPercent: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!block || block.type !== 'PRACTICE') {
    return { ok: false, status: 404, error: 'Blok topilmadi' };
  }

  const course = block.lesson.section.course;
  const enrollment = await db.courseEnrollment.findUnique({
    where: { userId_courseId: { userId, courseId: course.id } },
  });

  const isOwnerOrAdmin = role === 'ADMIN' || course.teacher.userId === userId;
  if (!enrollment && !isOwnerOrAdmin) {
    return { ok: false, status: 403, error: 'Siz bu kursga yozilmagansiz' };
  }

  // Preview (yozilmagan egasi/admin) — hech narsa qulflanmaydi, GET
  // /api/courses/[id]/learn'dagi bilan bir xil qoida.
  if (enrollment) {
    const allLessons = course.sections.flatMap((s) => s.lessons);
    const progressRows = await db.lessonProgress.findMany({
      where: { userId, lessonId: { in: allLessons.map((l) => l.id) } },
      select: { lessonId: true, completed: true, bestScorePercent: true },
    });
    const lockedLessonIds = computeLockedLessonIds(
      allLessons,
      new Map(progressRows.map((p) => [p.lessonId, { completed: p.completed, bestScorePercent: p.bestScorePercent }])),
      course.sequentialUnlock
    );
    if (lockedLessonIds.has(block.lesson.id)) {
      return { ok: false, status: 403, error: 'Bu dars hali qulflangan' };
    }
  }

  return { ok: true, block: { id: block.id, labelUz: block.labelUz, itemIds: block.itemIds } };
}
