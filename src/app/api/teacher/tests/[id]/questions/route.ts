import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// PUT /api/teacher/tests/[id]/questions — savollarni yangilash
export async function PUT(
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
    const body = await request.json();
    const { questions } = body;

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: 'Questions array required' }, { status: 400 });
    }

    // Find test and verify ownership
    const test = await db.test.findUnique({
      where: { id },
      include: { teacher: true },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    if (role !== 'ADMIN' && test.teacher?.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete existing questions and recreate
    await db.question.deleteMany({ where: { testId: id } });

    // Create new questions
    await db.question.createMany({
      data: questions.map((q: any, index: number) => ({
        testId: id,
        text: q.text,
        images: q.images || [],
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        type: q.type || 'MULTIPLE_CHOICE',
        explanation: q.explanation || null,
        explanationImages: q.explanationImages || [],
        videoUrl: q.videoUrl || null,
        points: q.points || 1,
        order: q.order !== undefined ? q.order : index,
      })),
    });

    // Update question count
    await db.test.update({
      where: { id },
      data: { questionCount: questions.length },
    });

    return NextResponse.json({ message: 'Questions updated', count: questions.length });
  } catch (error) {
    console.error('PUT /api/teacher/tests/[id]/questions error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
