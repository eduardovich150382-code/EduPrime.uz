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
      return NextResponse.json({ tests: [] });
    }

    // Get all tests by this teacher with result counts
    const tests = await db.test.findMany({
      where: { teacherId: teacher.id },
      include: {
        subject: { select: { nameUz: true, icon: true } },
        _count: { select: { results: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate average scores for each test
    const testsWithStats = await Promise.all(
      tests.map(async (test) => {
        let avgScore = 0;
        if (test._count.results > 0) {
          const avgResult = await db.testResult.aggregate({
            where: { testId: test.id },
            _avg: { percentage: true },
          });
          avgScore = Math.round(avgResult._avg.percentage || 0);
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
          studentCount: test._count.results,
          avgScore,
        };
      })
    );

    return NextResponse.json({ tests: testsWithStats });
  } catch (error) {
    console.error('GET /api/teacher/tests error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
