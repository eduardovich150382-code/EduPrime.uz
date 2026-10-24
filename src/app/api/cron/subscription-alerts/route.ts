import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { loadSubscriptionRows } from '@/lib/subscription-details';
import { subscriptionAlerts, subscriptionAlertMessage, type SubscriptionAlert } from '@/lib/subscription-alerts';
import { tashkentDateKey, tashkentDayRangeUtc } from '@/lib/date';
import { hasPrismaCode } from '@/lib/admin-products-api';
import { sendSubscriptionTelegram } from '@/lib/subscription-telegram';

export async function GET(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const now = new Date();
    const results = { deactivated: 0, alerts7: 0, alerts3: 0, alerts1: 0 };
    const candidates = await db.subscription.findMany({
      where: { isActive: true, endDate: { lt: tashkentDayRangeUtc(-8, now).start } },
      select: { userId: true }, distinct: ['userId'],
    });
    const userIds = candidates.map((s) => s.userId);
    if (!userIds.length) return NextResponse.json({ success: true, ...results, timestamp: now.toISOString() });
    const [rows, users] = await Promise.all([
      loadSubscriptionRows(userIds, now, true),
      db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, lang: true, telegramId: true } }),
    ]);
    const alertsByUser = new Map<string, SubscriptionAlert[]>();
    for (const alert of subscriptionAlerts(rows, now)) {
      const id = alert.subscription.userId;
      const alerts = alertsByUser.get(id) ?? [];
      alerts.push(alert); alertsByUser.set(id, alerts);
    }
    const expired = rows.filter((s) => s.endDate < now).map((s) => s.id);
    if (expired.length) {
      const updated = await db.subscription.updateMany({ where: { id: { in: expired }, isActive: true, endDate: { lt: now } }, data: { isActive: false } });
      results.deactivated = updated.count;
    }
    for (const user of users) {
      const alerts = alertsByUser.get(user.id);
      if (!alerts?.length) continue;
      const content = subscriptionAlertMessage(alerts, user.lang);
      try {
        // Unique ID — atomar talabnoma. Faqat uni yaratgan chaqiriq tashqi
        // xabarni yuboradi; P2002 hamda Telegram xatosida qayta urinish yo'q.
        await db.notification.create({ data: {
          id: `subscription-alert:${user.id}:${tashkentDateKey(now)}`, userId: user.id,
          title: content.title, message: content.message,
          type: alerts.some((a) => a.days === null) ? 'warning' : 'reminder', link: content.link,
        } });
      } catch (error) {
        if (hasPrismaCode(error, 'P2002')) continue;
        throw error;
      }
      if (user.telegramId) {
        try { await sendSubscriptionTelegram(user.telegramId, content.telegram); }
        catch { logger.error('Subscription Telegram delivery failed'); }
      }
      for (const alert of alerts) {
        if (alert.days === 7) results.alerts7++;
        if (alert.days === 3) results.alerts3++;
        if (alert.days === 1) results.alerts1++;
      }
    }
    return NextResponse.json({ success: true, ...results, timestamp: now.toISOString() });
  } catch (error) {
    logger.error('Cron subscription-alerts error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
