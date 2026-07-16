import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

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

    // Also update lastActiveAt
    await db.user.update({
      where: { id: session.user.id },
      data: { lastActiveAt: new Date() },
    }).catch(() => {}); // fire and forget

    return NextResponse.json({ count });
  } catch (error) {
    console.error('GET /api/notifications/count error:', error);
    return NextResponse.json({ count: 0 });
  }
}
