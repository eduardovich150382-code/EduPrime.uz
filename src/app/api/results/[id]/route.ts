import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { loadSessionItems } from '@/lib/sessions';

// GET /api/results/[id] — bitta natijani to'liq olish (savollar bilan).
// Natija Test orqali (testId) yoki TestSession orqali (sessionId) kelgan
// bo'lishi mumkin — ikkalasi ham natija sahifasi kutayotgan bir xil
// `result.test.{...}` shaklida qaytariladi, shuning uchun frontend
// (results/[id]/page.tsx) o'zgarishsiz ishlayveradi.
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
    const role = (session.user as any)?.role;
    if (result.userId !== session.user.id && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (result.test) {
      return NextResponse.json({ result });
    }

    // Sessiya orqali topshirilgan natijada haqiqiy Test qatori yo'q —
    // itemIds'dan xuddi shu shakldagi sintetik "test" obyekti quramiz.
    if (!result.session) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    const items = await loadSessionItems(result.session.itemIds);
    const distinctSubjects = new Set(items.map((it) => it.subject.nameUz));
    const subject = distinctSubjects.size === 1
      ? items[0]?.subject
      : { nameUz: 'Turli fanlar', nameRu: 'Разные предметы', nameEn: 'Various subjects' };

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
          questions: items.map((it, order) => ({
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
          })),
          subject: subject ?? { nameUz: 'Turli fanlar', nameRu: 'Разные предметы', nameEn: 'Various subjects' },
        },
      },
    });
  } catch (error) {
    console.error('GET /api/results/[id] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
