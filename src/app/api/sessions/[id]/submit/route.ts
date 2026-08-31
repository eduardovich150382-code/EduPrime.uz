import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { sanitizeText, sanitizeInt } from '@/lib/sanitize';
import { gradeSubmission } from '@/lib/grading';
import { extractItemPoints, loadSessionItems } from '@/lib/sessions';
import { refundBuiltTest } from '@/lib/quota';

// POST /api/sessions/[id]/submit — sessiya javoblarini baholaydi va
// TestResult yaratadi. Baholash mantig'i /api/tests/[id]/submit bilan
// AYNAN bir xil (lib/grading.ts) — faqat savol manbai (Item, TestSession
// orqali) va urug' (session.seed, generateSeed(userId, testId) o'rniga)
// farq qiladi.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json().catch(() => null);
    const b = (body ?? {}) as Record<string, unknown>;
    const answers = b.answers;
    // answers: [{questionId: string, answer: string}]

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'answers array required' }, { status: 400 });
    }

    const testSession = await db.testSession.findUnique({ where: { id } });
    if (!testSession) {
      return NextResponse.json({ error: 'Sessiya topilmadi' }, { status: 404 });
    }
    if (testSession.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (testSession.submittedAt) {
      return NextResponse.json({ error: 'Sessiya allaqachon topshirilgan' }, { status: 409 });
    }
    // Sessiya muddati tugagach javob qabul qilinmaydi.
    if (testSession.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Sessiya muddati tugagan' }, { status: 410 });
    }

    const sanitizedAnswers = answers.slice(0, 200).map((a: any) => ({
      // 64 — cuid (25) va gen_random_uuid()::text (36) kabi Item/Question id
      // formatlarining barchasiga yetadi; 30 da UUID id'lar kesilib, javob
      // hech qachon mos kelmay qolgan (natija "javob berilmagan" ko'rsatgan).
      questionId: typeof a.questionId === 'string' ? a.questionId.trim().slice(0, 64) : '',
      answer: sanitizeText(a.answer, 500),
      timeSpent: typeof a.timeSpent === 'number' ? Math.max(0, Math.min(a.timeSpent, 86400)) : 0,
    }));
    const sanitizedTimeSpent = sanitizeInt(b.timeSpent, 0, 86400) || 0; // Max 24 soat

    const items = await loadSessionItems(testSession.itemIds, extractItemPoints(testSession.spec));
    if (items.length === 0) {
      return NextResponse.json({ error: 'Sessiya savollari topilmadi' }, { status: 404 });
    }

    // `session.seed` — GET paytida ishlatilgan XUDDI SHU urug', savol
    // tartibi hech qachon "sinf/bo'lim" tuzilishiga ega emas (spec ichida
    // bunday tushuncha yo'q), shuning uchun preserveOrder har doim false.
    const { answerResults, score, maxScore, percentage } = await gradeSubmission({
      questions: items,
      answers: sanitizedAnswers,
      baseSeed: testSession.seed,
      preserveOrder: false,
    });

    const [result] = await db.$transaction([
      db.testResult.create({
        data: {
          userId: user.id,
          sessionId: testSession.id,
          score,
          maxScore,
          percentage,
          answers: answerResults as unknown as Prisma.InputJsonValue,
          timeSpent: sanitizedTimeSpent,
        },
      }),
      db.testSession.update({
        where: { id: testSession.id },
        data: { submittedAt: new Date() },
      }),
    ]);

    // Kvota qaytarish (S17) — sessiya boshlanganidan 2 daqiqa ICHIDA hech
    // qanday javob bermay "Tugatish" bosilgan (yoki vaqt tugab avtomatik
    // topshirilgan) bo'lsa, bu chinakam abandon hisoblanadi va
    // `consumeBuiltTest` orqali sarflangan kvota qaytariladi. Bu marshrut
    // `submittedAt`/409 tekshiruvi orqali allaqachon bir martalik
    // bajarilishni kafolatlaydi, shuning uchun qo'shimcha idempotentlik
    // himoyasi kerak emas — best-effort: xato bo'lsa ham javob (natija)
    // buzilmasin.
    const anyAnswered = answerResults.some((r) => r.answer.trim() !== '');
    if (!anyAnswered) {
      try {
        await refundBuiltTest(testSession.id);
      } catch (err) {
        console.error('refundBuiltTest error:', err);
      }
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
  } catch (err) {
    console.error('POST /api/sessions/[id]/submit error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
