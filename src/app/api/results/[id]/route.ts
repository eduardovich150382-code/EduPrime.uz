import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET /api/results/[id] — bitta natijani to'liq olish (savollar bilan)
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
              },
            },
            subject: { select: { nameUz: true, nameRu: true, nameEn: true } },
          },
        },
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

    return NextResponse.json({ result });
  } catch (error) {
    console.error('GET /api/results/[id] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
