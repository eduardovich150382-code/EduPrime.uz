import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { computeLockedLessonIds } from '@/lib/course-lock';

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
      select: { id: true, type: true, section: { select: { courseId: true } } },
    });
    if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });

    const courseId = lesson.section.courseId;
    const enrollment = await db.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    });
    if (!enrollment) {
      return NextResponse.json({ error: "Siz bu kursga yozilmagansiz" }, { status: 403 });
    }

    // QUIZ darslar bu umumiy endpoint orqali "tugatilgan" deb belgilanmaydi —
    // ular faqat bog'langan testni yechish orqali (POST /api/tests/[id]/submit)
    // avtomatik belgilanadi, aks holda talaba testni yechmasdan ham
    // "o'tdim" deb belgilab qo'ya oladi.
    if (completed === true && lesson.type === 'QUIZ') {
      return NextResponse.json(
        { error: "QUIZ turidagi darslar faqat testni yechish orqali avtomatik belgilanadi" },
        { status: 400 }
      );
    }

    // Ketma-ket ochish yoqilgan bo'lsa — oldingi darslar hali "o'tilmagan"
    // bo'lsa, bu darsni tugatilgan deb belgilashga yo'l qo'yilmaydi (frontend
    // qulflangan darsni ko'rsatmaydi, lekin bu server-side himoya — to'g'ridan
    // to'g'ri API so'rovi bilan chetlab o'tishning oldini oladi).
    if (completed === true) {
      const course = await db.course.findUnique({ where: { id: courseId }, select: { sequentialUnlock: true } });
      if (course?.sequentialUnlock) {
        const allLessonsOrdered = await db.courseLesson.findMany({
          where: { section: { courseId } },
          orderBy: [{ section: { order: 'asc' } }, { order: 'asc' }],
          select: { id: true, type: true, minPassPercent: true },
        });
        const progressRows = await db.lessonProgress.findMany({
          where: { userId: user.id, lessonId: { in: allLessonsOrdered.map((l) => l.id) } },
          select: { lessonId: true, completed: true, bestScorePercent: true },
        });
        const lockedIds = computeLockedLessonIds(
          allLessonsOrdered,
          new Map(progressRows.map((p) => [p.lessonId, { completed: p.completed, bestScorePercent: p.bestScorePercent }])),
          true
        );
        if (lockedIds.has(id)) {
          return NextResponse.json({ error: "Avval oldingi darslarni tugating" }, { status: 403 });
        }
      }
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
