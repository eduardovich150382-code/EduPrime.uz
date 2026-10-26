import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isValidOfferDuration, tashkentDateTime, tashkentDayEnd } from './product-offers';
import { logger } from './logger';

export const idSchema = z.string().trim().min(1).max(200);
const name = z.string().trim().min(1).max(200);
const order = z.number().int().min(0).max(2147483647);
// Marketing maydonlari ixtiyoriy: yubormagan eski so'rov qiymatni o'zgartirmaydi,
// bo'sh matn esa maydonni tozalaydi.
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional()
  .transform((value) => value === undefined ? undefined : value || null);
const features = z.array(z.string().trim().max(120)).max(20).optional()
  .transform((list) => list?.filter(Boolean))
  .refine((list) => !list || list.length <= 8, { message: 'TOO_MANY_FEATURES' });
export const productSchema = z.object({
  nameUz: name, nameRu: name, nameEn: name,
  isOnSale: z.boolean(), secondSubjectDiscountPct: z.number().int().min(0).max(100), order,
  taglineUz: optionalText(120), taglineRu: optionalText(120), taglineEn: optionalText(120),
  featuresUz: features, featuresRu: features, featuresEn: features,
}).strict();

export const offerSchema = z.object({
  labelUz: name, labelRu: name, labelEn: name,
  durationMonths: z.number().int().min(1).max(1200).nullable(),
  untilDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  price: z.number().int().min(0).max(2147483647), isActive: z.boolean(), order,
  compareAtPrice: z.number().int().min(1).max(2147483647).nullable().optional(),
  badgeUz: optionalText(40), badgeRu: optionalText(40), badgeEn: optionalText(40),
  isFeatured: z.boolean().optional(),
  promoUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).nullable().optional(),
}).strict().transform((offer) => ({
  ...offer, untilDate: offer.untilDate ? tashkentDayEnd(offer.untilDate) : null,
  promoUntil: offer.promoUntil === undefined ? undefined : offer.promoUntil ? tashkentDateTime(offer.promoUntil) : null,
}))
  .refine(isValidOfferDuration, { message: 'INVALID_DURATION' })
  // Chizilgan narx haqiqiy narxdan past yoki teng bo'lsa sahifa yolg'on chegirma ko'rsatardi.
  .refine((offer) => offer.compareAtPrice == null || offer.compareAtPrice > offer.price, { message: 'COMPARE_AT_NOT_ABOVE_PRICE' })
  // Hisoblagich faqat eski narx yonida ma'noli: tugagach aynan eski narx yashiriladi.
  .refine((offer) => !offer.promoUntil || offer.compareAtPrice != null, { message: 'PROMO_NEEDS_COMPARE_AT' });

export const permissionSchema = z.object({
  userId: idSchema, categoryId: idSchema, subjectId: idSchema.nullable(),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
}).strict();

export const grantSchema = z.object({
  userId: idSchema, productId: idSchema, offerId: idSchema,
  subjectIds: z.array(idSchema).max(2),
}).strict();

export class AdminInputError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function hasPrismaCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

export async function readAdminJson(request: Request): Promise<unknown> {
  try { return await request.json(); } catch { throw new AdminInputError('INVALID_INPUT'); }
}

// Admin formasi aniq sababni ko'rsatishi uchun shu refine xabarlari kod sifatida qaytadi.
const FORM_ERRORS = ['COMPARE_AT_NOT_ABOVE_PRICE', 'PROMO_NEEDS_COMPARE_AT', 'TOO_MANY_FEATURES'];

export function adminApiError(error: unknown): NextResponse {
  if (error instanceof z.ZodError) {
    const code = error.issues.map((issue) => issue.message).find((message) => FORM_ERRORS.includes(message));
    return NextResponse.json({ error: code ?? 'INVALID_INPUT' }, { status: 400 });
  }
  if (error instanceof AdminInputError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (hasPrismaCode(error, 'P2025')) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  if (error instanceof Error && ['INVALID_DATE', 'INVALID_DURATION', 'EXPIRED_OFFER', 'DUPLICATE_SUBJECTS', 'UNEXPECTED_SUBJECTS', 'CHOOSE_ONE_SUBJECT', 'MANDATORY_SUBJECTS_NOT_CONFIGURED', 'CHOOSE_TWO_MAIN_SUBJECTS'].includes(error.message)) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  logger.error('Admin products API error', { error });
  return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
}
