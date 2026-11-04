import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { touchLastActive } from '@/lib/last-active';

// ESKIRGAN: yangi klient sonni `/api/me/header` dan oladi. Deploy paytida
// ochiq turgan tablar va eski JS uchun qoldirilgan — keyinroq o'chiriladi.
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

    await touchLastActive(session.user.id, new Date()).catch(() => {}); // fire and forget

    return NextResponse.json({ count });
  } catch (error) {
    logger.error('GET /api/notifications/count error:', { error });
    return NextResponse.json({ count: 0 });
  }
}
