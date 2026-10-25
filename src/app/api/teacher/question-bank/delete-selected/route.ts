import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await requireTeacher();
    if (error) return error;
    const teacher = await db.teacher.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body: unknown = await request.json();
    const ids = body && typeof body === 'object' && 'ids' in body ? body.ids : null;
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 200 ||
        ids.some((id) => typeof id !== 'string' || !id.trim())) {
      return NextResponse.json({ error: 'INVALID_QUESTION_IDS' }, { status: 400 });
    }
    // Qidiruv matni bo'yicha emas, faqat ustoz belgilagan ID'lar o'chadi.
    // teacherId sharti aralash yoki soxta ID bilan begona bazaga tegishni to'sadi.
    const result = await db.bankQuestion.deleteMany({
      where: { teacherId: teacher.id, id: { in: [...new Set(ids as string[])] } },
    });
    return NextResponse.json({ count: result.count });
  } catch (error) {
    logger.error('DELETE selected bank questions:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
