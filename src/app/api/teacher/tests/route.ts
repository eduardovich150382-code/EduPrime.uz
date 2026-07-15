import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET /api/teacher/tests — ustozning barcha testlarini olish
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== 'TEACHER' && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find teacher record
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id as string },
    });

    if (!teacher) {
      console.log('[Teacher Tests] No teacher record found for userId:', session.user.id);
      return NextResponse.json({ tests: [] });
    }

    console.log('[Teacher Tests] Found teacher:', teacher.id, 'for userId:', session.user.id);

    // Get all tests by this teacher — simplified query first
    const tests = await db.test.findMany({
      where: { teacherId: teacher.id },
      include: {
        subject: { select: { nameUz: true, icon: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('[Teacher Tests] Found', tests.length, 'tests for teacher:', teacher.id);

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
          console.error('[Teacher Tests] Error getting stats for test:', test.id, e);
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
