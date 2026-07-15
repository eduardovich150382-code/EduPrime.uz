import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id as string;

    // Total tests count
    const totalTests = await db.testResult.count({
      where: { userId },
    });

    // Average score
    const avgResult = await db.testResult.aggregate({
      where: { userId },
      _avg: { percentage: true },
    });
    const avgScore = Math.round(avgResult._avg.percentage || 0);

    // Rank: count users with higher total score + 1
    const userTotalScore = await db.testResult.aggregate({
      where: { userId },
      _sum: { score: true },
    });
    const myScore = userTotalScore._sum.score || 0;

    // Get all users' total scores to determine rank
    const allUserScores = await db.testResult.groupBy({
      by: ['userId'],
      _sum: { score: true },
    });

    const usersWithHigherScore = allUserScores.filter(
      (u) => (u._sum.score || 0) > myScore
    ).length;
    const rank = totalTests > 0 ? usersWithHigherScore + 1 : 0;

    // Streak: count consecutive days with at least one test result
    let streak = 0;
    if (totalTests > 0) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      // Get distinct dates when user has results (last 365 days max)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 365);

      const results = await db.testResult.findMany({
        where: {
          userId,
          completedAt: { gte: startDate },
        },
        select: { completedAt: true },
        orderBy: { completedAt: 'desc' },
      });

      // Build a set of date strings (YYYY-MM-DD)
      const dateSet = new Set<string>();
      for (const r of results) {
        const d = new Date(r.completedAt);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        dateSet.add(dateStr);
      }

      // Count consecutive days backwards from today
      const checkDate = new Date();
      checkDate.setHours(0, 0, 0, 0);

      for (let i = 0; i < 365; i++) {
        const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
        if (dateSet.has(dateStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Recent results (last 5)
    const recentResults = await db.testResult.findMany({
      where: { userId },
      include: {
        test: {
          select: { titleUz: true },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      totalTests,
      avgScore,
      rank,
      streak,
      recentResults: recentResults.map((r) => ({
        id: r.id,
        testTitle: r.test.titleUz,
        percentage: Math.round(r.percentage),
        completedAt: r.completedAt,
      })),
    });
  } catch (error) {
    console.error('Dashboard stats API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
