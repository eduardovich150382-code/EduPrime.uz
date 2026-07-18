import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';

/**
 * GET /api/admin/subscriptions — Obunalar statistikasi va ro'yxati (ADMIN only)
 */
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;
    const filter = searchParams.get('filter') || 'all'; // all, premium, teacher, free, expiring
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const now = new Date();

    // Statistics
    const totalUsers = await db.user.count();

    const premiumCount = await db.subscription.count({
      where: { plan: 'PREMIUM', isActive: true, endDate: { gte: now } },
    });

    const teacherCount = await db.subscription.count({
      where: { plan: 'TEACHER_PLAN', isActive: true, endDate: { gte: now } },
    });

    const freeCount = totalUsers - premiumCount - teacherCount;

    const expiringCount = await db.subscription.count({
      where: {
        isActive: true,
        endDate: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    // Build user query based on filter
    let users: any[] = [];
    let total = 0;

    if (filter === 'free') {
      // Users without active subscription
      const usersWithSub = await db.subscription.findMany({
        where: { isActive: true, endDate: { gte: now } },
        select: { userId: true },
        distinct: ['userId'],
      });
      const subUserIds = usersWithSub.map(s => s.userId);

      total = await db.user.count({ where: { id: { notIn: subUserIds } } });
      users = await db.user.findMany({
        where: { id: { notIn: subUserIds } },
        select: {
          id: true, name: true, image: true, email: true, telegramUsername: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      users = users.map(u => ({ ...u, plan: 'Bepul', endDate: null }));
    } else {
      // Users with specific subscription
      const where: any = { isActive: true, endDate: { gte: now } };
      if (filter === 'premium') where.plan = 'PREMIUM';
      if (filter === 'teacher') where.plan = 'TEACHER_PLAN';
      if (filter === 'expiring') {
        where.endDate = {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        };
      }

      if (filter === 'all') {
        // All users with their subscription info
        total = totalUsers;
        const allUsers = await db.user.findMany({
          select: {
            id: true, name: true, image: true, email: true, telegramUsername: true, createdAt: true,
            subscriptions: {
              where: { isActive: true, endDate: { gte: now } },
              select: { plan: true, endDate: true },
              orderBy: { endDate: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        });
        users = allUsers.map(u => {
          const subs = u.subscriptions;
          let plan = 'Bepul';
          let endDate = null;
          if (subs.length > 0) {
            const hasPremium = subs.some(s => s.plan === 'PREMIUM');
            const hasTeacher = subs.some(s => s.plan === 'TEACHER_PLAN');
            if (hasPremium && hasTeacher) plan = 'Premium+Ustoz';
            else if (hasPremium) plan = 'Premium';
            else if (hasTeacher) plan = 'Ustoz';
            endDate = subs[0].endDate;
          }
          return { id: u.id, name: u.name, image: u.image, email: u.email, telegramUsername: u.telegramUsername, plan, endDate };
        });
      } else {
        total = await db.subscription.count({ where });
        const subs = await db.subscription.findMany({
          where,
          include: {
            user: {
              select: { id: true, name: true, image: true, email: true, telegramUsername: true },
            },
          },
          orderBy: { endDate: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        });
        users = subs.map(s => ({
          id: s.user.id,
          name: s.user.name,
          image: s.user.image,
          email: s.user.email,
          telegramUsername: s.user.telegramUsername,
          plan: s.plan === 'PREMIUM' ? 'Premium' : 'Ustoz',
          endDate: s.endDate,
        }));
      }
    }

    return NextResponse.json({
      stats: { totalUsers, premiumCount, teacherCount, freeCount, expiringCount },
      users,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('GET /api/admin/subscriptions error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
