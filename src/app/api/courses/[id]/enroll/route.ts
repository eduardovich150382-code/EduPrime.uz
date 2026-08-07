import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { checkCourseAccess } from '@/lib/access';

// POST /api/courses/[id]/enroll — kursga yozilish. Bepul/Premium/Ustoz
// tarifidagi kurslarga darhol yoziladi; pullik kurslar uchun tasdiqlangan
// Payment (Telegram bot orqali) talab qilinadi.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const course = await db.course.findUnique({ where: { id } });
    if (!course || !course.isPublished) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const existing = await db.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: id } },
    });
    if (existing) {
      return NextResponse.json({ enrollment: existing, alreadyEnrolled: true });
    }

    const hasAccess = await checkCourseAccess(user.id, course, user.role);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden', accessType: course.accessType, price: course.price },
        { status: 403 }
      );
    }

    const enrollment = await db.courseEnrollment.create({
      data: { userId: user.id, courseId: id },
    });

    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (error) {
    console.error('POST /api/courses/[id]/enroll error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
