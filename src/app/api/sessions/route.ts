import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { sanitizeText } from '@/lib/sanitize';
import { getRecentlyCorrectItemIds, parseItemSpec, pickItemsForSpec } from '@/lib/item-picker';
import { loadSessionItems, toPresentedQuestions } from '@/lib/sessions';

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

    const excludeItemIds = spec.excludeAnsweredCorrectlyDays
      ? await getRecentlyCorrectItemIds(user.id, spec.excludeAnsweredCorrectlyDays)
      : [];

    // Test sessiyasining o'zi bir martalik — har chaqiriqda yangi tasodifiy
    // urug' hosil qilinadi (items/search'dagi ixtiyoriy `seed` parametridan
    // farqli, bu yerda takrorlanuvchan bo'lishning hojati yo'q, faqat GET
    // va submit ORASIDA bir xil bo'lishi kerak — shuning uchun DB'da
    // saqlanadi).
    const seed = Math.floor(Math.random() * 2 ** 31);
    const { ids: itemIds, relaxed } = await pickItemsForSpec({ spec, limit, seed, excludeItemIds });

    if (itemIds.length === 0) {
      return NextResponse.json({ error: "Berilgan filtrga mos savol topilmadi" }, { status: 404 });
    }

    const now = new Date();
    const testSession = await db.testSession.create({
      data: {
        userId: user.id,
        title,
        spec: spec as Prisma.InputJsonValue,
        itemIds,
        seed,
        mode,
        durationMin,
        startedAt: now,
        expiresAt: new Date(now.getTime() + durationMin * 60_000),
      },
    });

    const items = await loadSessionItems(testSession.itemIds);
    const questions = toPresentedQuestions(items, testSession.seed);

    return NextResponse.json({
      session: {
        id: testSession.id,
        title: testSession.title,
        mode: testSession.mode,
        durationMin: testSession.durationMin,
        startedAt: testSession.startedAt,
        expiresAt: testSession.expiresAt,
        questionCount: questions.length,
        questions,
      },
      relaxed,
    });
  } catch (err) {
    console.error('POST /api/sessions error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
