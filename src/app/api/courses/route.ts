import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

// GET /api/courses — nashr qilingan kurslar katalogi (fan/kategoriya filtri bilan)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const subject = searchParams.get('subject');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Prisma.CourseWhereInput = { isPublished: true };
    // Bir xil nomdagi fan har kategoriyada ALOHIDA Subject qatoriga ega —
    // kurslar katalogidagi fan filtri shu nomdagi BARCHA id'ni vergul bilan
    // ajratib yuboradi (qarang lib/subject-groups.ts), shu sababli bitta
    // id o'rniga `in` bilan qidiramiz. Bitta id yuborilganda ham (eski
    // havolalar) xuddi shunday ishlaydi.
    if (subject) {
      const subjectIds = subject.split(',').map((s) => s.trim()).filter(Boolean);
      if (subjectIds.length) where.subjectId = { in: subjectIds };
    }

    if (category) {
      const matchingCategories = await db.testCategory.findMany({
        where: { type: category as any },
        select: { id: true },
      });
      const categoryIds = matchingCategories.map((c) => c.id);
      if (categoryIds.length > 0) {
        where.subject = { categoryId: { in: categoryIds } };
      } else {
        return NextResponse.json({ courses: [], total: 0, page, limit });
      }
    }

    const [courses, total] = await Promise.all([
      db.course.findMany({
        where,
        include: {
          subject: { select: { nameUz: true, nameRu: true, nameEn: true, icon: true } },
          teacher: { include: { user: { select: { name: true } } } },
          sections: { select: { lessons: { select: { id: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.course.count({ where }),
    ]);

    const ratingAggregates = courses.length > 0
      ? await db.courseReview.groupBy({
          by: ['courseId'],
          where: { courseId: { in: courses.map((c) => c.id) } },
          _avg: { rating: true },
          _count: true,
        })
      : [];
    const ratingMap = new Map(ratingAggregates.map((r) => [r.courseId, r]));

    const result = courses.map((c) => {
      const rating = ratingMap.get(c.id);
      return {
        id: c.id,
        titleUz: c.titleUz,
        description: c.description,
        coverImage: c.coverImage,
        subject: c.subject,
        teacherName: c.teacher.user.name,
        accessType: c.accessType,
        price: c.price,
        isFree: c.isFree,
        difficulty: c.difficulty,
        estimatedHours: c.estimatedHours,
        lessonCount: c.sections.reduce((sum, s) => sum + s.lessons.length, 0),
        avgRating: rating?._avg.rating ? Math.round(rating._avg.rating * 10) / 10 : null,
        reviewCount: rating?._count || 0,
      };
    });

    return NextResponse.json({ courses: result, total, page, limit });
  } catch (error) {
    console.error('GET /api/courses error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
