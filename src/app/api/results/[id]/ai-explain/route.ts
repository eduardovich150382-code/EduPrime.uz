import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { streamExplainQuestion } from '@/lib/gemini';
import { hasActiveSubscription } from '@/lib/access';
import { consumeTutorMessage, isSolutionUnlocked } from '@/lib/quota';
import { resolveSolutionVisibility } from '@/lib/solution-visibility';
import { parseFillBlankAnswer } from '@/lib/fill-blank';
import { parseMatchingAnswer, parseMatchingPairs } from '@/lib/matching';

type OptionShape = { label: string; text: string };

/**
 * Talabaning saqlangan (allaqachon canonical/unshuffled — grading.ts)
 * javobini AI promptiga qo'yish uchun inson o'qiy oladigan matnga
 * aylantiradi. Savol turiga qarab format butunlay boshqacha (MATCHING/
 * FILL_BLANK) — lib/matching.ts va lib/fill-blank.ts dagi mavjud parse
 * funksiyalaridan foydalanadi, ularga tegilmagan.
 */
function describeUserAnswer(type: string, rawOptions: unknown, rawAnswer: string): string {
  if (!rawAnswer.trim()) return '';

  if (type === 'MULTIPLE_CHOICE' || type === 'TRUE_FALSE') {
    const options = Array.isArray(rawOptions) ? (rawOptions as OptionShape[]) : [];
    const opt = options.find((o) => o?.label === rawAnswer);
    return opt ? `${opt.label}) ${opt.text}` : rawAnswer;
  }

  if (type === 'MULTI_SELECT') {
    const options = Array.isArray(rawOptions) ? (rawOptions as OptionShape[]) : [];
    return rawAnswer
      .split(',')
      .filter(Boolean)
      .map((label) => {
        const opt = options.find((o) => o?.label === label);
        return opt ? `${opt.label}) ${opt.text}` : label;
      })
      .join('; ');
  }

  if (type === 'FILL_BLANK') {
    return parseFillBlankAnswer(rawAnswer).filter(Boolean).join(', ');
  }

  if (type === 'MATCHING') {
    const pairs = parseMatchingPairs(rawOptions);
    // grading.ts talaba javobini saqlashdan OLDIN canonical indekslarga
    // o'giradi (`translateMatchingToCanonical`) — shu yerda qayta shuffle
    // hisoblash shart emas, saqlangan qiymat allaqachon canonical.
    const canonical = parseMatchingAnswer(rawAnswer);
    return canonical
      .map((rightIdx, leftIdx) => {
        if (rightIdx === null || !pairs.left[leftIdx]) return null;
        return `${pairs.left[leftIdx]} → ${pairs.right[rightIdx] ?? '?'}`;
      })
      .filter((x): x is string => !!x)
      .join('; ');
  }

  // OPEN_ENDED va boshqa (kelajakdagi) turlar — matn xuddi shunday
  return rawAnswer;
}

/** Prisma unique-constraint xatosini `.code` orqali aniqlaydi (lib/quota.ts#isUniqueConstraintError bilan bir xil naqsh). */
function isUniqueConstraintError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'P2002';
}

interface RawSolutionItem {
  text: string;
  options: unknown;
  correctAnswer: string;
  type: string;
  explanation: string | null;
  explanationImages: string[];
  videoUrl: string | null;
}

