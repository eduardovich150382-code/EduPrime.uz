import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { consumeSolution, resolveUnlockKey } from '@/lib/quota';
import { resolveSolutionVisibility } from '@/lib/solution-visibility';

// POST /api/results/[id]/unlock-solution — bitta savol yechimini ochadi
// (S17). Kvotani sarflaydi va `SolutionUnlock` yozadi (lib/quota.ts —
// `consumeSolution`); QAYSI savolni ochishni foydalanuvchi O'ZI tanlaydi,
// bu yerda avtomatik/ommaviy ochish yo'q.
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
    const body = await request.json().catch(() => null);
    const b = (body ?? {}) as Record<string, unknown>;
    // 64 — Question.id (cuid, 25) va Item.id (gen_random_uuid()::text, 36)
    // formatlarining ikkalasiga ham yetadi (izchillik uchun qarang
    // /api/results/[id]/ai-explain va /api/sessions/[id]/submit — PR #121
    // dagi 30 belgi kesilishi xatosi shu yerda ham takrorlanmasin).
    const questionId = typeof b.questionId === 'string' ? b.questionId.trim().slice(0, 64) : '';

    if (!questionId) {
      return NextResponse.json({ error: 'questionId required' }, { status: 400 });
    }

    const userId = session.user.id;
    const role = (session.user as any).role;

    const result = await db.testResult.findUnique({
      where: { id },
      select: { userId: true, testId: true, sessionId: true },
    });

    if (!result) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    // Faqat shu urinishni bajargan (yoki admin) yechim ochishi mumkin —
    // aks holda bu marshrut boshqa foydalanuvchining kvotasidan
    // (yoki natijasidan) ochish uchun ishlatilishi mumkin edi.
    if (result.userId !== userId && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // `questionId` shu natijaning savollariga tegishli ekanini
    // tasdiqlaymiz — aks holda foydalanuvchi o'ziga tegishli (ixtiyoriy)
    // natija orqali BOSHQA joydagi pullik yechimni ochtirib olishi mumkin
    // edi (ai-explain'dagi bir xil himoya naqshi).
    let belongsToResult = false;
    let raw: { explanation: string | null; explanationImages: string[]; videoUrl: string | null } | null = null;
    const isTestNetwork = !!result.testId;
    if (isTestNetwork) {
      const question = await db.question.findUnique({
        where: { id: questionId },
        select: { testId: true, explanation: true, explanationImages: true, videoUrl: true },
      });
      belongsToResult = !!question && question.testId === result.testId;
      if (question) raw = question;
    } else if (result.sessionId) {
      const testSession = await db.testSession.findUnique({
        where: { id: result.sessionId },
        select: { itemIds: true },
      });
      belongsToResult = !!testSession && testSession.itemIds.includes(questionId);
      if (belongsToResult) {
        raw = await db.item.findUnique({
          where: { id: questionId },
          select: { explanation: true, explanationImages: true, videoUrl: true },
        });
      }
    }

    if (!belongsToResult) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // `SolutionUnlock.itemId` HAR DOIM Item.id — Test tarmog'ida `questionId`
    // hali `Question.id` bo'lgani uchun (lib/quota.ts#resolveUnlockKey)
    // orqali normallashtiriladi, aks holda yozish (bu yerda) va o'qish
    // (GET /api/results/[id]) turli kalitlardan foydalanib, bir-biriga mos
    // kelmay qoladi. Sessiya tarmog'ida `questionId` allaqachon Item.id —
    // normallashtirish shart emas.
    const unlockKey = isTestNetwork ? await resolveUnlockKey(questionId) : questionId;

    // Kvota sarflashdan OLDIN yechim qanday turdaligini aniqlaymiz —
    // savolda yozma yechim umuman bo'lmasa yoki faqat video (Premium)
    // bo'lsa, foydalanuvchi baribir hech narsa ololmaydi, shuning uchun
    // bunday holatlarda `consumeSolution` UMUMAN chaqirilmasin (aks holda
    // kvota bekorga sarflanadi — havzadagi ko'p savolda yozma yechim yo'q,
    // bu odatiy holat).
    const visibility = resolveSolutionVisibility({
      explanation: raw?.explanation ?? null,
      explanationImages: raw?.explanationImages ?? [],
      videoUrl: raw?.videoUrl ?? null,
      writtenUnlocked: true,
      videoUnlocked: false,
    });

    if (visibility.solutionKind === 'none') {
      return NextResponse.json({ error: 'Bu savol uchun yechim mavjud emas', code: 'NO_SOLUTION' }, { status: 404 });
    }
    if (visibility.solutionKind === 'video') {
      return NextResponse.json(
        { error: "Bu savol uchun faqat video yechim mavjud — uni ochish uchun Premium kerak", code: 'VIDEO_ONLY' },
        { status: 403 }
      );
    }

    const quota = await consumeSolution(userId, unlockKey);

    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: `Kunlik bepul yechim limiti (${quota.limit} ta) tugadi.`,
          code: 'SOLUTION_QUOTA_EXCEEDED',
          usedToday: quota.usedToday,
          limit: quota.limit,
        },
        { status: 429 }
      );
    }

    // Frontend darhol ko'rsata olishi uchun ochilgan yozma yechimning o'zini
    // ham qaytaramiz (aks holda butun natijani qayta so'rash kerak bo'lardi).
    return NextResponse.json({
      unlocked: true,
      alreadyUnlocked: quota.alreadyUnlocked,
      usedToday: quota.usedToday,
      limit: quota.limit,
      explanation: visibility.explanation,
      explanationImages: visibility.explanationImages,
    });
  } catch (error) {
    console.error('POST /api/results/[id]/unlock-solution error:', error);
    return NextResponse.json({ error: "Yechimni ochishda xatolik yuz berdi" }, { status: 500 });
  }
}
