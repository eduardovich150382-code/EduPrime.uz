import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireTeacher } from '@/lib/api-auth';

// GET /api/teacher/tests — ustozning barcha testlarini olish
export async function GET() {
  try {
    const { user, error } = await requireTeacher();
    if (error) return error;

    const session = { user };

    // Find teacher record
    const teacher = await db.teacher.findUnique({
      where: { userId: user.id },
    });

    if (!teacher) {
      return NextResponse.json({ tests: [] });
    }

    // Get all tests by this teacher
    const tests = await db.test.findMany({
      where: { teacherId: teacher.id },
      include: {
        subject: { select: { nameUz: true, icon: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get result counts separately to avoid potential issues
    const testsWithStats = await Promise.all(
      tests.map(async (test) => {
        let studentCount = 0;
        let avgScore = 0;

        try {
          studentCount = await db.testResult.count({
            where: { testId: test.id },
          });

          if (studentCount > 0) {
            const avgResult = await db.testResult.aggregate({
              where: { testId: test.id },
              _avg: { percentage: true },
            });
            avgScore = Math.round(avgResult._avg.percentage || 0);
          }
        } catch (e) {
          // Silently handle stats errors - test will still be returned with zero counts
        }

        return {
          id: test.id,
          titleUz: test.titleUz,
          subject: test.subject,
          isPublished: test.isPublished,
          isFree: test.isFree,
          price: test.price,
          duration: test.duration,
          difficulty: test.difficulty,
          questionCount: test.questionCount,
          coverImage: test.coverImage,
          createdAt: test.createdAt,
          studentCount,
          avgScore,
        };
      })
    );

    return NextResponse.json({ tests: testsWithStats });
  } catch (error) {
    console.error('[Teacher Tests] GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
