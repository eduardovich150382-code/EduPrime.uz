import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET /api/teacher/tests/[id] — ustoz uchun bitta testni olish (to'g'ri javoblar bilan)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== 'TEACHER' && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const test = await db.test.findUnique({
      where: { id },
      include: {
        subject: true,
        teacher: true,
        questions: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            text: true,
            images: true,
            options: true,
            correctAnswer: true,
            type: true,
            explanation: true,
            explanationImages: true,
            videoUrl: true,
            points: true,
            order: true,
          },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Verify ownership
    if (role !== 'ADMIN' && test.teacher?.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ test });
  } catch (error) {
    console.error('GET /api/teacher/tests/[id] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
