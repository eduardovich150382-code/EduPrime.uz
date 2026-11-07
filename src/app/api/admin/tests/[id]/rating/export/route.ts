import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { attachmentHeader, buildCsv, fileSlug } from '@/lib/csv';
import { loadTestRating, minutesSeconds, parseRatingMode, tashkentDateTime } from '@/lib/test-rating';

const HEADER = ["O'rin", 'Ism', 'Telegram', 'Email', 'Ball', 'Maks', 'Foiz', 'Vaqt (daq:son)', 'Sana (Toshkent)', 'Urinishlar'];

/**
 * GET /api/admin/tests/[id]/rating/export?mode=best|first — to'liq reyting CSV
 * (sahifalashsiz). Ustun nomlari o'zbekcha: fayl adminlar orasida
 * ulashiladigan hisobot, interfeys tiliga bog'liq bo'lmasin.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const mode = parseRatingMode(request.nextUrl.searchParams.get('mode'));
    const [test, rating] = await Promise.all([
      db.test.findUnique({ where: { id }, select: { titleUz: true } }),
      loadTestRating(id, mode, 1, null),
    ]);
    if (!test) return NextResponse.json({ error: 'Test not found', code: 'NOT_FOUND' }, { status: 404 });

    const csv = buildCsv([
      HEADER,
      ...rating.rows.map((r) => [
        r.rank,
        r.name ?? '',
        // `@` siz: Excel `@` bilan boshlangan katakni formula deb o'qiydi.
        r.telegramUsername ?? '',
        r.email ?? '',
        r.score,
        r.maxScore,
        // `;` ajratuvchili Excel (uz/ru) o'nlikni vergul bilan o'qiydi.
        String(Math.round(r.percentage * 10) / 10).replace('.', ','),
        minutesSeconds(r.timeSpent),
        tashkentDateTime(r.completedAt),
        r.attemptsCount,
      ]),
    ]);
    const filename = `${fileSlug(test.titleUz)}_${mode}_${tashkentDateTime(new Date()).slice(0, 10)}.csv`;
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': attachmentHeader(filename),
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    logger.error('GET /api/admin/tests/[id]/rating/export error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
