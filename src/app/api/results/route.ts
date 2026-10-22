import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

const BRIEF_MAX_LIMIT = 100;

// GET /api/results — foydalanuvchining barcha natijalari
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    // brief — /tests kartalari uchun: har test bo'yicha oxirgi natija va
    // unga havola. answers (savol/javob) ataylab olinmaydi — kartaga kerak
    // emas va 100 ta qatorda javobni sezilarli og'irlashtiradi.
    if (searchParams.get('brief') === 'true') {
      const limit = Math.min(BRIEF_MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || '') || BRIEF_MAX_LIMIT));
      const results = await db.testResult.findMany({
        // Sessiya natijalarida testId bo'sh — ular hech bir kartaga tegishli emas.
        where: { userId: session.user.id, testId: { not: null } },
        select: { id: true, testId: true, completedAt: true, score: true, maxScore: true, percentage: true },
        orderBy: { completedAt: 'desc' },
        take: limit,
      });
      return NextResponse.json({ results });
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
    logger.error('GET /api/results error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
