import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { buildItemWhere, getRecentlyCorrectItemIds, parseItemSpec, summarizeCandidates } from '@/lib/item-picker';

// POST /api/items/count — konstruktor ekranida har filtr o'zgarishida
// chaqiriladi (150 ms ichida javob berishi kerak), shuning uchun bitta
// indekslangan `findMany` (faqat 3 ta skalyar ustun) dan boshqa hech narsa
// qilmaydi — aggregatsiya (byDifficulty, distinctTemplates) JS tomonda,
// alohida so'rovlarsiz.
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await request.json().catch(() => null);
    const parsed = parseItemSpec(body);
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { spec } = parsed;

    const excludeItemIds = spec.excludeAnsweredCorrectlyDays
      ? await getRecentlyCorrectItemIds(user.id, spec.excludeAnsweredCorrectlyDays)
      : [];

    const rows = await db.item.findMany({
      where: buildItemWhere(spec, excludeItemIds),
      select: { id: true, difficulty: true, templateId: true },
    });

    return NextResponse.json(summarizeCandidates(rows));
  } catch (err) {
    console.error('POST /api/items/count error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
