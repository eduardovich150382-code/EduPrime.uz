import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET /api/results — foydalanuvchining barcha natijalari
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await db.testResult.findMany({
      where: { userId: session.user.id },
      include: {
        test: {
          select: { titleUz: true, titleRu: true, titleEn: true, questionCount: true },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 50,
    });

    // Stats
    const totalTests = results.length;
    const avgScore = totalTests > 0
      ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / totalTests)
      : 0;

    return NextResponse.json({ results, stats: { totalTests, avgScore } });
  } catch (error) {
    console.error('GET /api/results error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
