import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/certificate/[enrollmentId] — ommaviy (auth talab qilinmaydi,
// /api/share/result/[id] bilan bir xil naqsh): sertifikat ma'lumotlari.
// Faqat kurs TO'LIQ tugatilgan bo'lsa (completedAt bor) qaytariladi —
// aks holda hali tugatilmagan kursga soxta sertifikat havolasi yasab
// bo'lmasligi kerak.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ enrollmentId: string }> }
) {
  try {
    const { enrollmentId } = await params;

    const enrollment = await db.courseEnrollment.findUnique({
      where: { id: enrollmentId },
      select: {
        id: true,
        completedAt: true,
        enrolledAt: true,
        user: { select: { name: true, image: true } },
        course: {
          select: {
            id: true,
            titleUz: true,
            estimatedHours: true,
            subject: { select: { nameUz: true } },
            teacher: { select: { user: { select: { name: true } } } },
            sections: { select: { lessons: { select: { id: true } } } },
          },
        },
      },
    });

    if (!enrollment || !enrollment.completedAt) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    const totalLessons = enrollment.course.sections.reduce((sum, s) => sum + s.lessons.length, 0);

    return NextResponse.json({
      certificate: {
        id: enrollment.id,
        completedAt: enrollment.completedAt,
        enrolledAt: enrollment.enrolledAt,
        user: enrollment.user,
        course: {
          id: enrollment.course.id,
          titleUz: enrollment.course.titleUz,
          estimatedHours: enrollment.course.estimatedHours,
          subject: enrollment.course.subject,
          teacherName: enrollment.course.teacher.user.name,
        },
        totalLessons,
      },
    });
  } catch (error) {
    console.error('GET /api/certificate/[enrollmentId] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
