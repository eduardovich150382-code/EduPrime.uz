import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { sendUserTelegramNotification } from '@/lib/telegram-notify';
import { logger } from '@/lib/logger';
import {
  ADMIN_MESSAGE_LINK_MAX, ADMIN_MESSAGE_TEXT_MAX, ADMIN_MESSAGE_TITLE_MAX,
  isAllowedAdminMessageLink, type AdminMessageResult, type TelegramDelivery,
} from '@/lib/admin-message';

const bodySchema = z.object({
  title: z.string().trim().min(1).max(ADMIN_MESSAGE_TITLE_MAX),
  message: z.string().trim().min(1).max(ADMIN_MESSAGE_TEXT_MAX),
  link: z.string().trim().max(ADMIN_MESSAGE_LINK_MAX).nullish()
    .transform((value) => value || null)
    .refine((value) => value === null || isAllowedAdminMessageLink(value)),
  channels: z.object({
    site: z.boolean().optional(),
    telegram: z.boolean().optional(),
  }).optional(),
});

// POST /api/admin/users/[id]/message — bitta foydalanuvchiga sayt + Telegram xabari
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
    const { title, message, link } = parsed.data;
    const site = parsed.data.channels?.site ?? true;
    const telegram = parsed.data.channels?.telegram ?? true;
    if (!site && !telegram) {
      return NextResponse.json({ error: 'At least one channel is required' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id }, select: { id: true, telegramId: true } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (site) {
      await db.notification.create({
        data: { userId: user.id, title, message, type: 'admin_message', link },
      });
    }

    let delivery: TelegramDelivery = 'skipped';
    if (telegram) {
      if (!user.telegramId) {
        delivery = 'not_linked';
      } else {
        // Await ataylab: Vercel javob qaytgach funksiyani to'xtatadi, admin esa
        // xabar haqiqatan ketdimi-yo'qmi natijada ko'rishi kerak.
        const ok = await sendUserTelegramNotification(user.telegramId, title, message, link);
        delivery = ok ? 'sent' : 'failed';
        if (!ok) logger.warn('Admin direct message: Telegram delivery failed', { userId: user.id });
      }
    }

    const result: AdminMessageResult = { success: true, site, telegram: delivery };
    return NextResponse.json(result);
  } catch (error) {
    logger.error('POST /api/admin/users/[id]/message error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
