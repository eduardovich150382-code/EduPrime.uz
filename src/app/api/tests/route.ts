import { NextRequest, NextResponse } from 'next/server';
import { Prisma, TestType } from '@prisma/client';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { notifyViaTelegram } from '@/lib/telegram-notify';
import { logger } from '@/lib/logger';
import { MAX_QUERY_LENGTH } from '@/lib/tests-filters';
import { loadTestAccessContext, resolveTestAccess } from '@/lib/access';

const MAX_LIMIT = 50;
const TEST_TYPES = new Set<string>(Object.values(TestType));

function isTestType(value: string): value is TestType {
  return TEST_TYPES.has(value);
}

// Javob endi foydalanuvchiga bog'liq (hasAccess) — CDN yoki Next keshi bir
// foydalanuvchining javobini boshqasiga bermasin.
export const dynamic = 'force-dynamic';

// GET /api/tests — barcha testlarni olish (published + isFree yoki user ruxsati)
// type/subject berilmasa barcha kategoriyalardagi nashr etilgan testlar
// qaytadi (/tests sahifasidagi "Hammasi"). q va sort=popular — qo'shimcha;
// ular berilmagan eski chaqiruvlar avvalgidek ishlaydi.
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const subject = searchParams.get('subject');
    const rawType = searchParams.get('type');
    // Noma'lum qiymat enum filtriga tushsa Prisma 500 berardi. Bo'sh `?type=`
    // esa "Hammasi" — avvalgidek filtrsiz.
    if (rawType && !isTestType(rawType)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
    const type = rawType && isTestType(rawType) ? rawType : null;
    const q = (searchParams.get('q') ?? '').trim().slice(0, MAX_QUERY_LENGTH);
    const sort = searchParams.get('sort');
    // NaN yoki manfiy qiymat skip/take ga tushib Prisma xatosiga (500)
    // aylanmasin; limit yuqoridan cheklanadi — bitta so'rov butun jadvalni
    // tortib olmasin.
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20));

    const where: Prisma.TestWhereInput = { isPublished: true };
    if (category) where.categoryId = category;
    if (subject) where.subjectId = subject;
    if (q) {
      // Qidiruv hozircha faqat test va fan nomi bo'yicha. Foydalanuvchi
      // ruscha/inglizcha nomni ham yozishi mumkin, shuning uchun uchala til.
      where.OR = [
        { titleUz: { contains: q, mode: 'insensitive' } },
        { titleRu: { contains: q, mode: 'insensitive' } },
        { titleEn: { contains: q, mode: 'insensitive' } },
        { subject: { nameUz: { contains: q, mode: 'insensitive' } } },
      ];
    }

    // Filter by TestCategory type (DTM, SCHOOL, ATTESTATION, SAT, GRE, CERTIFICATE)
    if (type) {
      const matchingCategories = await db.testCategory.findMany({
        where: { type },
        select: { id: true },
      });
      const categoryIds = matchingCategories.map(c => c.id);
      if (categoryIds.length > 0) {
        where.categoryId = { in: categoryIds };
      } else {
        // No matching category, return empty
        return NextResponse.json({ tests: [], total: 0, page, limit });
      }
    }

    // "Ommabop" — necha marta yechilgani (TestResult soni). Teng bo'lsa
    // yangisi oldin, aks holda sahifalar orasida tartib sakrab ketadi.
    const orderBy: Prisma.TestOrderByWithRelationInput | Prisma.TestOrderByWithRelationInput[] =
      sort === 'popular'
        ? [{ results: { _count: 'desc' } }, { createdAt: 'desc' }]
        : { createdAt: 'desc' };

    const tests = await db.test.findMany({
      where,
      // Paywall: yozma va video yechim — pullik mahsulot, ro'yxatda ochiq
      // ketmasin. Ular natija sahifasida, access tekshiruvidan keyin beriladi.
      omit: { writtenSolution: true, videoSolution: true },
      include: {
        subject: { select: { nameUz: true, nameRu: true, nameEn: true, icon: true } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await db.test.count({ where });

    // Kartadagi maqsad belgisi (Attestatsiya, DTM, ...) uchun. Test'da
    // category relation yo'q (faqat categoryId) — schema'ga tegmaslik uchun
    // sahifadagi testlarning kategoriyalari bitta so'rovda olinadi.
    //
    // hasAccess — kartada qulf ko'rsatish uchun ishora, haqiqiy himoya
    // GET /api/tests/[id] da. Kirmagan foydalanuvchida bazaga qo'shimcha
    // so'rov yo'q: bepul testlar ochiq, qolganlari yopiq.
    const userId = session?.user?.id;
    const categories = await db.testCategory.findMany({
      where: { id: { in: [...new Set(tests.map((t) => t.categoryId))] } },
      select: { id: true, type: true },
    });
    const typeByCategory = new Map(categories.map((c) => [c.id, c.type]));
    const accessContext = userId
      ? await loadTestAccessContext(userId, session.user.role, tests, { categoryTypes: typeByCategory })
      : null;
    const testsWithType = tests.map((t) => ({
      ...t,
      category: typeByCategory.has(t.categoryId) ? { type: typeByCategory.get(t.categoryId) } : null,
      hasAccess: resolveTestAccess(t, accessContext),
    }));

    const response = NextResponse.json({ tests: testsWithType, total, page, limit });
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
    const { titleUz, titleRu, titleEn, subjectId, duration, isFree, price, accessType, difficulty, questions, videoSolution, coverImage, isPublished } = body;

    if (!titleUz || !subjectId || !duration) {
      return NextResponse.json({ error: 'titleUz, subjectId, duration required' }, { status: 400 });
    }

    const VALID_ACCESS_TYPES = ['free', 'subscription', 'premium', 'teacher', 'premium_teacher', 'paid'];
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
