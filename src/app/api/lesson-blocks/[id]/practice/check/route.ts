import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { sanitizeText, sanitizeInt } from '@/lib/sanitize';
import { loadPracticeBlockAccess } from '@/lib/lesson-access';
import { checkPracticeAnswer } from '@/lib/practice-answer-check';
import { logger } from '@/lib/logger';

// POST /api/lesson-blocks/[id]/practice/check — PRACTICE blokidagi BITTA
// savolni darhol baholaydi. Baholashning o'zi (gradeSubmission chaqiruvi,
// S17 paywall, S20a distractorWhy) `lib/practice-answer-check.ts`da —
// video nazorat nuqtalari (S23, `/api/video-checkpoints/[kind]/[id]/check`)
// bilan BIR XIL yo'l, ikkinchi marta yozilmagan. Bu marshrutda faqat
// "PRACTICE blokiga kirish huquqi bormi" tekshiruvi (loadPracticeBlockAccess)
// qoladi.
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

    const outcome = await checkPracticeAnswer({
      userId: user.id,
      role: user.role,
      sessionId,
      questionId,
      answer,
      timeSpent,
      poolItemIds: access.block.itemIds,
    });
    if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: outcome.status });

    return NextResponse.json(outcome.result);
  } catch (err) {
    logger.error('POST /api/lesson-blocks/[id]/practice/check error:', { error: err });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
