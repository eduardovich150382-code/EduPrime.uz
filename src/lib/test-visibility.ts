import type { Prisma } from '@prisma/client';
import { db } from './db';

/**
 * Nashr etilmagan (qoralama yoki nusxa) testni kim ko'ra oladi. Bu paywall
 * emas — `lib/access.ts` dan OLDIN ishlaydi: qoralama bepul bo'lsa ham, id ni
 * bilgan begona uni yecha olmasligi kerak.
 *
 * Kurs istisnosi: ustoz nashr etilgan kursning QUIZ darsi yoki bloki uchun
 * testni ataylab nashrsiz qoldirishi mumkin (umumiy ro'yxatda chiqmasin
 * deb). Bu holat yopilsa kurs testlari talabalarda jimgina 404 berardi.
 * Dars va blokda o'z nashr belgisi yo'q, shuning uchun mezon — `Course.isPublished`.
 *
 * GET /api/tests/[id], POST submit, preview va check-access bitta shu
 * funksiyadan foydalanadi — biri boshqacha qaror qilsa, savollar yopiq, lekin
 * baholash (to'g'ri javoblar bilan) ochiq qolib ketishi mumkin.
 */
export interface TestVisibilityInfo {
  isPublished: boolean;
  // `teacher.userId` (ustoz testi) va `Test.userId` (eski generatsiya qilingan test)
  ownerUserIds: (string | null | undefined)[];
}

export interface TestViewer {
  userId?: string | null;
  role?: string | null;
}

export function canViewTest(
  test: TestVisibilityInfo,
  viewer: TestViewer,
  linkedToPublishedCourse: boolean
): boolean {
  if (test.isPublished) return true;
  if (viewer.role === 'ADMIN') return true;
  if (viewer.userId && test.ownerUserIds.some((owner) => owner === viewer.userId)) return true;
  return linkedToPublishedCourse;
}

/** Kurs bog'lanishi so'rovi kerak bo'lmasa (nashr etilgan / ega / ADMIN) — bazaga murojaat yo'q. */
export function needsCourseLinkCheck(test: TestVisibilityInfo, viewer: TestViewer): boolean {
  return !canViewTest(test, viewer, false);
}

export async function isLinkedToPublishedCourse(testId: string): Promise<boolean> {
  const lessonWhere: Prisma.CourseLessonWhereInput = {
    testId,
    section: { course: { isPublished: true } },
  };
  const blockWhere: Prisma.LessonBlockWhereInput = {
    testId,
    lesson: { section: { course: { isPublished: true } } },
  };
  const [lessons, blocks] = await Promise.all([
    db.courseLesson.count({ where: lessonWhere }),
    db.lessonBlock.count({ where: blockWhere }),
  ]);
  return lessons > 0 || blocks > 0;
}

/** Route'lar uchun: sof qaror + kerak bo'lsagina kurs bog'lanishi so'rovi. */
export async function resolveTestVisibility(
  test: TestVisibilityInfo & { id: string },
  viewer: TestViewer
): Promise<boolean> {
  if (!needsCourseLinkCheck(test, viewer)) return true;
  return canViewTest(test, viewer, await isLinkedToPublishedCourse(test.id));
}
