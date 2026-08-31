import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { extractItemPoints, loadSessionItems, toPresentedQuestions } from '@/lib/sessions';

// GET /api/sessions/[id] — sessiya savollarini qaytaradi (aralashtirilgan,
// `seed` bo'yicha; to'g'ri javoblarsiz). Sahifa yangilansa yoki testni
// qayta ochsa ham xuddi shu tartib qaytadi — POST /api/sessions dagi bilan
// bir xil `toPresentedQuestions` chaqiriladi.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const testSession = await db.testSession.findUnique({ where: { id } });
    if (!testSession) {
      return NextResponse.json({ error: 'Sessiya topilmadi' }, { status: 404 });
    }

    // Faqat egasi yoki admin ko'ra oladi — sessiya spec/itemIds boshqa
    // foydalanuvchi uchun mo'ljallanmagan (natijalar sahifasidagi kabi
    // huquq tekshiruvi, /api/results/[id]/route.ts bilan bir xil naqsh).
    if (testSession.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const items = await loadSessionItems(testSession.itemIds, extractItemPoints(testSession.spec));
    const questions = toPresentedQuestions(items, testSession.seed);

    return NextResponse.json({
      session: {
        id: testSession.id,
        title: testSession.title,
        mode: testSession.mode,
        durationMin: testSession.durationMin,
        startedAt: testSession.startedAt,
        expiresAt: testSession.expiresAt,
        submittedAt: testSession.submittedAt,
        questionCount: questions.length,
        questions,
      },
    });
  } catch (err) {
    console.error('GET /api/sessions/[id] error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
