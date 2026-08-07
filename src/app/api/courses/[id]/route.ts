import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { checkCourseAccess } from '@/lib/access';

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
              include: { test: { select: { id: true, titleUz: true, questionCount: true, duration: true } } },
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

    let isEnrolled = false;
    let hasAccess = course.isFree;

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
      }
    }

    const sections = course.sections.map((s) => ({
      id: s.id,
      titleUz: s.titleUz,
      lessons: s.lessons.map((l) => {
        const base = {
          id: l.id,
          titleUz: l.titleUz,
          type: l.type,
          durationMinutes: l.durationMinutes,
          isPreviewable: l.isPreviewable,
        };
        if (!l.isPreviewable) return base;
        return {
          ...base,
          videoUrl: l.type === 'VIDEO' ? l.videoUrl : null,
          content: l.type === 'TEXT' ? l.content : null,
          test: l.type === 'QUIZ' ? l.test : null,
        };
      }),
    }));

    return NextResponse.json({
      course: {
        id: course.id,
        titleUz: course.titleUz,
        description: course.description,
        coverImage: course.coverImage,
        subject: course.subject,
        teacherName: course.teacher.user.name,
        accessType: course.accessType,
        price: course.price,
        isFree: course.isFree,
        difficulty: course.difficulty,
        estimatedHours: course.estimatedHours,
        sections,
        isEnrolled,
        hasAccess,
      },
    });
  } catch (error) {
    console.error('GET /api/courses/[id] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
