import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  sendInactivityReminder,
  sendPremiumExpiryWarning,
  notifyViaTelegram,
} from '@/lib/telegram-notify';

// GET /api/cron/notifications — daily cron job for automated notifications
// Protected by CRON_SECRET header
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    let premiumWarnings = 0;
    let inactivityReminders = 0;

    // 1. Premium expiry warnings (3 days before)
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    const expiringSubscriptions = await db.subscription.findMany({
      where: {
        isActive: true,
        endDate: {
          gte: twoDaysFromNow,
          lte: threeDaysFromNow,
        },
      },
      include: {
        user: { select: { id: true, name: true, telegramId: true } },
      },
    });

    for (const sub of expiringSubscriptions) {
      const daysLeft = Math.ceil(
        (sub.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Create in-app notification
      await db.notification.create({
        data: {
          userId: sub.user.id,
          title: 'Premium tarifingiz tugamoqda',
          message: `Sizning Premium tarifingiz tugashiga ${daysLeft} kun qoldi. Tarifni uzaytiring.`,
          type: 'warning',
          link: '/pricing',
        },
      });

      // Send Telegram notification
      if (sub.user.telegramId) {
        sendPremiumExpiryWarning(
          sub.user.telegramId,
          sub.user.name || '',
          daysLeft
        );
        premiumWarnings++;
      }
    }

    // 2. Inactive users (3+ days without activity) - daily reminder at cron time
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const inactiveUsers = await db.user.findMany({
      where: {
        telegramId: { not: null },
        OR: [
          { lastActiveAt: { lte: threeDaysAgo } },
          { lastActiveAt: null, createdAt: { lte: threeDaysAgo } },
        ],
      },
      select: {
        id: true,
        name: true,
        telegramId: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });

    // Count new tests added in the last 3 days
    const newTestsCount = await db.test.count({
      where: {
        isPublished: true,
        createdAt: { gte: threeDaysAgo },
      },
    });

    for (const user of inactiveUsers) {
      const lastActive = user.lastActiveAt || user.createdAt;
      const inactiveDays = Math.floor(
        (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Create in-app notification
      await db.notification.create({
        data: {
          userId: user.id,
          title: 'Sizni sog\'indik!',
          message: `${inactiveDays} kundan beri kirmadingiz. ${newTestsCount > 0 ? `${newTestsCount} ta yangi test qo'shildi!` : 'Yangi testlar sizni kutmoqda!'}`,
          type: 'reminder',
          link: '/dashboard',
        },
      });

      // Send Telegram message
      if (user.telegramId) {
        sendInactivityReminder(
          user.telegramId,
          user.name || '',
          inactiveDays,
          newTestsCount
        );
        inactivityReminders++;
      }
    }

    return NextResponse.json({
      success: true,
      premiumWarnings,
      inactivityReminders,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('CRON /api/cron/notifications error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
