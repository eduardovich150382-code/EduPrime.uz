import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { revalidateTestCatalog } from '@/lib/cache-tags';
import { sanitizePagination } from '@/lib/sanitize';
import { ADMIN_TESTS_PAGE_SIZE, participantsOrderSql, testStatsSql, type TestStatsRow } from '@/lib/admin-tests';

const TEST_INCLUDE = {
  subject: { select: { nameUz: true, icon: true } },
  teacher: { include: { user: { select: { name: true } } } },
  _count: { select: { results: true } },
} satisfies Prisma.TestInclude;

/**
 * GET /api/admin/tests — Barcha testlar ro'yxati (ADMIN only)
 * ?search&status=published|draft&sort=new|participants&page&limit
 */
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;
    const search = (searchParams.get('search') || '').trim();
    const status = searchParams.get('status') || ''; // published, draft, all
    const sort = searchParams.get('sort') === 'participants' ? 'participants' : 'new';
    const { page, limit } = sanitizePagination(searchParams.get('page') ?? '1', searchParams.get('limit') ?? String(ADMIN_TESTS_PAGE_SIZE));
    const offset = (page - 1) * limit;
    const published = status === 'published' ? true : status === 'draft' ? false : null;

    const where: Prisma.TestWhereInput = {};
    if (search) where.titleUz = { contains: search, mode: 'insensitive' };
    if (published !== null) where.isPublished = published;

    let tests;
    if (sort === 'participants') {
      const ordered = await db.$queryRaw<{ id: string }[]>(participantsOrderSql({ search, published, limit, offset }));
      const ids = ordered.map((row) => row.id);
      const found = ids.length ? await db.test.findMany({ where: { id: { in: ids } }, include: TEST_INCLUDE }) : [];
      // `in` tartibni saqlamaydi — raw so'rovdagi tartibga qaytaramiz.
      const byId = new Map(found.map((test) => [test.id, test]));
      tests = ids.flatMap((id) => byId.get(id) ?? []);
    } else {
      tests = await db.test.findMany({ where, include: TEST_INCLUDE, orderBy: { createdAt: 'desc' }, skip: offset, take: limit });
    }

    const ids = tests.map((test) => test.id);
    const [total, stats] = await Promise.all([
      db.test.count({ where }),
      ids.length ? db.$queryRaw<TestStatsRow[]>(testStatsSql(ids)) : Promise.resolve([] as TestStatsRow[]),
    ]);
    const statsById = new Map(stats.map((row) => [row.testId, row]));

    return NextResponse.json({
      tests: tests.map((test) => ({
        id: test.id,
        titleUz: test.titleUz,
        subject: test.subject,
        teacherName: test.teacher?.user?.name || null,
        isPublished: test.isPublished,
        isFree: test.isFree,
        accessType: test.accessType || 'free',
        questionCount: test.questionCount,
        duration: test.duration,
        difficulty: test.difficulty,
        attempts: test._count.results,
        participants: statsById.get(test.id)?.participants ?? 0,
        avgScore: Math.round(statsById.get(test.id)?.avgScore ?? 0),
        createdAt: test.createdAt,
      })),
      total,
      page,
      limit,
      sort,
    });
  } catch (error) {
    logger.error('GET /api/admin/tests error:', { error });
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
      revalidateTestCatalog();
      return NextResponse.json({ message: 'Test published' });
    }

    if (action === 'unpublish') {
      await db.test.update({ where: { id: testId }, data: { isPublished: false } });
      revalidateTestCatalog();
      return NextResponse.json({ message: 'Test unpublished' });
    }

    if (action === 'delete') {
      await db.test.delete({ where: { id: testId } });
      revalidateTestCatalog();
      return NextResponse.json({ message: 'Test deleted' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logger.error('PATCH /api/admin/tests error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
