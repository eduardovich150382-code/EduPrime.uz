import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { DTM_DURATION_MINUTES } from '@/lib/dtm-online';

// GET /api/dtm-online/current — talabaning hali topshirilmagan DTM Online
// urinishi bor-yo'qligini tekshiradi ("davom ettirish" imkoniyati uchun).
export async function GET() {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const test = await db.test.findFirst({
      where: { userId: user.id, results: { none: {} } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, titleUz: true, createdAt: true },
    });

    if (!test) return NextResponse.json({ current: null });

    // Imtihon vaqti (180 daqiqa) + biroz muhlatdan o'tgan bo'lsa eskirgan hisoblanadi
    const ageMinutes = (Date.now() - test.createdAt.getTime()) / 60000;
    if (ageMinutes > DTM_DURATION_MINUTES + 30) {
      return NextResponse.json({ current: null });
    }

    return NextResponse.json({ current: { testId: test.id, titleUz: test.titleUz } });
  } catch (error) {
    console.error('GET /api/dtm-online/current error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
