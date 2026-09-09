import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getYesterdayIncorrectItemIds } from '@/lib/item-picker';
import { logger } from '@/lib/logger';

// GET /api/items/yesterday-mistakes — konstruktordagi ("/build") "Kechagi
// xatolarim" preseti uchun: foydalanuvchi kecha (Asia/Tashkent) noto'g'ri
// javob bergan itemlar id'sini qaytaradi. Frontend buni `spec.onlyItemIds`
// sifatida ishlatadi — massiv bo'sh bo'lsa, preset hech narsani o'zgartirmay,
// tegishli xabarni ko'rsatadi.
export async function GET() {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const itemIds = await getYesterdayIncorrectItemIds(user.id);
    return NextResponse.json({ itemIds });
  } catch (err) {
    logger.error('GET /api/items/yesterday-mistakes error:', { error: err });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
