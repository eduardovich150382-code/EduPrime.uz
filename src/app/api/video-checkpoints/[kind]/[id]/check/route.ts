import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { sanitizeText, sanitizeInt } from '@/lib/sanitize';
import { loadLessonVideoCheckpointAccess, loadVideoSolutionCheckpointAccess } from '@/lib/lesson-access';
import { checkPracticeAnswer } from '@/lib/practice-answer-check';

const KINDS = ['lesson', 'block'] as const;
type Kind = (typeof KINDS)[number];

// POST /api/video-checkpoints/[kind]/[id]/check — video nazorat nuqtasidagi
// BITTA savolni darhol baholaydi. `start/route.ts`dagi bilan bir xil kirish
// tekshiruvi (qulflangan dars/blokda checkpoint ham javob bermaydi), baholash
// esa `lib/practice-answer-check.ts` orqali PRACTICE bloki (S22b) bilan
// AYNAN bir xil — TestResult yozilmaydi, kvota sarflanmaydi.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string; id: string }> }
) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { kind, id } = await params;
    if (!KINDS.includes(kind as Kind)) {
      return NextResponse.json({ error: "Noto'g'ri manba turi" }, { status: 400 });
    }

    const access = kind === 'lesson'
      ? await loadLessonVideoCheckpointAccess(id, user.id, user.role)
      : await loadVideoSolutionCheckpointAccess(id, user.id, user.role);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const body = await request.json().catch(() => null);
    const b = (body ?? {}) as Record<string, unknown>;
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
      poolItemIds: access.access.checkpoints.map((c) => c.itemId),
    });
    if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: outcome.status });

    return NextResponse.json(outcome.result);
  } catch (err) {
    console.error('POST /api/video-checkpoints/[kind]/[id]/check error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
