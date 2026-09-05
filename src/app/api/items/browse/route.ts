import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireTeacher } from '@/lib/api-auth';
import { buildItemWhere, parseItemSpec } from '@/lib/item-picker';

const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 20;
const MAX_QUERY_LENGTH = 200;

interface OptionPreview {
  label: string;
  text: string;
  correct: boolean;
}

/**
 * Faqat MULTIPLE_CHOICE/TRUE_FALSE/MULTI_SELECT — `options` `{label,text}[]`
 * shaklida saqlanadigan turlar uchun ishlaydi. MATCHING (`{left,right}`,
 * qarang lib/matching.ts) va FILL_BLANK (variantlar matn ichida `___` bilan,
 * qarang lib/fill-blank.ts) BOSHQA formatda — bu funksiya ularni maxsus
 * o'qimaydi (bu fayllarga tegilmadi), shunchaki mos kelmasa xavfsiz bo'sh
 * ro'yxat qaytaradi. MULTI_SELECT uchun correctAnswer bir nechta labelni
 * vergul bilan ("A,C") saqlaydi (qarang lib/grading.ts) — shu sababli
 * to'plamga solishtiramiz, bitta labelga emas.
 */
function buildOptionsPreview(options: unknown, correctAnswer: string): OptionPreview[] {
  if (!Array.isArray(options)) return [];
  const correctLabels = new Set(correctAnswer.split(',').map((s) => s.trim()).filter(Boolean));
  const preview: OptionPreview[] = [];
  for (const raw of options) {
    if (!raw || typeof raw !== 'object') return [];
    const label = (raw as Record<string, unknown>).label;
    const text = (raw as Record<string, unknown>).text;
    if (typeof label !== 'string' || typeof text !== 'string') return [];
    preview.push({ label, text, correct: correctLabels.has(label) });
  }
  return preview;
}

// POST /api/items/browse — o'qituvchi uchun savol havzasini KO'RIB TANLASH
// (S26). O'qituvchi savol matnini so'z bo'yicha eslamaydi, lekin fan va
// mavzuni biladi — shuning uchun bu marshrut filtr (fan/mavzu/qiyinlik/tur)
// bilan SAHIFALANGAN ro'yxat qaytaradi, matn qidiruvi (`q`) esa ixtiyoriy,
// ikkinchi darajali toraytirish.
//
// `/api/items/search` (item-picker.ts, talaba/konstruktor tomonidan
// chaqiriladi) dan FARQLI — bu yerda savol MATNI va to'g'ri javob (paywall
// ortidagi kontent) qaytariladi, shu sababli FAQAT o'qituvchi/admin
// (`requireTeacher`) chaqira oladi. `buildItemWhere`/`parseItemSpec`
// (item-picker.ts) o'zgarishsiz ishlatiladi — u DTM/sessiyalar/hisoblagichda
// ham ishlatiladi, bu yerda faqat matn filtri ustiga qo'shiladi (xuddi
// eski /api/teacher/items/search-preview'dagi naqsh bilan bir xil).
export async function POST(request: NextRequest) {
  try {
    const { error } = await requireTeacher();
    if (error) return error;

    const body = await request.json().catch(() => null);
    const parsed = parseItemSpec(body);
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { spec } = parsed;

    const b = (body ?? {}) as Record<string, unknown>;
    const q = typeof b.q === 'string' ? b.q.trim().slice(0, MAX_QUERY_LENGTH) : '';

    let page = 1;
    if (b.page !== undefined) {
      if (typeof b.page !== 'number' || !Number.isInteger(b.page) || b.page < 1) {
        return NextResponse.json({ error: "page — 1 dan boshlanadigan butun son bo'lishi kerak" }, { status: 400 });
      }
      page = b.page;
    }

    let pageSize = DEFAULT_PAGE_SIZE;
    if (b.pageSize !== undefined) {
      if (typeof b.pageSize !== 'number' || !Number.isInteger(b.pageSize) || b.pageSize < 1 || b.pageSize > MAX_PAGE_SIZE) {
        return NextResponse.json({ error: `pageSize — 1 dan ${MAX_PAGE_SIZE} gacha butun son bo'lishi kerak` }, { status: 400 });
      }
      pageSize = b.pageSize;
    }

    const where = {
      ...buildItemWhere(spec),
      ...(q ? { text: { contains: q, mode: 'insensitive' as const } } : {}),
    };

    const [total, rows] = await Promise.all([
      db.item.count({ where }),
      db.item.findMany({
        where,
        select: {
          id: true,
          text: true,
          type: true,
          difficulty: true,
          options: true,
          correctAnswer: true,
          topics: {
            select: { topic: { select: { path: true } } },
            orderBy: { weight: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      items: rows.map((it) => ({
        id: it.id,
        text: it.text,
        type: it.type,
        difficulty: it.difficulty,
        topicPath: it.topics[0]?.topic.path ?? null,
        optionsPreview: buildOptionsPreview(it.options, it.correctAnswer),
      })),
      total,
      page,
    });
  } catch (err) {
    console.error('POST /api/items/browse error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
