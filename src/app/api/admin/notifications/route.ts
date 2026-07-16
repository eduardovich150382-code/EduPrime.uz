import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { notifyViaTelegram } from '@/lib/telegram-notify';

// POST /api/admin/notifications — broadcast notification to all users
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, message, link, type } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'title and message are required' }, { status: 400 });
    }

    // Get all users
    const users = await db.user.findMany({
      select: { id: true, telegramId: true },
    });

    // Create notifications for all users
    await db.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        title,
        message,
        type: type || 'info',
        link: link || null,
      })),
    });

    // Send Telegram notifications (fire-and-forget)
    for (const user of users) {
      if (user.telegramId) {
        notifyViaTelegram(user.telegramId, title, message, link).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      notifiedCount: users.length,
    });
  } catch (error) {
    console.error('POST /api/admin/notifications error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
