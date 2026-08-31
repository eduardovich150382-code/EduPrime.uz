import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { sanitizeText } from '@/lib/sanitize';
import { parseItemSpec } from '@/lib/item-picker';
import { createSessionFromSpec } from '@/lib/sessions';

const MAX_LIMIT = 200;
const MAX_DURATION_MIN = 600; // 10 soat — yetarlicha keng yuqori chegara

// POST /api/sessions — ItemSpec bo'yicha virtual test sessiyasi yaratadi.
// Bazaga o'nlab Question qatori yozish o'rniga faqat tanlangan Item id'lari
// (itemIds) saqlanadi — savol matni/variantlari so'rov vaqtida Item
// jadvalidan olinadi. Javobda to'g'ri javoblar YO'Q — bu pullik mahsulot,
// GET /api/sessions/[id] va shu marshrut bir xil (toPresentedQuestions)
// orqali kafolatlaydi.
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await request.json().catch(() => null);
    const parsed = parseItemSpec(body);
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { spec } = parsed;

    const b = (body ?? {}) as Record<string, unknown>;
    const limit = b.limit;
    if (typeof limit !== 'number' || !Number.isInteger(limit) || limit <= 0 || limit > MAX_LIMIT) {
      return NextResponse.json({ error: `limit — 1 dan ${MAX_LIMIT} gacha butun son bo'lishi kerak` }, { status: 400 });
    }

    // sanitizeInt() ATAYLAB ishlatilmaydi — u diapazondan tashqari qiymatni
    // (masalan -1) jimgina eng yaqin chegaraga qisqartiradi, bu yerda esa
    // noto'g'ri qiymat aniq 400 bilan rad etilishi kerak (limit tekshiruvi
    // bilan bir xil qat'iylik).
    const durationMin = b.durationMin;
    if (typeof durationMin !== 'number' || !Number.isInteger(durationMin) || durationMin <= 0 || durationMin > MAX_DURATION_MIN) {
      return NextResponse.json({ error: `durationMin — 1 dan ${MAX_DURATION_MIN} gacha butun son bo'lishi kerak` }, { status: 400 });
    }

    const mode = b.mode === 'ADAPTIVE' ? 'ADAPTIVE' : 'FIXED';
    const title = sanitizeText(b.title, 200) || "Konstruktor testi";

    // `b.source` (yoki boshqa har qanday so'rov tanasi maydoni) ATAYLAB
    // e'tiborsiz qoldiriladi — bu marshrut orqali kvota sarflashni chetlab
    // o'tishning YO'LI YO'Q, chunki mijoz so'rov tanasini to'liq nazorat
    // qiladi (kritik xavfsizlik tuzatishi: avval `source: 'mastery'` bepul
    // konstruktor test kvotasini butunlay chetlab o'tar edi). Kvotasiz
    // sessiya kerak bo'lgan server-tomon chaqiruvchilar (masalan bilim
    // xaritasi mashq testlari) HTTP orqali emas, `createSessionFromSpec`ni
    // to'g'ridan-to'g'ri chaqirsin — qarang lib/sessions.ts.
    const outcome = await createSessionFromSpec({
      userId: user.id,
      spec,
      limit,
      durationMin,
      mode,
      title,
      countsAgainstQuota: true,
    });

    if (!outcome.ok) {
      const { error } = outcome;
      if (error.status === 429) {
        return NextResponse.json(
          { error: error.error, code: error.code, usedToday: error.usedToday, limit: error.limit },
          { status: 429 }
        );
      }
      return NextResponse.json({ error: error.error }, { status: error.status });
    }

    return NextResponse.json({ session: outcome.session, relaxed: outcome.relaxed });
  } catch (err) {
    console.error('POST /api/sessions error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
