import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';

/**
 * GET /api/admin/dashboard — Admin dashboard statistikasi
 */
export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Today's stats
    const [
      todayNewUsers,
      todayTestsCompleted,
      pendingPayments,
      activeSubscriptions,
      totalUsers,
      totalTests,
    ] = await Promise.all([
      db.user.count({ where: { createdAt: { gte: todayStart } } }),
      db.testResult.count({ where: { completedAt: { gte: todayStart } } }),
      db.payment.count({ where: { status: 'PENDING' } }),
      db.subscription.count({ where: { isActive: true, endDate: { gte: now } } }),
      db.user.count(),
      db.test.count({ where: { isPublished: true } }),
    ]);

    // Weekly growth (users registered per day for last 7 days)
    const weeklyGrowth: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const count = await db.user.count({
        where: { createdAt: { gte: dayStart, lte: dayEnd } },
      });

      weeklyGrowth.push({
        date: dayStart.toLocaleDateString('uz-UZ', { weekday: 'short', day: 'numeric' }),
        count,
      });
    }

    // Recent 5 payments
    const recentPayments = await db.payment.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, telegramUsername: true, image: true } },
      },
    });

    // Top 5 popular tests (most attempts)
    const topTests = await db.test.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        titleUz: true,
        subject: { select: { nameUz: true, icon: true } },
        _count: { select: { results: true } },
      },
      orderBy: { results: { _count: 'desc' } },
      take: 5,
    });

    return NextResponse.json({
      stats: {
        todayNewUsers,
        todayTestsCompleted,
        pendingPayments,
        activeSubscriptions,
        totalUsers,
        totalTests,
      },
      weeklyGrowth,
      recentPayments: recentPayments.map(p => ({
        id: p.id,
        userName: p.user.name,
        telegramUsername: p.user.telegramUsername,
        userImage: p.user.image,
        plan: p.plan,
        amount: p.amount,
        status: p.status,
        createdAt: p.createdAt,
      })),
      topTests: topTests.map(t => ({
        id: t.id,
        titleUz: t.titleUz,
        subject: t.subject,
        attempts: t._count.results,
      })),
    });
  } catch (error) {
    console.error('GET /api/admin/dashboard error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
