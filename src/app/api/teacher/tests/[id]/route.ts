import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { notifyViaTelegram } from '@/lib/telegram-notify';

// GET /api/teacher/tests/[id] — ustoz uchun bitta testni olish (to'g'ri javoblar bilan)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== 'TEACHER' && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const test = await db.test.findUnique({
      where: { id },
      include: {
        subject: true,
        teacher: true,
        questions: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            text: true,
            images: true,
            options: true,
            correctAnswer: true,
            type: true,
            explanation: true,
            explanationImages: true,
            videoUrl: true,
            points: true,
            order: true,
          },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Verify ownership
    if (role !== 'ADMIN' && test.teacher?.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ test });
  } catch (error) {
    console.error('GET /api/teacher/tests/[id] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH /api/teacher/tests/[id] — update test (publish/unpublish)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== 'TEACHER' && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Find the test
    const test = await db.test.findUnique({
      where: { id },
      include: { teacher: true },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Verify ownership
    if (role !== 'ADMIN' && test.teacher?.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const wasPublished = test.isPublished;

    // Update test
    const updatedTest = await db.test.update({
      where: { id },
      data: {
        ...(body.isPublished !== undefined && { isPublished: body.isPublished }),
        ...(body.titleUz && { titleUz: body.titleUz }),
        ...(body.duration && { duration: body.duration }),
        ...(body.difficulty && { difficulty: body.difficulty }),
      },
    });

    // If test was just published, notify all users
    if (!wasPublished && body.isPublished === true) {
      notifyNewTestPublished(updatedTest.titleUz, updatedTest.id).catch(() => {});
    }

    return NextResponse.json({ test: updatedTest });
  } catch (error) {
    console.error('PATCH /api/teacher/tests/[id] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Helper: notify all users about a newly published test
async function notifyNewTestPublished(testTitle: string, testId: string) {
  try {
    const users = await db.user.findMany({
      select: { id: true, telegramId: true },
    });

    // Create in-app notifications
    await db.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        title: 'Yangi test qo\'shildi!',
        message: `"${testTitle}" testi qo'shildi. Hoziroq yechib ko'ring!`,
        type: 'info',
        link: '/tests',
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
    console.error('notifyNewTestPublished error:', error);
  }
}
