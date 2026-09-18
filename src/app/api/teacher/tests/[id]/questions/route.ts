import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { findDuplicateQuestions } from '@/lib/duplicate-questions';

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

    const role = session.user?.role;
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

    // Bir xil matnli savollar kelganini YOZIB QO'YAMIZ, lekin so'rovni
    // bloklamaymiz: ustoz ataylab o'xshash savol yozgan bo'lishi mumkin va
    // klientda bu haqda allaqachon ogohlantirish bor. Egalik tekshiruvidan
    // KEYIN turadi — begona testId bilan logni to'ldirib bo'lmasin.
    //
    // Nega kerak: bir ustozning 31 talik importi saqlangandan keyin 62 savolga
    // aylangan, sababi esa kod bo'yicha izohlanmadi. Keyingi safar shu yozuv
    // qaysi ekrandan (`source`) qanday ro'yxat kelganini darrov aytadi.
    const incoming = questions as Array<Record<string, unknown> | null>;
    const duplicates = findDuplicateQuestions(
      incoming.map((q) => ({ text: typeof q?.text === 'string' ? q.text : '' })),
    );
    if (duplicates.length > 0) {
      logger.warn('Test savollarida takroriy matn', {
        testId: id,
        source: typeof body.source === 'string' ? body.source : 'unknown',
        total: questions.length,
        groups: duplicates.length,
        extras: duplicates.reduce((n, g) => n + g.indexes.length - 1, 0),
        // `id` li nusxalar soni — update/create nisbatini ko'rsatadi
        withId: incoming.filter((q) => typeof q?.id === 'string').length,
        samples: duplicates.slice(0, 3).map((g) => ({ indexes: g.indexes, preview: g.key.slice(0, 80) })),
        report: true,
      });
    }

    // Update in place instead of delete+recreate: recreating every question on
    // every save assigns brand-new IDs, which orphans past TestResult.answers
    // (they reference the old questionId) and makes "correct answer" display
    // inconsistent for anyone who already took the test. Existing questions
    // keep their id; only questions the teacher actually removed are deleted.
    const existingQuestions = await db.question.findMany({
      where: { testId: id },
      select: { id: true },
    });
    const existingIds = new Set(existingQuestions.map((q) => q.id));
    const incomingIds = questions
      .map((q: any) => q.id)
      .filter((qid: any) => typeof qid === 'string' && existingIds.has(qid));

    await db.$transaction([
      db.question.deleteMany({
        where: { testId: id, id: { notIn: incomingIds.length ? incomingIds : ['__none__'] } },
      }),
      ...questions.map((q: any, index: number) => {
        const data = {
          text: q.text,
          images: q.images || [],
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          type: q.type || 'MULTIPLE_CHOICE',
          explanation: q.explanation || null,
          explanationImages: q.explanationImages || [],
          videoUrl: q.videoUrl || null,
          topic: q.topic || null,
          bloomLevel: q.bloomLevel || null,
          difficulty: Number.isInteger(q.difficulty) && q.difficulty >= 1 && q.difficulty <= 5 ? q.difficulty : null,
          points: q.points || 1,
          order: index,
        };
        if (q.id && existingIds.has(q.id)) {
          return db.question.update({ where: { id: q.id }, data });
        }
        return db.question.create({ data: { testId: id, ...data } });
      }),
    ]);

    // Update question count
    await db.test.update({
      where: { id },
      data: { questionCount: questions.length },
    });

    return NextResponse.json({ message: 'Questions updated', count: questions.length });
  } catch (error) {
    logger.error('PUT /api/teacher/tests/[id]/questions error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
