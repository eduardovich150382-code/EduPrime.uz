import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { AdminInputError, adminApiError, idSchema, offerSchema, readAdminJson } from '@/lib/admin-products-api';

type Context = { params: Promise<{ id: string; offerId: string }> };
async function offerWhere(context: Context) {
  const params = await context.params;
  const where = { id: idSchema.parse(params.offerId), productId: idSchema.parse(params.id) };
  if (!await db.productOffer.findFirst({ where, select: { id: true } })) throw new AdminInputError('NOT_FOUND', 404);
  return where;
}

export async function PATCH(request: NextRequest, context: Context) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const data = offerSchema.parse(await readAdminJson(request));
    const offer = await db.productOffer.update({ where: await offerWhere(context), data });
    return NextResponse.json({ offer });
  } catch (error) { return adminApiError(error); }
}

export async function DELETE(_request: NextRequest, context: Context) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const offer = await db.productOffer.update({ where: await offerWhere(context), data: { isActive: false } });
    return NextResponse.json({ offer });
  } catch (error) { return adminApiError(error); }
}
