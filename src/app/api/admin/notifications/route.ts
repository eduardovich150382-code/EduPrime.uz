import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { notifyViaTelegram } from '@/lib/telegram-notify';

// POST /api/admin/notifications — send notification to target audience
export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const { title, message, link, type, target } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'title and message are required' }, { status: 400 });
    }

    const now = new Date();

    // Build user filter based on target audience
    let userFilter: any = {};
    if (target === 'free') {
      // Users without active subscription
      const activeSubUsers = await db.subscription.findMany({
        where: { isActive: true, endDate: { gte: now } },
        select: { userId: true },
        distinct: ['userId'],
      });
      const subUserIds = activeSubUsers.map(s => s.userId);
      userFilter = { id: { notIn: subUserIds } };
    } else if (target === 'premium') {
      const premiumUsers = await db.subscription.findMany({
        where: { plan: 'PREMIUM', isActive: true, endDate: { gte: now } },
        select: { userId: true },
        distinct: ['userId'],
      });
      userFilter = { id: { in: premiumUsers.map(s => s.userId) } };
    } else if (target === 'teacher') {
      const teacherUsers = await db.subscription.findMany({
        where: { plan: 'TEACHER_PLAN', isActive: true, endDate: { gte: now } },
        select: { userId: true },
        distinct: ['userId'],
      });
      userFilter = { id: { in: teacherUsers.map(s => s.userId) } };
    }
    // 'all' — no filter

    const users = await db.user.findMany({
      where: userFilter,
      select: { id: true, telegramId: true },
    });

    if (users.length === 0) {
      return NextResponse.json({ success: true, notifiedCount: 0, message: 'Maqsadli auditoriya topilmadi' });
    }

    // Create notifications
    await db.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        title,
        message,
        type: type || 'info',
        link: link || null,
      })),
    });

    // Send Telegram notifications
    for (const user of users) {
      if (user.telegramId) {
        notifyViaTelegram(user.telegramId, title, message, link).catch(() => {});
      }
    }

    return NextResponse.json({ success: true, notifiedCount: users.length });
  } catch (error) {
    console.error('POST /api/admin/notifications error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
