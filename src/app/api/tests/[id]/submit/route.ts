import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { sanitizeText, sanitizeInt } from '@/lib/sanitize';
import { generateSeed } from '@/lib/shuffle';
import { checkTestAccess } from '@/lib/access';
import { gradeSubmission } from '@/lib/grading';
import { creditQuizLessonProgress } from '@/lib/course-progress';
import { resolveAttemptCandidates, toAttemptCreateInput } from '@/lib/attempts';

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
      // 64 — cuid (25) va gen_random_uuid()::text (36) kabi Item/Question id
      // formatlarining barchasiga yetadi; 30 da UUID id'lar kesilib, javob
      // hech qachon mos kelmay qolgan (natija "javob berilmagan" ko'rsatgan).
      questionId: typeof a.questionId === 'string' ? a.questionId.trim().slice(0, 64) : '',
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
          select: { id: true, text: true, correctAnswer: true, points: true, type: true, options: true, subjectId: true },
        },
        courseLessons: { select: { id: true } },
      },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Grading returns correctAnswer for every question in the response — this
    // must be blocked for anyone without access, same as the GET endpoint,
    // otherwise POSTing here directly bypasses the paywall entirely.
    if (!test.isFree && test.accessType !== 'free') {
      const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
      const hasAccess = await checkTestAccess(userId, test, user?.role);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden — subscription required' }, { status: 403 });
      }
    }

    // Recreate the same shuffle order used when serving the test — must
    // match GET /api/tests/[id]'s preserveOrder logic exactly, or grading
    // will unshuffle against the wrong option positions.
    const baseSeed = generateSeed(userId, id);
    const preserveOrder = test.questions.some((q) => q.subjectId);

    const { answerResults, score, maxScore, percentage } = await gradeSubmission({
      questions: test.questions,
      answers: sanitizedAnswers,
      baseSeed,
      preserveOrder,
    });

    // S27 — Item topilgan javoblarni Attempt sifatida yozish uchun oldindan
    // hisoblanadi (sof o'qish, tranzaksiyadan TASHQARIDA) — TestResult.create
    // ichida Item mavjudligi o'zgarmaydi, shuning uchun bu xavfsiz.
    const attemptCandidates = await resolveAttemptCandidates(answerResults);

    // Save result — Attempt yozuvi bilan BITTA tranzaksiyada (S27 qabul
    // mezoni): ikkalasi ham baholashning bir qismi, biri muvaffaqiyatsiz
    // bo'lsa ikkalasi ham qaytariladi.
    const result = await db.$transaction(async (tx) => {
      const created = await tx.testResult.create({
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

      if (attemptCandidates.length > 0) {
        await tx.attempt.createMany({
          data: toAttemptCreateInput(attemptCandidates, { userId, testResultId: created.id }),
        });
      }

      return created;
    });

    // Bu test biror kurs darsining QUIZ turi bilan bog'langan bo'lsa —
    // shu dars progressini avtomatik yangilaydi (ketma-ket ochish uchun).
    // Natijani qaytarishga xalaqit bermasligi uchun xatolik yutiladi.
    if (test.courseLessons.length > 0) {
      await Promise.all(
        test.courseLessons.map((cl) => creditQuizLessonProgress(userId, cl.id, percentage).catch(() => {}))
      );
    }

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
