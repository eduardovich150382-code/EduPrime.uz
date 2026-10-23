import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isValidOfferDuration, tashkentDayEnd } from './product-offers';
import { logger } from './logger';

export const idSchema = z.string().trim().min(1).max(200);
const name = z.string().trim().min(1).max(200);
const order = z.number().int().min(0).max(2147483647);
export const productSchema = z.object({
  nameUz: name, nameRu: name, nameEn: name,
  isOnSale: z.boolean(), secondSubjectDiscountPct: z.number().int().min(0).max(100), order,
}).strict();

export const offerSchema = z.object({
  labelUz: name, labelRu: name, labelEn: name,
  durationMonths: z.number().int().min(1).max(1200).nullable(),
  untilDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  price: z.number().int().min(0).max(2147483647), isActive: z.boolean(), order,
}).strict().transform((offer) => ({ ...offer, untilDate: offer.untilDate ? tashkentDayEnd(offer.untilDate) : null }))
  .refine(isValidOfferDuration, { message: 'INVALID_DURATION' });

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

export function adminApiError(error: unknown): NextResponse {
  if (error instanceof z.ZodError) return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  if (error instanceof AdminInputError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (hasPrismaCode(error, 'P2025')) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  if (error instanceof Error && ['INVALID_DATE', 'INVALID_DURATION', 'EXPIRED_OFFER', 'DUPLICATE_SUBJECTS', 'UNEXPECTED_SUBJECTS', 'CHOOSE_ONE_SUBJECT', 'MANDATORY_SUBJECTS_NOT_CONFIGURED', 'CHOOSE_TWO_MAIN_SUBJECTS'].includes(error.message)) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  logger.error('Admin products API error', { error });
  return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
}
