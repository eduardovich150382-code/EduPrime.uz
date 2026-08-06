import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireTeacher } from '@/lib/api-auth';

interface AnswerRecord {
  questionId: string;
  answer: string;
  isCorrect: boolean;
  timeSpent?: number;
}

// GET /api/teacher/tests/[id]/analytics — savol darajasidagi tahlil.
// TestResult.answers JSON'ida allaqachon saqlangan ma'lumotdan on-the-fly
// agregatsiya qiladi — alohida statistika jadvali yoki backfill kerak emas.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireTeacher();
    if (error) return error;

    const { id } = await params;

    const test = await db.test.findUnique({
      where: { id },
      include: { teacher: true },
    });
    if (!test) return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    if ((user.role as string) !== 'ADMIN' && test.teacher?.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [questions, results] = await Promise.all([
      db.question.findMany({
        where: { testId: id },
        orderBy: { order: 'asc' },
        select: { id: true, text: true, order: true, points: true, topic: true, bloomLevel: true, type: true },
      }),
      db.testResult.findMany({
        where: { testId: id },
        select: { answers: true, percentage: true },
      }),
    ]);

    const stats = new Map<string, { attempts: number; correct: number; totalTime: number; skipped: number }>();
    for (const q of questions) stats.set(q.id, { attempts: 0, correct: 0, totalTime: 0, skipped: 0 });

    for (const result of results) {
      const answers = (result.answers as unknown as AnswerRecord[]) || [];
      for (const a of answers) {
        const entry = stats.get(a.questionId);
        if (!entry) continue;
        if (!a.answer) {
          entry.skipped += 1;
          continue;
        }
        entry.attempts += 1;
        if (a.isCorrect) entry.correct += 1;
        entry.totalTime += a.timeSpent || 0;
      }
    }

    const questionStats = questions.map((q) => {
      const s = stats.get(q.id)!;
      return {
        questionId: q.id,
        text: q.text,
        order: q.order,
        topic: q.topic,
        bloomLevel: q.bloomLevel,
        type: q.type,
        attempts: s.attempts,
        skipped: s.skipped,
        correctRate: s.attempts > 0 ? Math.round((s.correct / s.attempts) * 100) : null,
        avgTimeSpent: s.attempts > 0 ? Math.round(s.totalTime / s.attempts) : 0,
      };
    });

    const avgPercentage = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length)
      : 0;

    return NextResponse.json({
      totalAttempts: results.length,
      avgPercentage,
      questions: questionStats,
    });
  } catch (error) {
    console.error('GET /api/teacher/tests/[id]/analytics error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
