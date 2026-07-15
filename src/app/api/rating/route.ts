import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    // Get all test results grouped by user
    const results = await db.testResult.groupBy({
      by: ['userId'],
      _sum: {
        score: true,
        maxScore: true,
      },
      _count: {
        id: true,
      },
      _avg: {
        percentage: true,
      },
      orderBy: {
        _sum: {
          score: 'desc',
        },
      },
      take: limit,
    });

    if (results.length === 0) {
      return NextResponse.json({ users: [], total: 0 });
    }

    // Get user details for the top users
    const userIds = results.map(r => r.userId);
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        image: true,
        telegramUsername: true,
      },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    // Build the leaderboard
    const leaderboard = results.map((r, index) => {
      const user = userMap.get(r.userId);
      return {
        rank: index + 1,
        userId: r.userId,
        name: user?.name || 'Foydalanuvchi',
        image: user?.image || null,
        telegramUsername: user?.telegramUsername || null,
        testCount: r._count.id,
        totalScore: r._sum.score || 0,
        totalMaxScore: r._sum.maxScore || 0,
        avgPercentage: Math.round(r._avg.percentage || 0),
      };
    });

    return NextResponse.json({
      users: leaderboard,
      total: leaderboard.length,
    });
  } catch (error) {
    console.error('Rating API error:', error);
    return NextResponse.json(
      { error: 'Reyting yuklashda xatolik' },
      { status: 500 }
    );
  }
}
