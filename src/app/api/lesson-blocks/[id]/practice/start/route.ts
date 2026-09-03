import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { loadPracticeBlockAccess } from '@/lib/lesson-access';
import { createSessionFromSpec } from '@/lib/sessions';

// PRACTICE bloki tahrirlagichida saqlanadigan maksimal savol soni bilan bir
// xil (LessonBlocksEditor.tsx) — bu yerda faqat himoya sifatida qayta
// tekshiriladi.
const MAX_PRACTICE_ITEMS = 30;
// TestSession.durationMin majburiy maydon — PRACTICE muddat bo'yicha
// hech qachon qulflanmaydi (qarang check/route.ts, expiresAt tekshirilmaydi),
// shu sababli qiymatning o'zi ahamiyatsiz, faqat yetarlicha katta.
const PRACTICE_DURATION_MIN = 240;

// POST /api/lesson-blocks/[id]/practice/start — PRACTICE bloki uchun yangi
// (bir martalik) mashq "davri" boshlaydi. Chaqirilgan sari YANGI tasodifiy
// urug' bilan qayta aralashtiriladi ("Qaytadan" tugmasi shuni chaqiradi) —
// `createSessionFromSpec` (lib/sessions.ts, o'zgartirilmagan) TestSession
// yaratadi, LEKIN `countsAgainstQuota: false` bilan — kunlik konstruktor
// test kvotasi sarflanmaydi. TestResult bu yerda UMUMAN yaratilmaydi (u
// faqat /submit marshrutida yoziladi — PRACTICE hech qachon shu marshrutga
// chaqirmaydi, tekshiruv check/route.ts orqali, natijasiz).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const access = await loadPracticeBlockAccess(id, user.id, user.role);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const itemIds = access.block.itemIds.slice(0, MAX_PRACTICE_ITEMS);
    if (itemIds.length === 0) {
      return NextResponse.json({ error: "Bu mashq bloki hali sozlanmagan" }, { status: 404 });
    }

    const outcome = await createSessionFromSpec({
      userId: user.id,
      spec: { onlyItemIds: itemIds },
      limit: itemIds.length,
      durationMin: PRACTICE_DURATION_MIN,
      mode: 'FIXED',
      title: access.block.labelUz || 'Mashq',
      countsAgainstQuota: false,
    });

    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.error.error }, { status: outcome.error.status });
    }

    return NextResponse.json({
      sessionId: outcome.session.id,
      questions: outcome.session.questions,
    });
  } catch (err) {
    console.error('POST /api/lesson-blocks/[id]/practice/start error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
