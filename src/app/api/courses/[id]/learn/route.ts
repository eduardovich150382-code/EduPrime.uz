import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

// GET /api/courses/[id]/learn — kursni to'liq iste'mol qilish uchun kerak
// bo'lgan hamma narsa: barcha dars kontenti (video/matn/test) + shu
// foydalanuvchining har bir dars bo'yicha progressi. Faqat kursga
// YOZILGAN foydalanuvchiga ochiladi — bu ruxsat tekshiruvining o'zi
// (checkCourseAccess emas, chunki bu yerda "kirish huquqi bormi" emas,
// "allaqachon yozilganmi" muhim).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const course = await db.course.findUnique({
      where: { id },
      include: {
        subject: { select: { nameUz: true, icon: true } },
        teacher: { include: { user: { select: { name: true } } } },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: { test: { select: { id: true, titleUz: true, questionCount: true, duration: true } } },
            },
          },
        },
      },
    });

    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

    const enrollment = await db.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: id } },
    });
    if (!enrollment) {
      return NextResponse.json({ error: "Siz bu kursga yozilmagansiz" }, { status: 403 });
    }

    const allLessonIds = course.sections.flatMap((s) => s.lessons.map((l) => l.id));
    const progressRows = await db.lessonProgress.findMany({
      where: { userId: user.id, lessonId: { in: allLessonIds } },
    });
    const progressMap = new Map(progressRows.map((p) => [p.lessonId, p]));

    const sections = course.sections.map((s) => ({
      id: s.id,
      titleUz: s.titleUz,
      lessons: s.lessons.map((l) => {
        const p = progressMap.get(l.id);
        return {
          id: l.id,
          titleUz: l.titleUz,
          type: l.type,
          durationMinutes: l.durationMinutes,
          videoUrl: l.videoUrl,
          content: l.content,
          test: l.test,
          completed: p?.completed || false,
          lastPositionSeconds: p?.lastPositionSeconds || 0,
        };
      }),
    }));

    const totalLessons = allLessonIds.length;
    const completedLessons = progressRows.filter((p) => p.completed).length;

    return NextResponse.json({
      course: {
        id: course.id,
        titleUz: course.titleUz,
        subject: course.subject,
        teacherName: course.teacher.user.name,
        sections,
        totalLessons,
        completedLessons,
        isCompleted: !!enrollment.completedAt,
      },
    });
  } catch (error) {
    console.error('GET /api/courses/[id]/learn error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
