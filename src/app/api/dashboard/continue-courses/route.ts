import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET /api/dashboard/continue-courses — talaba yozilgan, hali tugatmagan
// va kamida bitta darsni boshlagan (LessonProgress bor) kurslar, so'ngi
// faollik bo'yicha tartiblangan. Dashboard'dagi "Davom ettirish" kartasi
// uchun. Havola /courses/[id]/learn'ga to'g'ridan-to'g'ri boradi — o'sha
// sahifaning o'zi birinchi tugallanmagan darsni avtomatik tanlaydi, shu
// sababli bu yerda alohida "oxirgi dars" saqlash shart emas.
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id as string;

    const enrollments = await db.courseEnrollment.findMany({
      where: { userId, completedAt: null },
      select: {
        courseId: true,
        course: {
          select: {
            id: true,
            titleUz: true,
            coverImage: true,
            subject: { select: { nameUz: true, icon: true } },
            sections: { select: { lessons: { select: { id: true } } } },
          },
        },
      },
    });

    if (enrollments.length === 0) {
      return NextResponse.json({ courses: [] });
    }

    const lessonIdsByCourse = new Map(
      enrollments.map((e) => [e.courseId, e.course.sections.flatMap((s) => s.lessons.map((l) => l.id))])
    );
    const allLessonIds = Array.from(lessonIdsByCourse.values()).flat();

    const progressRows = await db.lessonProgress.findMany({
      where: { userId, lessonId: { in: allLessonIds } },
      select: { lessonId: true, completed: true, updatedAt: true },
    });

    // lessonId -> courseId teskari xarita (progress qatorlarini kursga bog'lash uchun)
    const courseIdByLessonId = new Map<string, string>();
    for (const [courseId, lessonIds] of lessonIdsByCourse) {
      for (const lid of lessonIds) courseIdByLessonId.set(lid, courseId);
    }

    const activityByCourse = new Map<string, { completed: number; lastActivityAt: Date }>();
    for (const p of progressRows) {
      const courseId = courseIdByLessonId.get(p.lessonId);
      if (!courseId) continue;
      const entry = activityByCourse.get(courseId) || { completed: 0, lastActivityAt: p.updatedAt };
      if (p.completed) entry.completed++;
      if (p.updatedAt > entry.lastActivityAt) entry.lastActivityAt = p.updatedAt;
      activityByCourse.set(courseId, entry);
    }

    const courses = enrollments
      .map((e) => {
        const activity = activityByCourse.get(e.courseId);
        if (!activity) return null; // hali birorta darsga qo'l urmagan — "davom ettirish" emas, "boshlash"
        const totalLessons = lessonIdsByCourse.get(e.courseId)?.length || 0;
        return {
          id: e.course.id,
          titleUz: e.course.titleUz,
          coverImage: e.course.coverImage,
          subject: e.course.subject,
          totalLessons,
          completedLessons: activity.completed,
          progressPct: totalLessons > 0 ? Math.round((activity.completed / totalLessons) * 100) : 0,
          lastActivityAt: activity.lastActivityAt,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())
      .slice(0, 3);

    return NextResponse.json({ courses });
  } catch (error) {
    console.error('GET /api/dashboard/continue-courses error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
