import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/courses — nashr qilingan kurslar katalogi (fan/kategoriya filtri bilan)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const subject = searchParams.get('subject');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = { isPublished: true };
    if (subject) where.subjectId = subject;

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

    const result = courses.map((c) => ({
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
    }));

    return NextResponse.json({ courses: result, total, page, limit });
  } catch (error) {
    console.error('GET /api/courses error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
