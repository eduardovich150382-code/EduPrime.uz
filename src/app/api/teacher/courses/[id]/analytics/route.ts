import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireTeacher } from '@/lib/api-auth';

// GET /api/teacher/courses/[id]/analytics — dars darajasidagi tahlil:
// har bir darsni necha foiz yozilgan talaba tugatgani va talabalar
// asosan qaysi darsda kursni tashlab ketishayotgani (drop-off nuqtasi).
// LessonProgress + CourseEnrollment'dan on-the-fly agregatsiya qiladi —
// alohida statistika jadvali kerak emas (test analytics bilan bir xil yondashuv).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireTeacher();
    if (error) return error;

    const { id } = await params;

    const course = await db.course.findUnique({
      where: { id },
      include: {
        teacher: true,
        sections: {
          orderBy: { order: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    if ((user.role as string) !== 'ADMIN' && course.teacher.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const lessons = course.sections.flatMap((s) =>
      s.lessons.map((l) => ({ ...l, sectionTitleUz: s.titleUz }))
    );
    const lessonIds = lessons.map((l) => l.id);

    const [enrollments, progressRows] = await Promise.all([
      db.courseEnrollment.findMany({ where: { courseId: id }, select: { userId: true, completedAt: true } }),
      db.lessonProgress.findMany({
        where: { lessonId: { in: lessonIds }, completed: true },
        select: { lessonId: true, userId: true },
      }),
    ]);

    const totalEnrollments = enrollments.length;
    const courseCompletedCount = enrollments.filter((e) => e.completedAt).length;
    const avgCourseCompletionPct = totalEnrollments > 0
      ? Math.round((courseCompletedCount / totalEnrollments) * 100)
      : 0;

    const completedByLesson = new Map<string, number>();
    for (const l of lessonIds) completedByLesson.set(l, 0);
    for (const p of progressRows) {
      completedByLesson.set(p.lessonId, (completedByLesson.get(p.lessonId) || 0) + 1);
    }

    let prevCompleted = totalEnrollments;
    let maxDrop = 0;
    let dropOffIndex = -1;
    const lessonStats: {
      lessonId: string; titleUz: string; sectionTitleUz: string; type: string;
      order: number; completedCount: number; completionRate: number | null;
    }[] = [];

    for (let index = 0; index < lessons.length; index++) {
      const l = lessons[index];
      const completedCount = completedByLesson.get(l.id) || 0;
      const completionRate = totalEnrollments > 0 ? Math.round((completedCount / totalEnrollments) * 100) : null;
      const drop = totalEnrollments > 0 ? Math.max(0, prevCompleted - completedCount) : 0;
      if (totalEnrollments > 0 && drop > maxDrop) {
        maxDrop = drop;
        dropOffIndex = index;
      }
      prevCompleted = completedCount;
      lessonStats.push({
        lessonId: l.id,
        titleUz: l.titleUz,
        sectionTitleUz: l.sectionTitleUz,
        type: l.type,
        order: index,
        completedCount,
        completionRate,
      });
    }

    const dropOff = dropOffIndex >= 0
      ? { lessonId: lessons[dropOffIndex].id, titleUz: lessons[dropOffIndex].titleUz, order: dropOffIndex, drop: maxDrop }
      : null;

    return NextResponse.json({
      totalEnrollments,
      avgCourseCompletionPct,
      dropOff,
      lessons: lessonStats,
    });
  } catch (error) {
    console.error('GET /api/teacher/courses/[id]/analytics error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
