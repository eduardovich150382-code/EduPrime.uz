import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/share/result/[id] - public result data (no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await db.testResult.findUnique({
      where: { id },
      select: {
        id: true,
        score: true,
        maxScore: true,
        percentage: true,
        timeSpent: true,
        completedAt: true,
        user: {
          select: {
            name: true,
            image: true,
          },
        },
        test: {
          select: {
            id: true,
            titleUz: true,
            titleRu: true,
            titleEn: true,
            questionCount: true,
            subject: {
              select: {
                nameUz: true,
                nameRu: true,
                nameEn: true,
              },
            },
          },
        },
      },
    });

    if (!result) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('GET /api/share/result/[id] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
