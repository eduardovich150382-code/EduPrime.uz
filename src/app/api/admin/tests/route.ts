import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';

/**
 * GET /api/admin/tests — Barcha testlar ro'yxati (ADMIN only)
 */
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || ''; // published, draft, all
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '30');

    const where: any = {};
    if (search) {
      where.titleUz = { contains: search, mode: 'insensitive' };
    }
    if (status === 'published') where.isPublished = true;
    if (status === 'draft') where.isPublished = false;

    const tests = await db.test.findMany({
      where,
      include: {
        subject: { select: { nameUz: true, icon: true } },
        teacher: {
          include: { user: { select: { name: true } } },
        },
        _count: { select: { results: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await db.test.count({ where });

    // Get avg scores for each test
    const testsWithStats = await Promise.all(
      tests.map(async (test) => {
        let avgScore = 0;
        if (test._count.results > 0) {
          const agg = await db.testResult.aggregate({
            where: { testId: test.id },
            _avg: { percentage: true },
          });
          avgScore = Math.round(agg._avg.percentage || 0);
        }

        return {
          id: test.id,
          titleUz: test.titleUz,
          subject: test.subject,
          teacherName: test.teacher?.user?.name || null,
          isPublished: test.isPublished,
          isFree: test.isFree,
          accessType: (test as any).accessType || 'free',
          questionCount: test.questionCount,
          duration: test.duration,
          difficulty: test.difficulty,
          attempts: test._count.results,
          avgScore,
          createdAt: test.createdAt,
        };
      })
    );

    return NextResponse.json({ tests: testsWithStats, total, page, limit });
  } catch (error) {
    console.error('GET /api/admin/tests error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/tests — Testni nashr/nashrdan olish yoki o'chirish
 */
export async function PATCH(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const { testId, action } = body;

    if (!testId || !action) {
      return NextResponse.json({ error: 'testId and action required' }, { status: 400 });
    }

    if (action === 'publish') {
      await db.test.update({ where: { id: testId }, data: { isPublished: true } });
      return NextResponse.json({ message: 'Test published' });
    }

    if (action === 'unpublish') {
      await db.test.update({ where: { id: testId }, data: { isPublished: false } });
      return NextResponse.json({ message: 'Test unpublished' });
    }

    if (action === 'delete') {
      await db.test.delete({ where: { id: testId } });
      return NextResponse.json({ message: 'Test deleted' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('PATCH /api/admin/tests error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
