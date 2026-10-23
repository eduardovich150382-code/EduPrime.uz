import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { planQuestionOrder, shuffleTest } from '@/lib/shuffle';
import { getQuestionSection, groupBySection } from '@/lib/question-sections';
import { checkTestAccess } from '@/lib/access';
import { resolveTestVisibility } from '@/lib/test-visibility';
import { logger } from '@/lib/logger';

// GET /api/tests/[id] — bitta testni olish
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const test = await db.test.findUnique({
      where: { id },
      // Paywall: yozma va video yechim — pullik mahsulot, yechish sahifasiga
      // kerak emas. Ular natija sahifasida, obuna tekshiruvidan keyin beriladi.
      omit: { writtenSolution: true, videoSolution: true },
      include: {
        subject: true,
        teacher: {
          include: { user: { select: { name: true } } },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    const session = await auth();
    const userId = session?.user?.id;

    // Qoralama mavjudligini ham oshkor qilmaymiz — 403 emas, 404.
    const visible = await resolveTestVisibility(
      { id: test.id, isPublished: test.isPublished, ownerUserIds: [test.teacher?.userId, test.userId] },
      { userId, role: session?.user?.role }
    );
    if (!visible) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Enforce access control server-side — the question content itself is the
    // paid product, so it must never be returned to users without access,
    // regardless of what the client-side check-access call decided.
    if (!test.isFree && test.accessType !== 'free') {
      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized', accessType: test.accessType, price: test.price },
          { status: 401 }
        );
      }

      const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
      const hasAccess = await checkTestAccess(userId, test, user?.role);

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Forbidden', accessType: test.accessType, price: test.price },
          { status: 403 }
        );
      }
    }

    const rawQuestions = await db.question.findMany({
      where: { testId: id },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        text: true,
        images: true,
        options: true,
        type: true,
        points: true,
        order: true,
        subjectId: true, // Faqat generatsiya qilingan (masalan DTM Online) testlarda to'ldirilgan — bo'lim belgisi
        hints: true, // S20a — "Ko'rsatma" tugmasi (yechish sahifasida)
        tags: true, // Faqat bo'lim aniqlash uchun — javobdan olib tashlanadi
        // NOT including correctAnswer — foydalanuvchi ko'rmasligi kerak
      },
    });

    // Attestatsiya: barcha savollarda `section:` tegi bo'lsa, haqiqiy imtihon
    // kabi bo'limlar ketma-ket keladi. Kategoriya faqat teglar to'liq bo'lgandagina
    // so'raladi — boshqa testlarga qo'shimcha so'rov tushmasin.
    let bySection = false;
    if (groupBySection(rawQuestions)) {
      const category = await db.testCategory.findUnique({ where: { id: test.categoryId }, select: { type: true } });
      bySection = category?.type === 'ATTESTATION';
    }

    // Bo'limlarga bo'lingan generatsiya qilingan testlarda (masalan DTM
    // Online) taqdimot tartibi (mutaxassislik 1 → 2 → majburiy fanlar)
    // buzilmasligi kerak — shuning uchun savol tartibi aralashtirilmaydi,
    // faqat variantlar aralashtiriladi.
    const preserveOrder = rawQuestions.some((q) => q.subjectId);

    // S20a — bo'lim-asosidagi (generatsiya qilingan, masalan DTM Online)
    // testlar haqiqiy imtihonni takrorlashi kerak — ko'rsatma UMUMAN
    // yubormaymiz (faqat frontendda tugmani yashirish yetarli emas).
    const questionsWithHints = preserveOrder
      ? rawQuestions.map((q) => ({ ...q, hints: [] as string[] }))
      : rawQuestions;

    // Shuffle questions and options for authenticated users (anti-cheating)
    let shuffled = questionsWithHints;
    if (userId) {
      shuffled = shuffleTest(questionsWithHints, userId, id, { preserveOrder, bySection });
    } else if (bySection) {
      // Kirmagan foydalanuvchida aralashtirish yo'q, lekin bazadagi tartib
      // bo'limlar bo'yicha aralash bo'lishi mumkin — ajratilmasa mijozdagi
      // shufflePresentedQuestions ko'p mayda guruh hosil qilardi.
      shuffled = planQuestionOrder(questionsWithHints, 0, { preserveOrder: true, bySection: true }).map((entry) => entry.question);
    }

    // `tags` aralashtirishdan KEYIN olinadi (bo'limlash unga tayanadi). Bo'limli
    // bo'lmagan testlarda javob avvalgidek — qo'shimcha maydonsiz.
    const questions = shuffled.map(({ tags, ...question }) =>
      bySection ? { ...question, section: getQuestionSection(tags) } : question
    );

    return NextResponse.json({
      test: {
        ...test,
        questions,
      },
    });
  } catch (error) {
    logger.error('GET /api/tests/[id] error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT /api/tests/[id] — testni tahrirlash (owner/admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const test = await db.test.findUnique({
      where: { id },
      include: { teacher: true },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Check permission
    const role = session.user?.role;
    if (role !== 'ADMIN' && test.teacher?.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const VALID_ACCESS_TYPES = ['free', 'subscription', 'premium', 'teacher', 'premium_teacher', 'paid'];
    if (body.accessType !== undefined && !VALID_ACCESS_TYPES.includes(body.accessType)) {
      return NextResponse.json({ error: 'Invalid accessType' }, { status: 400 });
    }

    const updateData: any = {};
    if (body.titleUz !== undefined) updateData.titleUz = body.titleUz;
    if (body.titleRu !== undefined) updateData.titleRu = body.titleRu;
    if (body.titleEn !== undefined) updateData.titleEn = body.titleEn;
    if (body.duration !== undefined) updateData.duration = body.duration;
    if (body.isFree !== undefined) updateData.isFree = body.isFree;
    if (body.price !== undefined) updateData.price = body.price;
    if (body.accessType !== undefined) updateData.accessType = body.accessType;
    if (body.difficulty !== undefined) updateData.difficulty = body.difficulty;
    if (body.isPublished !== undefined) updateData.isPublished = body.isPublished;
    if (body.coverImage !== undefined) updateData.coverImage = body.coverImage;

    const updated = await db.test.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ test: updated });
  } catch (error) {
    logger.error('PUT /api/tests/[id] error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/tests/[id] — testni o'chirish
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const role = session.user?.role;

    const test = await db.test.findUnique({
      where: { id },
      include: { teacher: true },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    if (role !== 'ADMIN' && test.teacher?.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.test.delete({ where: { id } });
    return NextResponse.json({ message: 'Test deleted' });
  } catch (error) {
    logger.error('DELETE /api/tests/[id] error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
