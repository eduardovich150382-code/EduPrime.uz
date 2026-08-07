import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireTeacher } from '@/lib/api-auth';

// GET /api/teacher/courses — ustozning barcha kurslarini olish
export async function GET() {
  try {
    const { user, error } = await requireTeacher();
    if (error) return error;

    const teacher = await db.teacher.findUnique({ where: { userId: user.id } });
    if (!teacher) return NextResponse.json({ courses: [] });

    const courses = await db.course.findMany({
      where: { teacherId: teacher.id },
      include: {
        subject: { select: { nameUz: true, icon: true } },
        sections: { select: { lessons: { select: { id: true } } } },
        enrollments: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = courses.map((c) => ({
      id: c.id,
      titleUz: c.titleUz,
      subject: c.subject,
      isPublished: c.isPublished,
      isFree: c.isFree,
      price: c.price,
      accessType: c.accessType,
      coverImage: c.coverImage,
      createdAt: c.createdAt,
      lessonCount: c.sections.reduce((sum, s) => sum + s.lessons.length, 0),
      sectionCount: c.sections.length,
      studentCount: c.enrollments.length,
    }));

    return NextResponse.json({ courses: result });
  } catch (error) {
    console.error('GET /api/teacher/courses error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/teacher/courses — yangi kurs yaratish (faqat ma'lumot — dastur alohida qo'shiladi)
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireTeacher();
    if (error) return error;

    const teacher = await db.teacher.findUnique({ where: { userId: user.id } });
    if (!teacher) {
      return NextResponse.json({ error: "Faqat ustoz profiliga ega foydalanuvchilar uchun" }, { status: 403 });
    }

    const body = await request.json();
    const { titleUz, titleRu, titleEn, description, coverImage, subjectId, accessType, price, difficulty, estimatedHours, sequentialUnlock } = body;

    if (!titleUz || !subjectId) {
      return NextResponse.json({ error: 'titleUz, subjectId required' }, { status: 400 });
    }

    const VALID_ACCESS_TYPES = ['free', 'premium', 'teacher', 'premium_teacher', 'paid'];
    if (accessType !== undefined && !VALID_ACCESS_TYPES.includes(accessType)) {
      return NextResponse.json({ error: 'Invalid accessType' }, { status: 400 });
    }

    const subject = await db.subject.findUnique({ where: { id: subjectId } });
    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    const isFree = accessType === 'free' || accessType === undefined;

    const course = await db.course.create({
      data: {
        titleUz,
        titleRu: titleRu || null,
        titleEn: titleEn || null,
        description: description || null,
        coverImage: coverImage || null,
        teacherId: teacher.id,
        subjectId,
        accessType: accessType || 'free',
        isFree,
        price: isFree ? 0 : (price || 0),
        difficulty: difficulty || null,
        estimatedHours: estimatedHours || null,
        sequentialUnlock: !!sequentialUnlock,
      },
      include: { subject: { select: { nameUz: true, icon: true } } },
    });

    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    console.error('POST /api/teacher/courses error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
