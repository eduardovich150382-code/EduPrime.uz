import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';

// GET /api/admin/users/[id] — foydalanuvchi batafsil ma'lumotlari + test tarixi
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        telegramId: true,
        telegramUsername: true,
        googleId: true,
        role: true,
        lang: true,
        lastActiveAt: true,
        isBanned: true,
        bannedReason: true,
        createdAt: true,
        referralCode: true,
        _count: {
          select: { testResults: true, payments: true, referralsMade: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get active subscriptions
    const subscriptions = await db.subscription.findMany({
      where: { userId: id, isActive: true, endDate: { gte: new Date() } },
      select: { plan: true, endDate: true, startDate: true },
    });

    // Get recent test results (last 20)
    const testResults = await db.testResult.findMany({
      where: { userId: id },
      include: {
        test: { select: { titleUz: true, subject: { select: { nameUz: true } } } },
      },
      orderBy: { completedAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      user,
      subscriptions,
      testResults: testResults.map(r => ({
        id: r.id,
        testTitle: r.test.titleUz,
        subject: r.test.subject.nameUz,
        score: r.score,
        maxScore: r.maxScore,
        percentage: r.percentage,
        timeSpent: r.timeSpent,
        completedAt: r.completedAt,
      })),
    });
  } catch (error) {
    console.error('GET /api/admin/users/[id] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH /api/admin/users/[id] — rol o'zgartirish yoki ban qilish
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const { newRole, ban, banReason } = body;

    // Ban/Unban
    if (typeof ban === 'boolean') {
      const updated = await db.user.update({
        where: { id },
        data: {
          isBanned: ban,
          bannedReason: ban ? (banReason || 'Admin tomonidan bloklangan') : null,
        },
      });
      return NextResponse.json({
        message: ban ? 'Foydalanuvchi bloklandi' : 'Blok olib tashlandi',
        user: { id: updated.id, name: updated.name, isBanned: updated.isBanned },
      });
    }

    // Role change
    if (newRole) {
      if (!['USER', 'TEACHER', 'ADMIN'].includes(newRole)) {
        return NextResponse.json({ error: 'Valid role required' }, { status: 400 });
      }

      const user = await db.user.findUnique({ where: { id } });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      const updated = await db.user.update({
        where: { id },
        data: { role: newRole },
      });

      // If becoming TEACHER, create Teacher record
      if (newRole === 'TEACHER') {
        const existingTeacher = await db.teacher.findUnique({ where: { userId: id } });
        if (!existingTeacher) {
          const firstSubject = await db.subject.findFirst();
          if (firstSubject) {
            await db.teacher.create({
              data: { userId: id, subjectId: firstSubject.id, verified: true },
            });
          }
        }
      }

      return NextResponse.json({
        message: `${updated.name} is now ${newRole}`,
        user: { id: updated.id, name: updated.name, role: updated.role },
      });
    }

    return NextResponse.json({ error: 'No action specified' }, { status: 400 });
  } catch (error) {
    console.error('PATCH /api/admin/users/[id] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
