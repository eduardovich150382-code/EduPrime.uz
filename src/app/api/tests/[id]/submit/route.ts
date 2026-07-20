import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { sanitizeText, sanitizeInt } from '@/lib/sanitize';
import { generateSeed, shuffleArray } from '@/lib/shuffle';

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
      timeSpent: typeof a.timeSpent === 'number' ? Math.max(0, Math.min(a.timeSpent, 86400)) : 0,
    }));

    const sanitizedTimeSpent = sanitizeInt(timeSpent, 0, 86400) || 0; // Max 24 hours

    const userId = session.user.id!;

    // Get test with correct answers AND options (needed for unshuffle)
    const test = await db.test.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          select: { id: true, correctAnswer: true, points: true, type: true, options: true },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Recreate the same shuffle order used when serving the test
    const baseSeed = generateSeed(userId, id);
    const shuffledQuestions = shuffleArray(test.questions, baseSeed);

    // Build a map: questionId -> shuffleIndex (position in shuffled array)
    const shuffleIndexMap: Record<string, number> = {};
    shuffledQuestions.forEach((q: any, index: number) => {
      shuffleIndexMap[q.id] = index;
    });

    // Calculate score with unshuffle logic
    let score = 0;
    let maxScore = 0;
    const labels = ['A', 'B', 'C', 'D', 'E'];

    const answerResults = test.questions.map((question) => {
      maxScore += question.points;
      const userAnswer = sanitizedAnswers.find((a: any) => a.questionId === question.id);
      const userAnswerValue = userAnswer?.answer || '';

      let isCorrect = false;

      if (question.type === 'OPEN_ENDED') {
        // For open-ended: case-insensitive comparison (no shuffle involved)
        isCorrect = userAnswerValue.trim().toLowerCase() === (question.correctAnswer || '').trim().toLowerCase();
      } else {
        // For multiple choice: unshuffle the user's answer back to original label
        const options = question.options as any[];
        const shuffleIndex = shuffleIndexMap[question.id];

        if (shuffleIndex !== undefined && options && options.length > 0) {
          // Recreate the same option shuffle
          const optionSeed = baseSeed + shuffleIndex + 1;
          const shuffledOptions = shuffleArray(options, optionSeed);

          // User selected label (e.g., "A") -> find which original option was at that position
          const selectedLabelIndex = labels.indexOf(userAnswerValue);

          if (selectedLabelIndex >= 0 && selectedLabelIndex < shuffledOptions.length) {
            // The original label of the option that ended up at selectedLabelIndex
            const originalLabel = shuffledOptions[selectedLabelIndex].label;
            isCorrect = originalLabel === question.correctAnswer;
          } else {
            // Fallback: direct comparison
            isCorrect = userAnswerValue === question.correctAnswer;
          }
        } else {
          // No shuffle info — direct comparison
          isCorrect = userAnswerValue === question.correctAnswer;
        }
      }

      if (isCorrect) score += question.points;

      return {
        questionId: question.id,
        answer: userAnswerValue,
        isCorrect,
        correctAnswer: question.correctAnswer,
        timeSpent: userAnswer?.timeSpent || 0,
      };
    });

    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    // Save result
    const result = await db.testResult.create({
      data: {
        userId,
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
