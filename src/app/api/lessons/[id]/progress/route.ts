import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

// POST /api/lessons/[id]/progress — dars progressini yangilash (video
// pozitsiyasi va/yoki tugatilganlik belgisi). Faqat kursga yozilgan
// foydalanuvchi uchun. Barcha darslar tugatilsa, CourseEnrollment ham
// avtomatik "tugatildi" deb belgilanadi.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const { completed, lastPositionSeconds } = body;

    const lesson = await db.courseLesson.findUnique({
      where: { id },
      select: { id: true, section: { select: { courseId: true } } },
    });
    if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });

    const courseId = lesson.section.courseId;
    const enrollment = await db.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    });
    if (!enrollment) {
      return NextResponse.json({ error: "Siz bu kursga yozilmagansiz" }, { status: 403 });
    }

    const updateData: any = {};
    if (typeof lastPositionSeconds === 'number' && lastPositionSeconds >= 0) {
      updateData.lastPositionSeconds = Math.floor(lastPositionSeconds);
    }
    if (typeof completed === 'boolean') {
      updateData.completed = completed;
      updateData.completedAt = completed ? new Date() : null;
    }

    const progress = await db.lessonProgress.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId: id } },
      update: updateData,
      create: {
        userId: user.id,
        lessonId: id,
        completed: !!completed,
        lastPositionSeconds: updateData.lastPositionSeconds ?? null,
        completedAt: completed ? new Date() : null,
      },
    });

    // Butun kurs tugatildimi — tekshirib CourseEnrollment.completedAt qo'yamiz
    if (completed && !enrollment.completedAt) {
      const allLessons = await db.courseLesson.findMany({
        where: { section: { courseId } },
        select: { id: true },
      });
      if (allLessons.length > 0) {
        const doneCount = await db.lessonProgress.count({
          where: { userId: user.id, lessonId: { in: allLessons.map((l) => l.id) }, completed: true },
        });
        if (doneCount >= allLessons.length) {
          await db.courseEnrollment.update({ where: { id: enrollment.id }, data: { completedAt: new Date() } });
        }
      }
    }

    return NextResponse.json({ progress });
  } catch (error) {
    console.error('POST /api/lessons/[id]/progress error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
