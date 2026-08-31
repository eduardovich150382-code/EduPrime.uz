import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { hasActiveSubscription } from '@/lib/access';
import { generateDtmOnlineExam, getDtmSpecialtySubjects } from '@/lib/dtm-online';
import { daysSince } from '@/lib/date';

const FREE_TIER_COOLDOWN_DAYS = 30;

// POST /api/dtm-online/start — 2 ta mutaxassislik fani bo'yicha DTM Online
// imtihonini generatsiya qiladi. Premium/Ustoz cheksiz, bepul tarif oyiga
// 1 marta (oxirgi foydalanishdan FREE_TIER_COOLDOWN_DAYS kun o'tgach yana ochiladi).
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { specialty1SubjectId, specialty2SubjectId } = body;

    if (
      !specialty1SubjectId || !specialty2SubjectId ||
      typeof specialty1SubjectId !== 'string' || typeof specialty2SubjectId !== 'string'
    ) {
      return NextResponse.json({ error: "2 ta mutaxassislik fani tanlanishi kerak" }, { status: 400 });
    }
    if (specialty1SubjectId === specialty2SubjectId) {
      return NextResponse.json({ error: "Ikkala mutaxassislik fani har xil bo'lishi kerak" }, { status: 400 });
    }

    const validSubjects = await getDtmSpecialtySubjects();
    const validIds = new Set(validSubjects.map((s) => s.id));
    if (!validIds.has(specialty1SubjectId) || !validIds.has(specialty2SubjectId)) {
      return NextResponse.json({ error: "Noto'g'ri fan tanlandi" }, { status: 400 });
    }

    let isFreeTier = false;
    if (user.role !== 'ADMIN') {
      const { premium, teacher } = await hasActiveSubscription(user.id);
      if (!premium && !teacher) {
        isFreeTier = true;
        const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { dtmOnlineFreeUsedAt: true } });
        if (dbUser?.dtmOnlineFreeUsedAt && daysSince(dbUser.dtmOnlineFreeUsedAt) < FREE_TIER_COOLDOWN_DAYS) {
          return NextResponse.json(
            {
              error: 'LIMIT_REACHED',
              message: "Bepul tarifda DTM Online'dan oyiga faqat 1 marta foydalanish mumkin. Davom etish uchun Premium yoki Ustoz tarifiga o'ting.",
            },
            { status: 403 }
          );
        }
      }
    }

    const result = await generateDtmOnlineExam({ userId: user.id, specialty1SubjectId, specialty2SubjectId });

    if (!result.ok) {
      const { error: genError } = result;
      let message = "Test generatsiya qilib bo'lmadi.";
      if (genError.code === 'INSUFFICIENT_POOL') {
        message = `"${genError.subjectName}" fani bo'yicha bazada yetarli savol yo'q (${genError.available}/${genError.required}). Birozdan keyin qayta urinib ko'ring.`;
      } else if (genError.code === 'MANDATORY_SUBJECT_MISSING') {
        message = `"${genError.subjectName}" fani tizimda topilmadi.`;
      } else if (genError.code === 'CATEGORY_NOT_FOUND') {
        message = "DTM kategoriyasi tizimda topilmadi.";
      }
      return NextResponse.json({ error: message }, { status: 422 });
    }

    if (isFreeTier) {
      await db.user.update({ where: { id: user.id }, data: { dtmOnlineFreeUsedAt: new Date() } });
    }

    return NextResponse.json({ sessionId: result.sessionId, titleUz: result.titleUz });
  } catch (error) {
    console.error('POST /api/dtm-online/start error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
