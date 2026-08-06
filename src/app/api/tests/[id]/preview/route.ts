import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const PREVIEW_QUESTION_COUNT = 3;

// GET /api/tests/[id]/preview — login talab qilmaydigan ommaviy sinov
// (ijtimoiy tarmoqda ulashish uchun). Faqat nashr qilingan testlar uchun
// ishlaydi va to'g'ri javoblarni hech qachon qaytarmaydi.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const test = await db.test.findUnique({
      where: { id },
      select: {
        id: true,
        titleUz: true,
        titleRu: true,
        titleEn: true,
        duration: true,
        difficulty: true,
        questionCount: true,
        coverImage: true,
        isFree: true,
        accessType: true,
        price: true,
        isPublished: true,
        subject: { select: { nameUz: true, nameRu: true, nameEn: true, icon: true } },
        teacher: { select: { user: { select: { name: true } } } },
      },
    });

    if (!test || !test.isPublished) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    const previewQuestions = await db.question.findMany({
      where: { testId: id },
      orderBy: { order: 'asc' },
      take: PREVIEW_QUESTION_COUNT,
      select: {
        id: true,
        text: true,
        images: true,
        options: true,
        type: true,
        // correctAnswer va explanation qasddan qo'shilmagan — bu ommaviy
        // sinov, javoblar faqat ro'yxatdan o'tgan foydalanuvchiga ochiladi.
      },
    });

    const { isPublished, ...testInfo } = test;

    return NextResponse.json({
      test: testInfo,
      previewQuestions,
      remainingCount: Math.max(0, test.questionCount - previewQuestions.length),
    });
  } catch (error) {
    console.error('GET /api/tests/[id]/preview error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
