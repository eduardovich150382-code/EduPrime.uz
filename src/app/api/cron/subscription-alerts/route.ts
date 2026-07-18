import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/cron/subscription-alerts
 * Har kuni ishga tushadi (Vercel Cron yoki external cron).
 * 1. Obuna muddati tugayotganlarni ogohlantiradi (7, 3, 1 kun)
 * 2. Muddati o'tganlarni deactivate qiladi
 * 3. Telegram orqali xabar yuboradi (agar telegramId bor bo'lsa)
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const results = { deactivated: 0, alerts7: 0, alerts3: 0, alerts1: 0 };

    // 1. Deactivate expired subscriptions
    const expired = await db.subscription.findMany({
      where: { isActive: true, endDate: { lt: now } },
      include: { user: { select: { id: true, name: true, telegramId: true } } },
    });

    for (const sub of expired) {
      await db.subscription.update({
        where: { id: sub.id },
        data: { isActive: false },
      });

      // Create notification
      await db.notification.create({
        data: {
          userId: sub.user.id,
          title: 'Obuna muddati tugadi',
          message: `Sizning ${sub.plan === 'PREMIUM' ? 'Premium' : 'Ustoz'} obunangiz muddati tugadi. Yangilash uchun /pricing sahifasiga o'ting.`,
          type: 'warning',
          link: '/pricing',
        },
      });

      // Telegram notification
      if (sub.user.telegramId) {
        await sendTelegramAlert(
          sub.user.telegramId,
          `⚠️ Sizning ${sub.plan === 'PREMIUM' ? 'Premium' : 'Ustoz'} obunangiz muddati tugadi.\n\nYangilash uchun: /premium yoki /ustoz`
        );
      }

      results.deactivated++;
    }

    // 2. Alert for subscriptions expiring in 7, 3, 1 days
    const alertDays = [7, 3, 1];
    for (const days of alertDays) {
      const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      const dayStart = new Date(targetDate.setHours(0, 0, 0, 0));
      const dayEnd = new Date(targetDate.setHours(23, 59, 59, 999));

      const expiringSoon = await db.subscription.findMany({
        where: {
          isActive: true,
          endDate: { gte: dayStart, lte: dayEnd },
        },
        include: { user: { select: { id: true, name: true, telegramId: true } } },
      });

      for (const sub of expiringSoon) {
        // Check if we already sent this alert (avoid duplicates)
        const existingAlert = await db.notification.findFirst({
          where: {
            userId: sub.user.id,
            title: { contains: `${days} kun` },
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
        });

        if (!existingAlert) {
          await db.notification.create({
            data: {
              userId: sub.user.id,
              title: `Obuna ${days} kunda tugaydi`,
              message: `Sizning ${sub.plan === 'PREMIUM' ? 'Premium' : 'Ustoz'} obunangiz ${days} kunda tugaydi. Uzaytiring!`,
              type: 'reminder',
              link: '/pricing',
            },
          });

          if (sub.user.telegramId) {
            await sendTelegramAlert(
              sub.user.telegramId,
              `⏰ Sizning ${sub.plan === 'PREMIUM' ? 'Premium' : 'Ustoz'} obunangiz ${days} kunda tugaydi!\n\nUzaytirish: /premium yoki /ustoz`
            );
          }

          if (days === 7) results.alerts7++;
          if (days === 3) results.alerts3++;
          if (days === 1) results.alerts1++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Cron subscription-alerts error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * Send Telegram message to user
 */
async function sendTelegramAlert(telegramId: string, message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
  } catch (error) {
    console.error(`Failed to send Telegram alert to ${telegramId}:`, error);
  }
}
