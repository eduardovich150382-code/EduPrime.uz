import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';

/**
 * GET /api/admin/notifications/history — oxirgi yuborilgan xabarlar tarixi
 * Unique title+message bo'yicha guruhlab, soni bilan qaytaradi.
 */
export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    // Get unique recent notifications (grouped by title)
    const recentNotifications = await db.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200, // Get last 200, then group
      select: {
        title: true,
        message: true,
        type: true,
        createdAt: true,
      },
    });

    // Group by title+message (same broadcast = same title+message)
    const grouped = new Map<string, { title: string; message: string; type: string; createdAt: Date; count: number }>();
    for (const n of recentNotifications) {
      const key = `${n.title}|||${n.message}`;
      if (!grouped.has(key)) {
        grouped.set(key, { title: n.title, message: n.message, type: n.type, createdAt: n.createdAt, count: 1 });
      } else {
        grouped.get(key)!.count++;
      }
    }

    // Convert to array, sort by date, take last 20 unique messages
    const history = Array.from(grouped.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 20);

    return NextResponse.json({ history });
  } catch (error) {
    console.error('GET /api/admin/notifications/history error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
