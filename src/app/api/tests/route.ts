import { NextRequest, NextResponse } from 'next/server';
import { TestType } from '@prisma/client';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { notifyViaTelegram } from '@/lib/telegram-notify';
import { logger } from '@/lib/logger';
import { MAX_QUERY_LENGTH } from '@/lib/tests-filters';
import { loadTestAccessContext, resolveTestAccess } from '@/lib/access';
import { getAdFreeTestId } from '@/lib/ad-free-test';
import { testPriceSchema } from '@/lib/test-price';
import { canCacheTestsList, getTestsListPage, normalizeTestsListParams, queryTestsListPage } from '@/lib/public-catalog';
import { revalidateTestCatalog } from '@/lib/cache-tags';

const TEST_TYPES = new Set<string>(Object.values(TestType));

function isTestType(value: string): value is TestType {
  return TEST_TYPES.has(value);
}

// Javob endi foydalanuvchiga bog'liq (hasAccess) — CDN yoki Next keshi bir
// foydalanuvchining javobini boshqasiga bermasin. Umumiy ro'yxat esa
// `getTestsListPage` da alohida keshlanadi, hasAccess undan keyin.
export const dynamic = 'force-dynamic';

// GET /api/tests — barcha testlarni olish (published + isFree yoki user ruxsati)
// type/subject berilmasa barcha kategoriyalardagi nashr etilgan testlar
// qaytadi (/tests sahifasidagi "Hammasi"). q va sort=popular — qo'shimcha;
// ular berilmagan eski chaqiruvlar avvalgidek ishlaydi.
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const searchParams = request.nextUrl.searchParams;
    const rawType = searchParams.get('type');
    // Noma'lum qiymat enum filtriga tushsa Prisma 500 berardi. Bo'sh `?type=`
    // esa "Hammasi" — avvalgidek filtrsiz.
    if (rawType && !isTestType(rawType)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
    const params = normalizeTestsListParams({
      category: searchParams.get('category'),
      subject: searchParams.get('subject'),
      type: rawType && isTestType(rawType) ? rawType : null,
      sort: searchParams.get('sort'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });
    const q = (searchParams.get('q') ?? '').trim().slice(0, MAX_QUERY_LENGTH);
    const { page, limit } = params;

    const list = (await canCacheTestsList(params, q)) ? await getTestsListPage(params) : await queryTestsListPage(params, q);
    if (!list) {
      // No matching category, return empty
      return NextResponse.json({ tests: [], total: 0, page, limit });
    }

    // hasAccess — kartada qulf ko'rsatish uchun ishora, haqiqiy himoya
    // GET /api/tests/[id] da. Kirmagan foydalanuvchida bazaga qo'shimcha
    // so'rov yo'q: bepul testlar ochiq, qolganlari yopiq.
    const userId = session?.user?.id;
    const typeByCategory = new Map(list.categoryTypes);
    const [accessContext, adFreeTestId] = await Promise.all([
      userId ? loadTestAccessContext(userId, session.user.role, list.tests, { categoryTypes: typeByCategory }) : null,
      getAdFreeTestId(),
    ]);
    const testsWithType = list.tests.map((t) => ({
      ...t,
      category: typeByCategory.has(t.categoryId) ? { type: typeByCategory.get(t.categoryId) } : null,
      hasAccess: resolveTestAccess(t, accessContext),
      promoFree: t.id === adFreeTestId,
    }));

    const response = NextResponse.json({ tests: testsWithType, total: list.total, page, limit });
    if (userId) response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    logger.error('GET /api/tests error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/tests — yangi test yaratish (TEACHER/ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = session.user?.role;
    if (role !== 'TEACHER' && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { titleUz, titleRu, titleEn, subjectId, duration, isFree, price, accessType, difficulty, questions, videoSolution, coverImage, isPublished, isMock } = body;

    if (isMock !== undefined && typeof isMock !== 'boolean') {
      return NextResponse.json({ error: 'Invalid isMock' }, { status: 400 });
    }

    if (!titleUz || !subjectId || !duration) {
      return NextResponse.json({ error: 'titleUz, subjectId, duration required' }, { status: 400 });
    }

    const VALID_ACCESS_TYPES = ['free', 'subscription', 'premium', 'teacher', 'premium_teacher', 'paid'];
    if (price !== undefined && !testPriceSchema.safeParse(price).success) {
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
    }
    if (accessType !== undefined && !VALID_ACCESS_TYPES.includes(accessType)) {
      return NextResponse.json({ error: 'Invalid accessType' }, { status: 400 });
    }

    // Find teacher record
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id },
    });

    // Get subject's category
    const subject = await db.subject.findUnique({
      where: { id: subjectId },
      select: { categoryId: true },
    });

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    // Create test with questions
    const test = await db.test.create({
      data: {
        titleUz,
        titleRu: titleRu || null,
        titleEn: titleEn || null,
        categoryId: subject.categoryId,
        subjectId,
        teacherId: teacher?.id || null,
        duration,
        isFree: isFree || false,
        price: isFree ? 0 : (price || 0),
        accessType: accessType || (isFree ? 'free' : 'premium'),
        difficulty: difficulty || 3,
        questionCount: questions?.length || 0,
        isPublished: isPublished || false,
        isMock: isMock === true,
        coverImage: coverImage || null,
        videoSolution: videoSolution || null,
        questions: questions?.length ? {
          create: questions.map((q: any, index: number) => ({
            text: q.text,
            images: q.images || [],
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            type: q.type || 'MULTIPLE_CHOICE',
            explanation: q.explanation || null,
            explanationImages: q.explanationImages || [],
            videoUrl: q.videoUrl || null,
            topic: q.topic || null,
            bloomLevel: q.bloomLevel || null,
            difficulty: Number.isInteger(q.difficulty) && q.difficulty >= 1 && q.difficulty <= 5 ? q.difficulty : null,
            points: q.points || 1,
            // Attestatsiya bo'limi (`section:*`) — natija xaritasi shundan guruhlaydi.
            tags: Array.isArray(q.tags) ? q.tags.filter((t: unknown): t is string => typeof t === 'string') : [],
            order: index,
          })),
        } : undefined,
      },
      include: {
        // `orderBy` majburiy: create sahifasi javobdagi savol ID larini `order`
        // bo'yicha moslashtiradi, Postgres esa tartibsiz qaytarishi mumkin.
        questions: { orderBy: { order: 'asc' } },
        subject: true,
      },
    });

    revalidateTestCatalog();

    // If test is published immediately, notify all users
    if (isPublished) {
      notifyNewTest(test.titleUz, test.id).catch(() => {});
    }

    return NextResponse.json({ test }, { status: 201 });
  } catch (error) {
    logger.error('POST /api/tests error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Helper: notify all users about a new published test
async function notifyNewTest(testTitle: string, testId: string) {
  try {
    const users = await db.user.findMany({
      select: { id: true, telegramId: true },
    });

    // Create in-app notifications for all users
    await db.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        title: 'Yangi test qo\'shildi!',
        message: `"${testTitle}" testi qo'shildi. Hoziroq yechib ko'ring!`,
        type: 'info',
        link: `/tests`,
      })),
    });

    // Send Telegram notifications (fire-and-forget)
    for (const user of users) {
      if (user.telegramId) {
        notifyViaTelegram(
          user.telegramId,
          'Yangi test qo\'shildi!',
          `"${testTitle}" testi qo'shildi. Hoziroq yechib ko'ring!`,
          '/tests'
        ).catch(() => {});
      }
    }
  } catch (error) {
    logger.error('notifyNewTest error:', { error });
  }
}
