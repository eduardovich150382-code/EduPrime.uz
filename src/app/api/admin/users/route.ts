import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { sanitizeText, sanitizePagination } from '@/lib/sanitize';

// GET /api/admin/users — barcha foydalanuvchilar (ADMIN only)
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;
    const search = sanitizeText(searchParams.get('search') || '', 100);
    const { page, limit } = sanitizePagination(
      searchParams.get('page'),
      searchParams.get('limit')
    );

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { telegramUsername: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        telegramId: true,
        telegramUsername: true,
        role: true,
        lang: true,
        createdAt: true,
        _count: { select: { testResults: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await db.user.count({ where });

    return NextResponse.json({ users, total, page, limit });
  } catch (error) {
    console.error('GET /api/admin/users error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
