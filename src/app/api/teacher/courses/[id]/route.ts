import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireTeacher } from '@/lib/api-auth';

// GET /api/teacher/courses/[id] — bitta kursni to'liq dastur bilan olish (tahrirlash uchun)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireTeacher();
    if (error) return error;

    const { id } = await params;

    const course = await db.course.findUnique({
      where: { id },
      include: {
        teacher: true,
        subject: { select: { nameUz: true, icon: true, categoryId: true } },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: { test: { select: { id: true, titleUz: true } } },
            },
          },
        },
      },
    });

    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

    if ((user.role as string) !== 'ADMIN' && course.teacher.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ course });
  } catch (error) {
    console.error('GET /api/teacher/courses/[id] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT /api/teacher/courses/[id] — kurs ma'lumotlarini yangilash (nashr qilishni ham o'z ichiga oladi)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireTeacher();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();

    const course = await db.course.findUnique({ where: { id }, include: { teacher: true } });
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    if ((user.role as string) !== 'ADMIN' && course.teacher.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const VALID_ACCESS_TYPES = ['free', 'premium', 'teacher', 'premium_teacher', 'paid'];
    if (body.accessType !== undefined && !VALID_ACCESS_TYPES.includes(body.accessType)) {
      return NextResponse.json({ error: 'Invalid accessType' }, { status: 400 });
    }

    const updateData: any = {};
    if (body.titleUz !== undefined) updateData.titleUz = body.titleUz;
    if (body.titleRu !== undefined) updateData.titleRu = body.titleRu;
    if (body.titleEn !== undefined) updateData.titleEn = body.titleEn;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.coverImage !== undefined) updateData.coverImage = body.coverImage;
    if (body.subjectId !== undefined) updateData.subjectId = body.subjectId;
    if (body.difficulty !== undefined) updateData.difficulty = body.difficulty;
    if (body.estimatedHours !== undefined) updateData.estimatedHours = body.estimatedHours;
    if (body.isPublished !== undefined) updateData.isPublished = body.isPublished;
    if (body.accessType !== undefined) {
      updateData.accessType = body.accessType;
      updateData.isFree = body.accessType === 'free';
      updateData.price = body.accessType === 'paid' ? (body.price || 0) : 0;
    }

    const updated = await db.course.update({ where: { id }, data: updateData });

    return NextResponse.json({ course: updated });
  } catch (error) {
    console.error('PUT /api/teacher/courses/[id] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/teacher/courses/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireTeacher();
    if (error) return error;

    const { id } = await params;
    const course = await db.course.findUnique({ where: { id }, include: { teacher: true } });
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    if ((user.role as string) !== 'ADMIN' && course.teacher.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.course.delete({ where: { id } });
    return NextResponse.json({ message: 'Course deleted' });
  } catch (error) {
    console.error('DELETE /api/teacher/courses/[id] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