// POST /api/results/[id]/ai-explain — AI yordamida bitta savolni, talabaning
// O'Z javobiga qaratilgan holda, sodda tilda tushuntirish.
//
// S19 — AI mualliflik kontentining o'rnini bosmaydi, uning bo'shlig'ini
// to'ldiradi: `solutionKind === 'none'` (mualliflik yozma/video yechimi
// YO'Q) bo'lgandagina chaqiriladi. `written`/`video` turlarida — hatto
// ochilgan bo'lsa ham — AI umuman chaqirilmaydi, chunki yechim allaqachon
// boshqa (mualliflik) manbadan ko'rsatiladi (qarang pastdagi tekshiruv).
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
    // 64 — cuid (25) va gen_random_uuid()::text (36) formatlariga yetadi
    // (bu chegara /api/sessions/[id]/submit va /api/tests/[id]/submit bilan
    // izchil bo'lsin).
    const questionId = typeof b.questionId === 'string' ? b.questionId.trim().slice(0, 64) : '';

    if (!questionId) {
      return NextResponse.json({ error: 'questionId required' }, { status: 400 });
    }

    const userId = session.user.id;
    const role = (session.user as any).role;
    const lang = ((session.user as any).lang as string) || 'uz';

    const result = await db.testResult.findUnique({
      where: { id },
      select: { userId: true, testId: true, sessionId: true, answers: true },
    });

    if (!result) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    // Bu marshrut correctAnswer'ni (tushuntirish orqali) ochib beradi —
    // faqat shu urinishni bajargan (yoki admin) foydalanishi mumkin, aks
    // holda paywall'ni chetlab o'tish / javob-kaliti oracle'ga aylanadi.
    if (result.userId !== userId && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // GET /api/results/[id] dagi NAQSHNI takrorlaymiz: natija Test orqali
    // (testId → Question) yoki TestSession orqali (sessionId → Item)
    // kelgan bo'lishi mumkin — konstruktor va DTM Online endi TestSession
    // ustida, shuning uchun faqat Question'ni tekshirish bugungi
    // natijalarning ko'pchiligida AI tushuntirishni butunlay o'chirib
    // qo'yardi (S19 — kritik nuqson #1).
    let raw: RawSolutionItem | null = null;
    // Kesh (`ItemExplanation`) kaliti HAR DOIM Item.id — FK talab qiladi.
    // Test tarmog'idan kelgan eski `Question` hali Item'ga ko'chirilmagan
    // bo'lsa, `null` qoladi va javob chaqiriladi, lekin KESHLANMAYDI.
    let cacheItemId: string | null = null;
    let belongsToResult = false;
    const isTestNetwork = !!result.testId;

    if (isTestNetwork) {
      const question = await db.question.findUnique({
        where: { id: questionId },
        select: {
          testId: true, text: true, options: true, correctAnswer: true, type: true,
          explanation: true, explanationImages: true, videoUrl: true,
        },
      });
      belongsToResult = !!question && question.testId === result.testId;
      if (question) {
        raw = question;
        const item = await db.item.findUnique({
          where: { legacyQuestionId: questionId },
          select: { id: true },
        });
        cacheItemId = item?.id ?? null;
      }
    } else if (result.sessionId) {
      const testSession = await db.testSession.findUnique({
        where: { id: result.sessionId },
        select: { itemIds: true },
      });
      belongsToResult = !!testSession && testSession.itemIds.includes(questionId);
      if (belongsToResult) {
        const item = await db.item.findUnique({
          where: { id: questionId },
          select: {
            text: true, options: true, correctAnswer: true, type: true,
            explanation: true, explanationImages: true, videoUrl: true,
          },
        });
        if (item) {
          raw = item;
          cacheItemId = questionId; // sessiya tarmog'ida questionId allaqachon Item.id
        }
      }
    }

    if (!belongsToResult || !raw) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // `SolutionUnlock.itemId` HAR DOIM Item.id (lib/quota.ts#resolveUnlockKey
    // bilan bir xil normallashtirish) — test tarmog'ida yuqorida topilgan
    // `cacheItemId` xuddi shu qiymat, shuning uchun qayta so'rov shart emas.
    const unlockKey = isTestNetwork ? (cacheItemId ?? questionId) : questionId;

    const { premium, teacher } = await hasActiveSubscription(userId);
    const writtenUnlocked =
      role === 'ADMIN' || premium || teacher || (await isSolutionUnlocked(userId, unlockKey));
    const videoUnlocked = role === 'ADMIN' || premium;

    const visibility = resolveSolutionVisibility({
      explanation: raw.explanation,
      explanationImages: raw.explanationImages,
      videoUrl: raw.videoUrl,
      writtenUnlocked,
      videoUnlocked,
    });

    // Mualliflik yechimi (yozma yoki video) BOR — AI kerak emas, u faqat
    // mualliflik kontenti YO'Q joyni to'ldiradi (S19 qabul mezoni: "Mualliflik
    // yechimi bor savolda AI CHAQIRILMASLIGI"). Ochilmagan bo'lsa hozirgi
    // qulf xabari saqlanadi; ochilgan bo'lsa ham AI baribir chaqirilmaydi —
    // talaba yechimni boshqa (mualliflik) manbadan allaqachon ko'ra oladi.
    if (visibility.solutionKind === 'written' || visibility.solutionKind === 'video') {
      if (!visibility.unlocked) {
        return NextResponse.json(
          { error: 'Avval yechimni oching', code: 'SOLUTION_LOCKED' },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: 'Bu savolda mualliflik yechimi mavjud — AI tushuntirish kerak emas', code: 'AI_NOT_APPLICABLE' },
        { status: 400 }
      );
    }

    // Talabaning shu savolga bergan javobi — `TestResult.answers` submit
    // paytida (grading.ts) HAR BIR savol uchun yozilgan (skip qilingan
    // bo'lsa ham `answer: ''`), shuning uchun bu yerda qayta hisoblash
    // shart emas, faqat o'qiladi.
    const answers = (result.answers as { questionId: string; answer: string; isCorrect: boolean }[] | null) ?? [];
    const answerRecord = answers.find((a) => a.questionId === questionId);
    const rawUserAnswer = answerRecord?.answer ?? '';
    const answeredCorrectly = answerRecord?.isCorrect ?? false;

    // Kesh kaliti — forAnswer: talaba tanlagan (noto'g'ri) javob; to'g'ri
    // javob YOKI javob berilmagan (o'tkazib yuborilgan) holat uchun `null`.
    // Shu sababli bir xil savolga har xil noto'g'ri javob bergan ikki
    // talaba har xil tushuntirish oladi (S19 qabul mezoni).
    const forAnswer = rawUserAnswer.trim() && !answeredCorrectly ? rawUserAnswer.trim().slice(0, 300) : null;

    if (cacheItemId) {
      // `findUnique` bu yerda ishlatilmaydi — Prisma 6'da nullable ustunli
      // compound unique kalitning generatsiya qilingan turi `null`ni qabul
      // qilmaydi (kalit DB darajasida bor, faqat TS turi cheklangan),
      // shuning uchun oddiy `findFirst` bilan qidiramiz.
      const cached = await db.itemExplanation.findFirst({
        where: { itemId: cacheItemId, lang, forAnswer },
      });
      if (cached) {
        return NextResponse.json({ explanation: cached.text, cached: true });
      }
    }

    if (role !== 'ADMIN') {
      const quota = await consumeTutorMessage(userId);
      if (!quota.allowed) {
        return NextResponse.json(
          {
            error: `Kunlik bepul AI tushuntirish limiti (${quota.limit} ta) tugadi. Premium tarifda cheksiz foydalanishingiz mumkin.`,
            code: 'AI_QUOTA_EXCEEDED',
          },
          { status: 429 }
        );
      }
    }

    const mcOptionTypes = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'MULTI_SELECT'];
    const mcOptions = mcOptionTypes.includes(raw.type) && Array.isArray(raw.options)
      ? (raw.options as OptionShape[])
      : [];

    const chunks = streamExplainQuestion({
      questionText: raw.text,
      options: mcOptions,
      correctAnswer: raw.correctAnswer,
      type: raw.type,
      lang,
      userAnswer: describeUserAnswer(raw.type, raw.options, rawUserAnswer),
      answeredCorrectly,
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
          // Faqat Item'ga ko'chirilgan savollarda keshlanadi
          // (ItemExplanation.itemId FK talab qiladi) — qarang yuqoridagi
          // `cacheItemId` izohi.
          if (fullText.trim() && cacheItemId) {
            try {
              await db.itemExplanation.create({
                data: { itemId: cacheItemId, lang, forAnswer, text: fullText.trim() },
              });
            } catch (err) {
              // Poyga sharti: parallel so'rov xuddi shu (itemId, lang,
              // forAnswer) bilan kesh yozuvini allaqachon yaratgan —
              // zararsiz, chunki bu javob talabaga baribir stream qilib
              // yuborilgan.
              if (!isUniqueConstraintError(err)) {
                console.error('ItemExplanation cache write error:', err);
              }
            }
          }
          controller.close();
        } catch (err) {
          // Model chaqiruvi (kvota, tarmoq, noto'g'ri API kalit va h.k.)
          // muvaffaqiyatsiz bo'lsa — foydalanuvchi jimgina bo'sh javob
          // ko'rmasin, controller.error() orqali oqim xato bilan yopiladi
          // (frontend buni tutib aniq xabar ko'rsatadi), server jurnaliga
          // esa TO'LIQ xato (stack bilan) yoziladi.
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
