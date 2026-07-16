import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TestType } from '@prisma/client';

// GET /api/subjects — barcha fanlar (kategoriya bilan)
// Optional query param: ?type=DTM — filter subjects by category type
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as TestType | null;

    const subjects = await db.subject.findMany({
      where: type ? { category: { type } } : undefined,
      include: {
        category: { select: { nameUz: true, type: true } },
      },
      orderBy: [{ category: { order: 'asc' } }, { order: 'asc' }],
    });

    return NextResponse.json({ subjects });
  } catch (error) {
    console.error('GET /api/subjects error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
