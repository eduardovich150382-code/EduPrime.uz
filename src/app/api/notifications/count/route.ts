import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

// `cron/notifications` faqat 3 kunlik nofaollikni tekshiradi — soatlik
// aniqlik yetarli. Har so'rovda UPDATE qilish esa bazaga ham, funksiya
// CPU'siga ham ortiqcha yuk edi.
const LAST_ACTIVE_RESOLUTION_MS = 60 * 60_000;

// GET /api/notifications/count — get unread notification count
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ count: 0 });
    }

    const count = await db.notification.count({
      where: { userId: session.user.id, isRead: false },
    });

    // Shart `where` ichida: oxirgi yozuv bir soatdan yangi bo'lsa qator
    // tegilmaydi — alohida SELECT kerak emas.
    const now = new Date();
    await db.user.updateMany({
      where: {
        id: session.user.id,
        OR: [
          { lastActiveAt: null },
          { lastActiveAt: { lt: new Date(now.getTime() - LAST_ACTIVE_RESOLUTION_MS) } },
        ],
      },
      data: { lastActiveAt: now },
    }).catch(() => {}); // fire and forget

    return NextResponse.json({ count });
  } catch (error) {
    logger.error('GET /api/notifications/count error:', { error });
    return NextResponse.json({ count: 0 });
  }
}
