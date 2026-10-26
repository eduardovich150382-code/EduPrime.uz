import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { applyRateLimit, requireAuth } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { buildSubjectIds, requiredSubjectCount } from '@/lib/product-offers';
import { assertOfferOnSale, checkoutSubjects, hasEnoughSubjects } from '@/lib/checkout-selection';
import { BOT_START_URL, createIntentToken, intentStartParameter, saveIntent } from '@/lib/checkout-intent';

// DTM_BLOCK ikkita asosiy fan talab qiladi — shuning uchun bitta subjectId emas, massiv.
const bodySchema = z.object({
  productId: z.string().min(1).max(64), offerId: z.string().min(1).max(64),
  subjectIds: z.array(z.string().min(1).max(64)).max(2).optional(),
});

const fail = (code: string, status: number) => NextResponse.json({ error: code, code }, { status });

// POST /api/checkout/intent — kirgan foydalanuvchining tanlovini qotirib,
// botga faqat bir martalik token beradi. Bot to'lovni shu userId ga yozadi.
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;
    const limited = applyRateLimit(`checkout-intent:${user.id}`, 10, 60_000);
    if (limited) return limited;
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail('INVALID_SELECTION', 400);
    const { productId, offerId } = parsed.data;
    const product = await db.product.findUnique({ where: { id: productId }, include: { offers: { where: { id: offerId } } } });
    const offer = product?.offers[0];
    if (!product?.isOnSale || !offer) return fail('INVALID_SELECTION', 400);
    try { assertOfferOnSale(offer); } catch { return fail('EXPIRED_OFFER', 409); }
    const { subjects, available, mandatory } = await checkoutSubjects(product);
    if (!hasEnoughSubjects(product, available, mandatory)) return fail('NO_SUBJECTS', 422);
    const needed = requiredSubjectCount(product);
    // Tanlov yagona bo'lsa so'ramaymiz — bot ham bu ro'yxatdan boshqasini taklif qilmaydi.
    const chosen = parsed.data.subjectIds ?? (needed === 1 && available.length === 1 ? [available[0].id] : []);
    if (chosen.length !== needed) return fail('CHOOSE_SUBJECT', 400);
    if (new Set(chosen).size !== chosen.length || chosen.some((id) => !available.some((s) => s.id === id))) return fail('INVALID_SELECTION', 400);
    const subjectIds = buildSubjectIds(product, chosen, subjects).sort();
    const token = createIntentToken();
    await saveIntent(token, { userId: user.id, productId, offerId, subjectIds, createdAt: Date.now() });
    return NextResponse.json({ url: `${BOT_START_URL}${intentStartParameter(token)}` });
  } catch (error) {
    logger.error('POST /api/checkout/intent error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
