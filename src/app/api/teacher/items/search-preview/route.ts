import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireTeacher } from '@/lib/api-auth';
import { buildItemWhere, parseItemSpec } from '@/lib/item-picker';

const MAX_RESULTS = 20;
const TEXT_PREVIEW_LENGTH = 160;

// POST /api/teacher/items/search-preview — o'qituvchi uchun savol
// qidiruvi, MATNI bilan birga. `/api/items/search` (item-picker.ts orqali
// bir xil `buildItemWhere`ni ishlatadi) faqat id qaytaradi — u talaba/
// konstruktor tomonidan chaqiriladi va savol matni pullik mahsulot, shu
// yerdan sizib chiqmasligi kerak. Bu marshrut esa FAQAT o'qituvchiga
// (requireTeacher) ochiq — muallif darajasidagi ko'rish, paywall bu yerga
// taalluqli emas (Item.authorTeacherId bilan bog'liq emas — havza umumiy,
// PRACTICE havzasi bilan bir xil: barcha o'qituvchilar bir xil PUBLIC
// bazadan tanlaydi).
//
// LessonBlocksEditor (PRACTICE savol havzasi — S22b PR sharh, ko'p tanlov)
// va VideoCheckpointsEditor (bitta nazorat nuqtasi uchun bitta savol — S23)
// IKKALASI HAM shu marshrutni `ItemSearchPicker` orqali chaqiradi.
export async function POST(request: NextRequest) {
  try {
    const { error } = await requireTeacher();
    if (error) return error;

    const body = await request.json().catch(() => null);
    const parsed = parseItemSpec(body);
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { spec } = parsed;
    if (!spec.subjectIds?.length) {
      return NextResponse.json({ error: 'subjectIds kamida bitta fan bilan berilishi kerak' }, { status: 400 });
    }

    const b = (body ?? {}) as Record<string, unknown>;
    const query = typeof b.query === 'string' ? b.query.trim().slice(0, 200) : '';

    const where = {
      ...buildItemWhere(spec),
      ...(query ? { text: { contains: query, mode: 'insensitive' as const } } : {}),
    };

    const items = await db.item.findMany({
      where,
      select: { id: true, text: true, difficulty: true, type: true },
      orderBy: { createdAt: 'desc' },
      take: MAX_RESULTS,
    });

    return NextResponse.json({
      items: items.map((it) => ({
        id: it.id,
        text: it.text.length > TEXT_PREVIEW_LENGTH ? `${it.text.slice(0, TEXT_PREVIEW_LENGTH)}…` : it.text,
        difficulty: it.difficulty,
        type: it.type,
      })),
    });
  } catch (err) {
    console.error('POST /api/teacher/items/search-preview error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
