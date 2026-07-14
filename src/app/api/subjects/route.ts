import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/subjects — barcha fanlar (kategoriya bilan)
export async function GET(request: NextRequest) {
  try {
    const subjects = await db.subject.findMany({
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
