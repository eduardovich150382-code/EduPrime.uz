import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { notifyViaTelegram } from '@/lib/telegram-notify';

// GET /api/tests — barcha testlarni olish (published + isFree yoki user ruxsati)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const subject = searchParams.get('subject');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = { isPublished: true };
    if (category) where.categoryId = category;
    if (subject) where.subjectId = subject;

    // Filter by TestCategory type (DTM, SCHOOL, ATTESTATION, SAT, GRE, CERTIFICATE)
    if (type) {
      const matchingCategories = await db.testCategory.findMany({
        where: { type: type as any },
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

    const tests = await db.test.findMany({
      where,
      include: {
        subject: { select: { nameUz: true, nameRu: true, nameEn: true, icon: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await db.test.count({ where });

    return NextResponse.json({ tests, total, page, limit });
  } catch (error) {
    console.error('GET /api/tests error:', error);
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

    const role = (session.user as any)?.role;
    if (role !== 'TEACHER' && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { titleUz, titleRu, titleEn, subjectId, duration, isFree, price, difficulty, questions, videoSolution, coverImage, isPublished } = body;

    if (!titleUz || !subjectId || !duration) {
      return NextResponse.json({ error: 'titleUz, subjectId, duration required' }, { status: 400 });
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
            points: q.points || 1,
            order: index,
          })),
        } : undefined,
      },
      include: {
        questions: true,
        subject: true,
      },
    });

    // If test is published immediately, notify all users
    if (isPublished) {
      notifyNewTest(test.titleUz, test.id).catch(() => {});
    }

    return NextResponse.json({ test }, { status: 201 });
  } catch (error) {
    console.error('POST /api/tests error:', error);
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
    console.error('notifyNewTest error:', error);
  }
}
