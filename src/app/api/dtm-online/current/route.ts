import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { DTM_TITLE_PREFIX } from '@/lib/dtm-online';

// GET /api/dtm-online/current — talabaning hali topshirilmagan DTM Online
// urinishi bor-yo'qligini tekshiradi ("davom ettirish" imkoniyati uchun).
// S18a'gacha DTM Online alohida Test qatori yaratardi (shu orqali osongina
// topilardi); endi umumiy TestSession jadvalida boshqa (masalan /build)
// sessiyalar bilan bir qatorda yotadi, shu sababli `DTM_TITLE_PREFIX` bilan
// ajratiladi (dtm-online.ts — generateDtmOnlineExam shu prefiks bilan
// nomlaydi). `submittedAt`/`expiresAt` TestSession'ning o'zida bor —
// avvalgi qo'lda hisoblangan "yosh" tekshiruvi endi kerak emas.
export async function GET() {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const session = await db.testSession.findFirst({
      where: {
        userId: user.id,
        title: { startsWith: DTM_TITLE_PREFIX },
        submittedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { startedAt: 'desc' },
      select: { id: true, title: true },
    });

    if (!session) return NextResponse.json({ current: null });

    return NextResponse.json({ current: { sessionId: session.id, titleUz: session.title } });
  } catch (error) {
    console.error('GET /api/dtm-online/current error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
