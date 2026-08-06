import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireTeacher } from '@/lib/api-auth';

// DELETE /api/teacher/question-bank/[id] — bazadan savolni o'chirish
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireTeacher();
    if (error) return error;

    const teacher = await db.teacher.findUnique({ where: { userId: user.id } });
    if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const question = await db.bankQuestion.findUnique({ where: { id } });
    if (!question) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (question.teacherId !== teacher.id && (user.role as string) !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.bankQuestion.delete({ where: { id } });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    console.error('DELETE /api/teacher/question-bank/[id] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
