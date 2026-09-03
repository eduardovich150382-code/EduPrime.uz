import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { sanitizeText, sanitizeInt } from '@/lib/sanitize';
import { gradeSubmission } from '@/lib/grading';
import { loadSessionItems, sessionPreserveOrder } from '@/lib/sessions';
import { loadPracticeBlockAccess } from '@/lib/lesson-access';

// POST /api/lesson-blocks/[id]/practice/check — PRACTICE blokidagi BITTA
// savolni darhol baholaydi. `/api/sessions/[id]/submit`dagi bilan AYNAN bir
// xil baholash chaqiruvi (lib/grading.ts — o'zgartirilmagan), faqat farqi:
// TestResult HECH QACHON yozilmaydi va TestSession.submittedAt
// belgilanmaydi — shuning uchun talaba xohlagan tartibda, xohlagancha
// qayta-qayta har bir savolni tekshira oladi va bu hech qanday kunlik
// kvotaga (start/route.ts — countsAgainstQuota: false) kirmaydi.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const access = await loadPracticeBlockAccess(id, user.id, user.role);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const body = await request.json().catch(() => null);
    const b = (body ?? {}) as Record<string, unknown>;
    // 64 — /api/sessions/[id]/submit bilan bir xil chegara (cuid/UUID'ga yetadi)
    const sessionId = typeof b.sessionId === 'string' ? b.sessionId.trim().slice(0, 64) : '';
    const questionId = typeof b.questionId === 'string' ? b.questionId.trim().slice(0, 64) : '';
    const answer = sanitizeText(b.answer, 500);
    const timeSpent = sanitizeInt(b.timeSpent, 0, 86400) || 0;

    if (!sessionId || !questionId) {
      return NextResponse.json({ error: 'sessionId va questionId talab qilinadi' }, { status: 400 });
    }

    const testSession = await db.testSession.findUnique({ where: { id: sessionId } });
    if (!testSession || testSession.userId !== user.id) {
      return NextResponse.json({ error: 'Sessiya topilmadi' }, { status: 404 });
    }
    // Sessiya haqiqatan shu PRACTICE blokining o'zi uchun (start/route.ts
    // orqali) yaratilganini tekshiradi — `onlyItemIds` bilan tanlangan
    // itemIds har doim shu to'plamning ICHIDA (item-picker.ts —
    // buildItemWhere), shuning uchun to'liq qamrov tekshiruvi yetarli.
    const belongsToBlock = testSession.itemIds.every((itemId) => access.block.itemIds.includes(itemId));
    if (!belongsToBlock) {
      return NextResponse.json({ error: 'Sessiya bu blokka tegishli emas' }, { status: 403 });
    }

    const items = await loadSessionItems(testSession.itemIds);
    if (items.length === 0) {
      return NextResponse.json({ error: 'Savollar topilmadi' }, { status: 404 });
    }

    const { answerResults } = await gradeSubmission({
      questions: items,
      answers: [{ questionId, answer, timeSpent }],
      baseSeed: testSession.seed,
      preserveOrder: sessionPreserveOrder(testSession.spec),
    });

    const result = answerResults.find((r) => r.questionId === questionId);
    const item = items.find((it) => it.id === questionId);
    if (!result || !item) {
      return NextResponse.json({ error: 'Savol bu sessiyada topilmadi' }, { status: 400 });
    }

    return NextResponse.json({
      isCorrect: result.isCorrect,
      correctAnswer: result.correctAnswer,
      explanation: item.explanation,
      explanationImages: item.explanationImages,
    });
  } catch (err) {
    console.error('POST /api/lesson-blocks/[id]/practice/check error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
