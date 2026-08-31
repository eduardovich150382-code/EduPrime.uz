import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { streamExplainQuestion } from '@/lib/gemini';
import { hasActiveSubscription } from '@/lib/access';
import { tashkentDateKey } from '@/lib/date';
import { isSolutionUnlocked } from '@/lib/quota';
import { resolveSolutionVisibility } from '@/lib/solution-visibility';

const FREE_DAILY_AI_EXPLAIN_LIMIT = 3;

// Non-cached (newly generated) explanations are rate-limited per user/day.
// Stored in SystemSetting (same pattern used elsewhere in this codebase for
// short-lived per-user counters) rather than a new table. Kun chegarasi
// Asia/Tashkent bo'yicha hisoblanadi (lib/date.ts) — UTC bo'yicha
// hisoblansa, soat 05:00 gacha kvota kechagi kunga yozilar edi.
async function checkAndConsumeDailyQuota(userId: string): Promise<boolean> {
  const today = tashkentDateKey();
  const key = `ai_explain_quota_${userId}_${today}`;
  const existing = await db.systemSetting.findUnique({ where: { key } });
  const count = existing ? parseInt(existing.value, 10) || 0 : 0;

  if (count >= FREE_DAILY_AI_EXPLAIN_LIMIT) return false;

  await db.systemSetting.upsert({
    where: { key },
    update: { value: String(count + 1) },
    create: { key, value: '1' },
  });
  return true;
}

// POST /api/results/[id]/ai-explain — AI yordamida bitta savolni sodda tilda tushuntirish
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    // 64 — cuid (25) va gen_random_uuid()::text (36) formatlariga yetadi
    // (bu chegara /api/sessions/[id]/submit va /api/tests/[id]/submit bilan
    // izchil bo'lsin).
    const questionId = typeof body.questionId === 'string' ? body.questionId.trim().slice(0, 64) : '';

    if (!questionId) {
      return NextResponse.json({ error: 'questionId required' }, { status: 400 });
    }

    const userId = session.user.id;
    const role = (session.user as any).role;
    const lang = ((session.user as any).lang as string) || 'uz';

    const result = await db.testResult.findUnique({
      where: { id },
      select: { userId: true, testId: true },
    });

    if (!result) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    // This endpoint exposes correctAnswer (via the explanation) — only the
    // person who actually completed this attempt (or an admin) may use it,
    // otherwise it becomes a paywall-bypass / answer-key oracle.
    if (result.userId !== userId && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const question = await db.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        testId: true,
        text: true,
        options: true,
        correctAnswer: true,
        explanation: true,
        videoUrl: true,
        type: true,
        aiExplanations: true,
      },
    });

    // Question must belong to the same test as this result — prevents probing
    // arbitrary questions via a result the caller happens to own.
    if (!question || question.testId !== result.testId) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // TESHIK: AI tushuntirish yozma yechimning (`question.explanation`)
    // o'rnini bosadi — shuning uchun XUDDI SHU qulfni talab qiladi
    // (GET /api/results/[id] — resolveSolutionVisibility bilan bir xil),
    // aks holda foydalanuvchi "Yechimni ochish"ni chetlab o'tib, shu
    // marshrut orqali bepul to'liq yechim olishi mumkin edi.
    const { premium, teacher } = await hasActiveSubscription(userId);
    const visibility = resolveSolutionVisibility({
      explanation: question.explanation,
      explanationImages: [],
      videoUrl: question.videoUrl,
      writtenUnlocked: role === 'ADMIN' || premium || teacher || (await isSolutionUnlocked(userId, questionId)),
      videoUnlocked: role === 'ADMIN' || premium,
    });
    if (!visibility.unlocked) {
      return NextResponse.json(
        { error: 'Avval yechimni oching', code: 'SOLUTION_LOCKED' },
        { status: 403 }
      );
    }

    const cache = (question.aiExplanations as Record<string, string> | null) || {};
    if (cache[lang]) {
      return NextResponse.json({ explanation: cache[lang], cached: true });
    }

    if (role !== 'ADMIN') {
      if (!premium && !teacher) {
        const allowed = await checkAndConsumeDailyQuota(userId);
        if (!allowed) {
          return NextResponse.json(
            {
              error: `Kunlik bepul AI tushuntirish limiti (${FREE_DAILY_AI_EXPLAIN_LIMIT} ta) tugadi. Premium tarifda cheksiz foydalanishingiz mumkin.`,
              code: 'AI_QUOTA_EXCEEDED',
            },
            { status: 429 }
          );
        }
      }
    }

    const chunks = streamExplainQuestion({
      questionText: question.text,
      options: question.type === 'OPEN_ENDED' ? [] : ((question.options as any[]) || []),
      correctAnswer: question.correctAnswer,
      existingExplanation: question.explanation,
      type: question.type,
      lang,
    });

    // Stream the response to the client as it's generated (instead of
    // waiting for the full text) so the student sees it appear immediately.
    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        let fullText = '';
        try {
          for await (const piece of chunks) {
            fullText += piece;
            controller.enqueue(encoder.encode(piece));
          }
          // Cache per-language once complete so the next student asking
          // about the same question (the overwhelming majority of requests,
          // since content is shared) never hits Gemini again.
          if (fullText.trim()) {
            await db.question.update({
              where: { id: questionId },
              data: { aiExplanations: { ...cache, [lang]: fullText.trim() } },
            });
          }
          controller.close();
        } catch (err) {
          console.error('AI explain stream error:', err);
          controller.error(err);
        }
      },
    });

    return new NextResponse(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    console.error('POST /api/results/[id]/ai-explain error:', error);
    return NextResponse.json({ error: 'AI tushuntirish olishda xatolik yuz berdi' }, { status: 500 });
  }
}
