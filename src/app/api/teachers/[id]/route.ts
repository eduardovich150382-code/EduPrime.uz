import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/teachers/[id] — public o'qituvchi mini-profili: bio, reyting,
// fani va nashr qilingan kurslari. Kurs landing sahifasidagi (`/courses/[id]`)
// kengayadigan "o'qituvchi haqida" panel uchun — autentifikatsiyasiz ham
// ishlaydi, xuddi kurs katalogi kabi.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const teacher = await db.teacher.findUnique({
      where: { id },
      select: {
        id: true,
        bio: true,
        rating: true,
        user: { select: { name: true } },
        subject: { select: { nameUz: true, icon: true } },
        courses: {
          where: { isPublished: true },
          orderBy: { createdAt: 'desc' },
          take: 6,
          select: {
            id: true, titleUz: true, coverImage: true, isFree: true, accessType: true, price: true,
            sections: { select: { lessons: { select: { id: true } } } },
          },
        },
      },
    });

    if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });

    const courseIds = teacher.courses.map((c) => c.id);
    const ratings = courseIds.length > 0
      ? await db.courseReview.groupBy({
          by: ['courseId'],
          where: { courseId: { in: courseIds } },
          _avg: { rating: true },
          _count: true,
        })
      : [];
    const ratingMap = new Map(ratings.map((r) => [r.courseId, r]));

    return NextResponse.json({
      teacher: {
        id: teacher.id,
        name: teacher.user.name,
        bio: teacher.bio,
        rating: teacher.rating,
        subject: teacher.subject,
        courses: teacher.courses.map((c) => {
          const r = ratingMap.get(c.id);
          return {
            id: c.id,
            titleUz: c.titleUz,
            coverImage: c.coverImage,
            isFree: c.isFree,
            accessType: c.accessType,
            price: c.price,
            lessonCount: c.sections.reduce((sum, s) => sum + s.lessons.length, 0),
            avgRating: r?._avg.rating ? Math.round(r._avg.rating * 10) / 10 : null,
            reviewCount: r?._count || 0,
          };
        }),
      },
    });
  } catch (error) {
    console.error('GET /api/teachers/[id] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
