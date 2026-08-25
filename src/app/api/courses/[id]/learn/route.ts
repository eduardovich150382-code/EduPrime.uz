import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { computeLockedLessonIds } from '@/lib/course-lock';
import { collectLessonQuizTestIds, flattenGatingTestIds, resolveSolutionBlockVideoUrl } from '@/lib/solution-lock';

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
              include: {
                test: { select: { id: true, titleUz: true, questionCount: true, duration: true } },
                blocks: {
                  orderBy: { order: 'asc' },
                  include: { test: { select: { id: true, titleUz: true, questionCount: true, duration: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

    const enrollment = await db.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: id } },
    });

    // Kursning egasi (o'qituvchi) yoki ADMIN yozilmagan bo'lsa ham "talaba
    // ko'zi bilan ko'rish" uchun davom etadi — hech qanday dars qulflanmaydi
    // va progress yozilmaydi (frontend buni isPreview orqali biladi).
    const isOwnerOrAdmin = user.role === 'ADMIN' || course.teacher.userId === user.id;
    if (!enrollment && !isOwnerOrAdmin) {
      return NextResponse.json({ error: "Siz bu kursga yozilmagansiz" }, { status: 403 });
    }
    const isPreview = !enrollment;

    const allLessons = course.sections.flatMap((s) => s.lessons);
    const allLessonIds = allLessons.map((l) => l.id);
    const progressRows = await db.lessonProgress.findMany({
      where: { userId: user.id, lessonId: { in: allLessonIds } },
    });
    const progressMap = new Map(progressRows.map((p) => [p.lessonId, p]));

    const lockedLessonIds = isPreview
      ? new Set<string>()
      : computeLockedLessonIds(
          allLessons.map((l) => ({ id: l.id, type: l.type, minPassPercent: l.minPassPercent })),
          new Map(progressRows.map((p) => [p.lessonId, { completed: p.completed, bestScorePercent: p.bestScorePercent }])),
          course.sequentialUnlock
        );

    // VIDEO_SOLUTION blokini qulflash — src/lib/solution-lock.ts (bir xil
    // mantiq GET /api/courses/[id] preview endpoint'ida ham ishlatiladi).
    const lessonQuizTestIds = collectLessonQuizTestIds(allLessons);
    const allGatingTestIds = flattenGatingTestIds(lessonQuizTestIds);
    const submittedTestIds = new Set<string>();
    if (allGatingTestIds.length > 0) {
      const submitted = await db.testResult.findMany({
        where: { userId: user.id, testId: { in: allGatingTestIds } },
        select: { testId: true },
        distinct: ['testId'],
      });
      for (const r of submitted) submittedTestIds.add(r.testId);
    }

    const sections = course.sections.map((s) => ({
      id: s.id,
      titleUz: s.titleUz,
      lessons: s.lessons.map((l) => {
        const p = progressMap.get(l.id);
        const locked = lockedLessonIds.has(l.id);
        return {
          id: l.id,
          titleUz: l.titleUz,
          type: l.type,
          durationMinutes: l.durationMinutes,
          videoUrl: locked ? null : l.videoUrl,
          content: locked ? null : l.content,
          test: locked ? null : l.test,
          fileUrl: locked ? null : l.fileUrl,
          minPassPercent: l.minPassPercent,
          locked,
          completed: p?.completed || false,
          bestScorePercent: p?.bestScorePercent ?? null,
          lastPositionSeconds: p?.lastPositionSeconds || 0,
          // Qo'shimcha materiallar — asosiy kontent bilan bir xil qulf qoidasi:
          // dars qulflangan bo'lsa, hech qanday blok kontenti (fayl/video/test)
          // chiqmaydi.
          blocks: locked ? [] : l.blocks.map((b) => ({
            id: b.id,
            type: b.type,
            labelUz: b.labelUz,
            fileUrl: b.fileUrl,
            videoUrl: resolveSolutionBlockVideoUrl({
              lessonId: l.id,
              block: b,
              lessonQuizTestIds,
              submittedTestIds,
            }),
            test: b.test,
          })),
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
        isCompleted: !!enrollment?.completedAt,
        enrollmentId: enrollment?.id ?? null,
        isPreview,
      },
    });
  } catch (error) {
    console.error('GET /api/courses/[id]/learn error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
