import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { sanitizeText } from '@/lib/sanitize';
import { generateSeed } from '@/lib/shuffle';
import { checkTestAccess, loadFeatureEntitlements } from '@/lib/access';
import { resolveTestVisibility } from '@/lib/test-visibility';
import { testFeatureScope } from '@/lib/feature-context';
import { getUnlockedItemIds, resolveUnlockKeys } from '@/lib/quota';
import { applySolutionVisibility, FULL_SOLUTION_TIERS, resolveSolutionTiers } from '@/lib/solution-visibility';
import { isAdFreeTest } from '@/lib/ad-free-test';
import { attachDistractorWhy } from '@/lib/distractor-why';
import { getOriginalNumbers, getRetakeQuestionIds } from '@/lib/retake-wrong';
import { gradePracticeSubset } from '@/lib/practice-grading';
import { logger } from '@/lib/logger';

const bodySchema = z.object({
  resultId: z.string().min(1).max(64),
  answers: z.array(z.unknown()).max(200),
  // 2-raund ("qolgan xatolar") — mijoz to'plamni qisqartiradi, server esa
  // u natijadagi mashq to'plamidan chiqmasligini tekshiradi.
  questionIds: z.array(z.string().max(64)).max(200).optional(),
});

const answerSchema = z.object({ questionId: z.unknown(), answer: z.unknown(), timeSpent: z.unknown() }).partial();

// POST /api/tests/[id]/practice-check — xatolar ustida mashq javoblarini tekshirish.
//
// Bu MASHQ: hech narsa yozilmaydi (TestResult, Attempt, dars progressi,
// yechim kvotasi). Reyting, statistika, urinishlar tarixi va attestatsiya
// TestResult'ni o'qiydi — mashq ularning birortasiga tushmasligi shu bilan
// kafolatlanadi. Baholash va yechim qulfi esa asosiy yo'llar bilan bir xil:
// submit'dagi `generateSeed` + to'liq savollar ro'yxati, results/[id] dagi
// `resolveSolutionTiers` + `applySolutionVisibility` + `attachDistractorWhy`.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
    const { resultId, questionIds } = parsed.data;

    // submit/route.ts dagi sanitizatsiya bilan bir xil chegaralar.
    const answers = parsed.data.answers.map((raw) => {
      const a = answerSchema.safeParse(raw).data ?? {};
      return {
        questionId: typeof a.questionId === 'string' ? a.questionId.trim().slice(0, 64) : '',
        answer: sanitizeText(a.answer, 500),
        timeSpent: typeof a.timeSpent === 'number' ? Math.max(0, Math.min(a.timeSpent, 86400)) : 0,
      };
    });

    const test = await db.test.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          select: {
            id: true, text: true, images: true, options: true, correctAnswer: true, explanation: true,
            explanationImages: true, videoUrl: true, points: true, order: true, type: true, subjectId: true,
            templateId: true, variantSig: true, lang: true, tags: true,
          },
        },
        teacher: { select: { userId: true } },
      },
    });
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    const visible = await resolveTestVisibility(
      { id: test.id, isPublished: test.isPublished, ownerUserIds: [test.teacher?.userId, test.userId] },
      { userId: user.id, role: user.role }
    );
    if (!visible) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Javob to'g'ri javoblarni o'z ichiga oladi — obuna tugagan bo'lsa
    // mashq orqali ham ochilmaydi (submit bilan bir xil tekshiruv).
    if (!test.isFree && test.accessType !== 'free') {
      const hasAccess = await checkTestAccess(user.id, test, user.role);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden — subscription required' }, { status: 403 });
      }
    }

    const result = await db.testResult.findFirst({
      where: { id: resultId, userId: user.id, testId: id },
      select: { answers: true },
    });
    if (!result) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    const testQuestionIds = test.questions.map((q) => q.id);
    const allowed = getRetakeQuestionIds(result.answers, testQuestionIds);
    const allowedSet = new Set(allowed);
    if (questionIds && questionIds.some((qid) => !allowedSet.has(qid))) {
      return NextResponse.json({ error: 'Invalid questionIds' }, { status: 400 });
    }
    const practiceIds = questionIds ? allowed.filter((qid) => questionIds.includes(qid)) : allowed;

    // GET /api/tests/[id] va submit bilan AYNAN bir urug' va preserveOrder.
    const graded = await gradePracticeSubset({
      questions: test.questions,
      answers,
      baseSeed: generateSeed(user.id, id),
      preserveOrder: test.questions.some((q) => q.subjectId),
      questionIds: practiceIds,
    });

    // Natija sahifasi bilan bir xil: reklama testida yechimlar to'liq ochiq.
    const { writtenUnlimited, videoUnlocked } = await isAdFreeTest(test.id)
      ? FULL_SOLUTION_TIERS
      : resolveSolutionTiers(user.role, await loadFeatureEntitlements(user.id, user.role), testFeatureScope(test));
    const unlockKeyMap = writtenUnlimited ? new Map<string, string>() : await resolveUnlockKeys(practiceIds);
    const unlockedIds = writtenUnlimited
      ? null
      : await getUnlockedItemIds(user.id, Array.from(new Set(unlockKeyMap.values())));

    // Attestatsiyada mashq xaritasi ham bo'limlar bo'yicha guruhlanadi.
    const category = await db.testCategory.findUnique({ where: { id: test.categoryId }, select: { type: true } });
    const numbers = getOriginalNumbers(result.answers, testQuestionIds);
    const practiceSet = new Set(practiceIds);

    return NextResponse.json({
      practice: {
        correct: graded.correct,
        total: graded.total,
        answers: graded.answerResults,
        categoryType: category?.type ?? null,
        questions: test.questions
          .filter((q) => practiceSet.has(q.id))
          .map((q) => ({
            ...attachDistractorWhy(
              applySolutionVisibility(q, {
                writtenUnlocked: writtenUnlimited || (unlockedIds?.has(unlockKeyMap.get(q.id) ?? q.id) ?? false),
                videoUnlocked,
              }),
              graded.answerResults
            ),
            number: numbers.get(q.id) ?? null,
          })),
      },
    });
  } catch (error) {
    logger.error('POST /api/tests/[id]/practice-check error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
