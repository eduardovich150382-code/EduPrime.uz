import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { checkCourseAccess, isLessonFreelyPreviewable } from '@/lib/access';
import { collectLessonQuizTestIds, flattenGatingTestIds, resolveSolutionBlockVideoUrl } from '@/lib/solution-lock';

// GET /api/courses/[id] — kurs dasturi (curriculum) + yozilish/ruxsat holati.
// Dars KONTENTI (video/matn/test) faqat isPreviewable=true darslarda
// qaytariladi — to'liq iste'mol qilish MVP-C (pleyer) vazifasi, bu yerda
// faqat marketing uchun namuna ko'rsatiladi.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const course = await db.course.findUnique({
      where: { id },
      include: {
        subject: { select: { nameUz: true, nameRu: true, nameEn: true, icon: true } },
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

    if (!course || !course.isPublished) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const session = await auth();
    const userId = session?.user?.id;

    const ratingAggregate = await db.courseReview.aggregate({
      where: { courseId: id },
      _avg: { rating: true },
      _count: true,
    });

    let isEnrolled = false;
    let hasAccess = course.isFree;
    let pendingPayment = false;

    if (userId) {
      const enrollment = await db.courseEnrollment.findUnique({
        where: { userId_courseId: { userId, courseId: id } },
      });
      isEnrolled = !!enrollment;

      if (isEnrolled) {
        hasAccess = true;
      } else {
        const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
        hasAccess = await checkCourseAccess(userId, course, user?.role);

        // S25 — "chek yuborildi, admin tekshirmoqda" holatini ko'rsatish
        // uchun: Telegram bot orqali qabul qilingan chek `saveReceiptToDB`da
        // (telegram/webhook route.ts) shu kurs id'si bilan PENDING Payment
        // yaratadi. Faqat 'paid' kurslarda tekshiramiz — premium/teacher
        // tarifida "kutish" tushunchasi yo'q (obuna darhol yoki umuman yo'q).
        if (!hasAccess && course.accessType === 'paid') {
          const pending = await db.payment.findFirst({
            where: { userId, status: 'PENDING', selectedSubjects: { has: course.id } },
            select: { id: true },
          });
          pendingPayment = !!pending;
        }
      }
    }

    // VIDEO_SOLUTION blokini qulflash — src/lib/solution-lock.ts (bir xil
    // mantiq GET /api/courses/[id]/learn'da ham ishlatiladi). Bu endpoint
    // autentifikatsiyasiz ham chaqirilishi mumkin — userId bo'lmasa
    // submittedTestIds bo'sh qoladi va gating bloklari doim `null` bo'ladi.
    const allLessons = course.sections.flatMap((s) => s.lessons);
    // S25 — birinchi dars (global tartibda) har doim bepul ko'rinsin, qarang
    // lib/access.ts#isLessonFreelyPreviewable.
    const firstLessonId = allLessons[0]?.id;
    const lessonQuizTestIds = collectLessonQuizTestIds(allLessons);
    const allGatingTestIds = flattenGatingTestIds(lessonQuizTestIds);
    const submittedTestIds = new Set<string>();
    if (userId && allGatingTestIds.length > 0) {
      const submitted = await db.testResult.findMany({
        where: { userId, testId: { in: allGatingTestIds } },
        select: { testId: true },
        distinct: ['testId'],
      });
      // testId — `where: { testId: { in: allGatingTestIds } } }` bilan
      // filtrlangan, shu sababli amalda hech qachon null emas — bu yerdagi
      // tekshiruv faqat TestResult.testId endi nullable bo'lgani uchun
      // TypeScript'ni qanoatlantirish uchun.
      for (const r of submitted) if (r.testId) submittedTestIds.add(r.testId);
    }

    const sections = course.sections.map((s) => ({
      id: s.id,
      titleUz: s.titleUz,
      lessons: s.lessons.map((l) => {
        const freePreview = isLessonFreelyPreviewable(l, firstLessonId);
        const base = {
          id: l.id,
          titleUz: l.titleUz,
          type: l.type,
          durationMinutes: l.durationMinutes,
          // Frontend'ga effektiv (o'qituvchi bayrog'i YOKI birinchi dars)
          // qiymat beriladi — shu bitta maydonga qarab "Namuna" belgisi va
          // ochish/yopish ishlaydi, alohida "birinchi dars" holatini bilishi
          // shart emas.
          isPreviewable: freePreview,
        };
        if (!freePreview) return base;
        return {
          ...base,
          videoUrl: l.type === 'VIDEO' ? l.videoUrl : null,
          content: l.type === 'TEXT' ? l.content : null,
          test: l.type === 'QUIZ' ? l.test : null,
          fileUrl: l.type === 'PDF' ? l.fileUrl : null,
          // Qo'shimcha materiallar — faqat namuna sifatida ochilgan darsda,
          // asosiy kontent bilan bir xil qoida (isPreviewable).
          blocks: l.blocks.map((b) => ({
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
            embedUrl: b.embedUrl,
            itemCount: b.itemIds.length,
          })),
        };
      }),
    }));

    return NextResponse.json({
      course: {
        id: course.id,
        titleUz: course.titleUz,
        description: course.description,
        coverImage: course.coverImage,
        trailerVideoUrl: course.trailerVideoUrl,
        whatYoullLearn: course.whatYoullLearn,
        prerequisites: course.prerequisites,
        subject: course.subject,
        teacherId: course.teacherId,
        teacherName: course.teacher.user.name,
        accessType: course.accessType,
        price: course.price,
        isFree: course.isFree,
        difficulty: course.difficulty,
        estimatedHours: course.estimatedHours,
        sections,
        isEnrolled,
        hasAccess,
        pendingPayment,
        avgRating: ratingAggregate._avg.rating ? Math.round(ratingAggregate._avg.rating * 10) / 10 : null,
        reviewCount: ratingAggregate._count,
      },
    });
  } catch (error) {
    console.error('GET /api/courses/[id] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
