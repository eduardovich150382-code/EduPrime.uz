import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { sanitizeText, sanitizeInt } from '@/lib/sanitize';

// POST /api/tests/[id]/submit — test javoblarini yuborish va natija olish
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { answers, timeSpent } = body;
    // answers: [{questionId: string, answer: string}]

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'answers array required' }, { status: 400 });
    }

    // Sanitize answers
    const sanitizedAnswers = answers.slice(0, 200).map((a: any) => ({
      questionId: typeof a.questionId === 'string' ? a.questionId.trim().slice(0, 30) : '',
      answer: sanitizeText(a.answer, 500),
    }));

    const sanitizedTimeSpent = sanitizeInt(timeSpent, 0, 86400) || 0; // Max 24 hours

    // Get test with correct answers
    const test = await db.test.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          select: { id: true, correctAnswer: true, points: true, type: true },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Calculate score
    let score = 0;
    let maxScore = 0;
    const answerResults = test.questions.map((question) => {
      maxScore += question.points;
      const userAnswer = sanitizedAnswers.find((a: any) => a.questionId === question.id);

      // For OPEN_ENDED: case-insensitive trimmed comparison
      // For MULTIPLE_CHOICE: exact match
      let isCorrect = false;
      if (question.type === 'OPEN_ENDED') {
        isCorrect = (userAnswer?.answer || '').trim().toLowerCase() === (question.correctAnswer || '').trim().toLowerCase();
      } else {
        isCorrect = userAnswer?.answer === question.correctAnswer;
      }

      if (isCorrect) score += question.points;

      return {
        questionId: question.id,
        answer: userAnswer?.answer || '',
        isCorrect,
        correctAnswer: question.correctAnswer,
        timeSpent: userAnswer?.timeSpent || 0,
      };
    });

    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    // Save result
    const result = await db.testResult.create({
      data: {
        userId: session.user.id!,
        testId: id,
        score,
        maxScore,
        percentage,
        answers: answerResults as any,
        timeSpent: sanitizedTimeSpent,
      },
    });

    return NextResponse.json({
      result: {
        id: result.id,
        score,
        maxScore,
        percentage,
        timeSpent: result.timeSpent,
        answers: answerResults,
      },
    });
  } catch (error) {
    console.error('POST /api/tests/[id]/submit error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
