import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { sanitizePagination } from '@/lib/sanitize';
import { loadTestRating, parseRatingMode } from '@/lib/test-rating';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

/**
 * GET /api/admin/tests/[id]/rating?mode=best|first&page=1&limit=50
 * Bitta test bo'yicha reyting: test nomi + 1 ta raw so'rov (parallel).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const search = request.nextUrl.searchParams;
    const mode = parseRatingMode(search.get('mode'));
    const { page, limit } = sanitizePagination(search.get('page') ?? '1', search.get('limit') ?? '50');

    const [test, rating] = await Promise.all([
      db.test.findUnique({ where: { id }, select: { id: true, titleUz: true } }),
      loadTestRating(id, mode, page, limit),
    ]);
    if (!test) return NextResponse.json({ error: 'Test not found', code: 'NOT_FOUND' }, { status: 404 });

    return NextResponse.json({
      test,
      mode,
      page,
      limit,
      summary: rating.summary,
      rows: rating.rows.map((r) => ({
        rank: r.rank,
        user: { id: r.userId, name: r.name, telegramUsername: r.telegramUsername, email: r.email },
        score: r.score,
        maxScore: r.maxScore,
        percentage: Math.round(r.percentage * 10) / 10,
        timeSpent: r.timeSpent,
        completedAt: r.completedAt,
        attemptsCount: r.attemptsCount,
      })),
    }, { headers: NO_STORE });
  } catch (error) {
    logger.error('GET /api/admin/tests/[id]/rating error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
