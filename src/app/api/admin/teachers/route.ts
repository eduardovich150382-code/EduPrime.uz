import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';

// GET /api/admin/teachers — barcha ustozlar ro'yxati
export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const teachers = await db.teacher.findMany({
      include: {
        user: { select: { name: true, image: true, telegramUsername: true, email: true } },
        subject: { select: { nameUz: true, icon: true } },
        _count: { select: { tests: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ teachers });
  } catch (error) {
    console.error('GET /api/admin/teachers error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH /api/admin/teachers — ustoz tasdiqlash/bekor qilish
export async function PATCH(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const { teacherId, verified } = body;

    if (!teacherId || typeof verified !== 'boolean') {
      return NextResponse.json({ error: 'teacherId and verified required' }, { status: 400 });
    }

    const teacher = await db.teacher.update({
      where: { id: teacherId },
      data: { verified },
    });

    return NextResponse.json({ message: verified ? 'Teacher verified' : 'Teacher unverified', teacher });
  } catch (error) {
    console.error('PATCH /api/admin/teachers error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
