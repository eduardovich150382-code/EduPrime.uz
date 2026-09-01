import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { extractItemPoints, loadSessionItems } from '@/lib/sessions';
import { hasActiveSubscription } from '@/lib/access';
import { getSolutionQuotaStatus, getUnlockedItemIds, resolveUnlockKeys } from '@/lib/quota';
import { resolveSolutionVisibility, type RawSolutionData } from '@/lib/solution-visibility';
import { getDistractorWhy, toLang } from '@/lib/paramgen/regenerate';

// GET /api/results/[id] — bitta natijani to'liq olish (savollar bilan).
// Natija Test orqali (testId) yoki TestSession orqali (sessionId) kelgan
// bo'lishi mumkin — ikkalasi ham natija sahifasi kutayotgan bir xil
// `result.test.{...}` shaklida qaytariladi, shuning uchun frontend
// (results/[id]/page.tsx) o'zgarishsiz ishlayveradi.
//
// S17 — yechim darajalari: `explanation`/`explanationImages`/`videoUrl`
// ochilmagan bo'lsa API javobida UMUMAN bo'lmaydi (frontendda yashirish
// yetarli emas — pullik mahsulot). Qulf HAR IKKALA tarmoqqa (Test va
// sessiya) bir xil (`resolveSolutionVisibility`) qo'llanadi — bittasi
// ochiq qolsa paywall ma'nosiz (CLAUDE.md — "Paywall").
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const result = await db.testResult.findUnique({
      where: { id },
      include: {
        test: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                text: true,
                images: true,
                options: true,
                correctAnswer: true,
                explanation: true,
                explanationImages: true,
                videoUrl: true,
                points: true,
                order: true,
                type: true,
                // S20a — distraktor izohi (`why`) bazaga yozilmagan, faqat
                // shu uch maydon orqali qayta hisoblanadi (qarang pastdagi
                // `attachDistractorWhy`).
                templateId: true,
                variantSig: true,
                lang: true,
              },
            },
            subject: { select: { nameUz: true, nameRu: true, nameEn: true } },
          },
        },
        session: true,
      },
    });

    if (!result) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    // Faqat o'z natijasini yoki admin ko'ra oladi
    const userId = result.userId;
    const role = (session.user as any)?.role;
    if (result.userId !== session.user.id && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { premium, teacher } = await hasActiveSubscription(userId);
    const writtenUnlimited = role === 'ADMIN' || premium || teacher;
    const videoUnlocked = role === 'ADMIN' || premium;
    const solutionQuota = await getSolutionQuotaStatus(userId);

    // S20a — distraktor izohi har doim bepul (S17 dagi "bir qatorli sabab"
    // darajasi, yechim qulfiga kirmaydi), shuning uchun yuqoridagi
    // writtenUnlimited/videoUnlocked hisobiga bog'liq emas.
    const answers = (result.answers as { questionId: string; answer: string; isCorrect: boolean }[] | null) ?? [];

    if (result.test) {
      // `SolutionUnlock.itemId` yozishda `unlock-solution` marshruti
      // `Question.id`ni Item.id'ga normallashtiradi (lib/quota.ts —
      // resolveUnlockKey) — o'qishda ham AYNAN shu normallashtirish
      // qo'llanmasa, savol ochilgan bo'lsa ham bu yerda "yopiq" ko'rinib
      // qoladi (yozish/o'qish kalitlari mos kelmaydi).
      const questionIds = result.test.questions.map((q) => q.id);
      const unlockKeyMap = writtenUnlimited ? new Map<string, string>() : await resolveUnlockKeys(questionIds);
      const unlockedIds = writtenUnlimited
        ? null
        : await getUnlockedItemIds(userId, Array.from(new Set(unlockKeyMap.values())));

      return NextResponse.json({
        result: {
          ...result,
          test: {
            ...result.test,
            questions: result.test.questions.map((q) =>
              attachDistractorWhy(
                applySolutionVisibility(q, {
                  writtenUnlocked: writtenUnlimited || (unlockedIds?.has(unlockKeyMap.get(q.id) ?? q.id) ?? false),
                  videoUnlocked,
                }),
                answers
              )
            ),
          },
        },
        solutionQuota,
      });
    }

    // Sessiya orqali topshirilgan natijada haqiqiy Test qatori yo'q —
    // itemIds'dan xuddi shu shakldagi sintetik "test" obyekti quramiz.
    if (!result.session) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    const items = await loadSessionItems(result.session.itemIds, extractItemPoints(result.session.spec));
    const distinctSubjects = new Set(items.map((it) => it.subject.nameUz));
    const subject = distinctSubjects.size === 1
      ? items[0]?.subject
      : { nameUz: 'Turli fanlar', nameRu: 'Разные предметы', nameEn: 'Various subjects' };

    const unlockedIds = writtenUnlimited
      ? null
      : await getUnlockedItemIds(userId, items.map((it) => it.id));

    return NextResponse.json({
      result: {
        ...result,
        test: {
          id: result.session.id,
          titleUz: result.session.title,
          titleRu: null,
          titleEn: null,
          videoSolution: null,
          writtenSolution: null,
          duration: result.session.durationMin,
          questionCount: items.length,
          questions: items.map((it, order) =>
            attachDistractorWhy(
              applySolutionVisibility(
                {
                  id: it.id,
                  text: it.text,
                  images: it.images,
                  options: it.options,
                  correctAnswer: it.correctAnswer,
                  explanation: it.explanation,
                  explanationImages: it.explanationImages,
                  videoUrl: it.videoUrl,
                  points: it.points,
                  order,
                  type: it.type,
                  templateId: it.templateId,
                  variantSig: it.variantSig,
                  lang: it.lang,
                },
                {
                  writtenUnlocked: writtenUnlimited || (unlockedIds?.has(it.id) ?? false),
                  videoUnlocked,
                }
              ),
              answers
            )
          ),
          subject: subject ?? { nameUz: 'Turli fanlar', nameRu: 'Разные предметы', nameEn: 'Various subjects' },
        },
      },
      solutionQuota,
    });
  } catch (error) {
    console.error('GET /api/results/[id] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** `explanation`/`explanationImages`/`videoUrl`ni qulf holatiga qarab almashtiradi, qolgan maydonlarga tegmaydi. */
function applySolutionVisibility<T extends RawSolutionData>(
  question: T,
  opts: { writtenUnlocked: boolean; videoUnlocked: boolean }
): T & { solutionKind: 'none' | 'video' | 'written'; solutionUnlocked: boolean } {
  const visibility = resolveSolutionVisibility({
    explanation: question.explanation,
    explanationImages: question.explanationImages,
    videoUrl: question.videoUrl,
    writtenUnlocked: opts.writtenUnlocked,
    videoUnlocked: opts.videoUnlocked,
  });
  return {
    ...question,
    explanation: visibility.explanation,
    explanationImages: visibility.explanationImages,
    videoUrl: visibility.videoUrl,
    solutionKind: visibility.solutionKind,
    solutionUnlocked: visibility.unlocked,
  };
}

/**
 * S20a — foydalanuvchi tanlagan (noto'g'ri) variantning "nega xato" izohini
 * qo'shadi. Faqat parametrik savolda (`templateId`+`variantSig` bor) VA
 * foydalanuvchi shu savolga NOTO'G'RI javob bergan bo'lsa hisoblanadi —
 * to'g'ri javob/javobsiz holatda va oddiy (mualliflik) savollarda `null`.
 * Bepul — `applySolutionVisibility`dagi qulfga bog'liq emas (qarang GET
 * funksiyasidagi izoh).
 */
function attachDistractorWhy<
  T extends { id: string; templateId?: string | null; variantSig?: string | null; lang?: string | null }
>(
  question: T,
  answers: { questionId: string; answer: string; isCorrect: boolean }[]
): T & { distractorWhy: string | null } {
  if (!question.templateId || !question.variantSig) {
    return { ...question, distractorWhy: null };
  }
  const record = answers.find((a) => a.questionId === question.id);
  if (!record || !record.answer || record.isCorrect) {
    return { ...question, distractorWhy: null };
  }
  return {
    ...question,
    distractorWhy: getDistractorWhy(question.templateId, question.variantSig, toLang(question.lang), record.answer),
  };
}
