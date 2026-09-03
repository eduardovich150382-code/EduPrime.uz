import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { sanitizeText, sanitizeInt } from '@/lib/sanitize';
import { gradeSubmission } from '@/lib/grading';
import { loadSessionItems, sessionPreserveOrder } from '@/lib/sessions';
import { loadPracticeBlockAccess } from '@/lib/lesson-access';
import { hasActiveSubscription } from '@/lib/access';
import { isSolutionUnlocked } from '@/lib/quota';
import { resolveSolutionVisibility } from '@/lib/solution-visibility';
import { getDistractorWhy, toLang } from '@/lib/paramgen/regenerate';

// POST /api/lesson-blocks/[id]/practice/check — PRACTICE blokidagi BITTA
// savolni darhol baholaydi. `/api/sessions/[id]/submit`dagi bilan AYNAN bir
// xil baholash chaqiruvi (lib/grading.ts — o'zgartirilmagan), faqat farqi:
// TestResult HECH QACHON yozilmaydi va TestSession.submittedAt
// belgilanmaydi — shuning uchun talaba xohlagan tartibda, xohlagancha
// qayta-qayta har bir savolni tekshira oladi va bu hech qanday kunlik
// kvotaga (start/route.ts — countsAgainstQuota: false) kirmaydi.
//
// S17 paywall — `correctAnswer` PRACTICE'ning o'zi ma'nosi bo'lgani uchun
// har doim qaytadi, lekin TO'LIQ yozma yechim (`explanation`) `GET
// /api/results/[id]`dagi bilan AYNAN bir xil qulf (`resolveSolutionVisibility`
// + `SolutionUnlock`) ortida — aks holda mashq bloki S17 pullik yechimni
// bepul chetlab o'tish yo'liga aylanadi. Bepul daraja — S20a distraktor
// `why` izohi (`getDistractorWhy`), parametrik savolda noto'g'ri javob
// uchun har doim ochiq (`results/[id]/route.ts#attachDistractorWhy` bilan
// bir xil qoida).
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

    // `SolutionUnlock.itemId` — PRACTICE har doim Item.id bilan ishlaydi
    // (loadSessionItems), Test tarmog'idagi eski Question.id'dan farqli
    // hech qanday `resolveUnlockKey` normallashtirish shart emas (ai-explain
    // route'dagi sessiya tarmog'i tarmog'i bilan bir xil holat).
    const { premium, teacher } = await hasActiveSubscription(user.id);
    const writtenUnlocked =
      user.role === 'ADMIN' || premium || teacher || (await isSolutionUnlocked(user.id, item.id));
    const visibility = resolveSolutionVisibility({
      explanation: item.explanation,
      explanationImages: item.explanationImages,
      videoUrl: item.videoUrl,
      writtenUnlocked,
      // PRACTICE video yechim ko'rsatmaydi (frontend uni umuman render
      // qilmaydi) — `false` shunchaki videoUrl javobda hech qachon
      // chiqmasligini kafolatlaydi; video mavjud bo'lsa yozma yechim
      // baribir (resolveSolutionVisibility qoidasi bo'yicha) yashiriladi.
      videoUnlocked: false,
    });

    // S20a — bepul daraja: parametrik savolda, javob NOTO'G'RI bo'lsa,
    // tanlangan chalg'ituvchining "nega xato" izohi. S17 qulfiga bog'liq
    // emas (results/[id]/route.ts#attachDistractorWhy bilan bir xil qoida).
    const distractorWhy =
      !result.isCorrect && result.answer && item.templateId && item.variantSig
        ? getDistractorWhy(item.templateId, item.variantSig, toLang(item.lang), result.answer)
        : null;

    return NextResponse.json({
      isCorrect: result.isCorrect,
      correctAnswer: result.correctAnswer,
      explanation: visibility.explanation,
      explanationImages: visibility.explanationImages,
      distractorWhy,
    });
  } catch (err) {
    console.error('POST /api/lesson-blocks/[id]/practice/check error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
