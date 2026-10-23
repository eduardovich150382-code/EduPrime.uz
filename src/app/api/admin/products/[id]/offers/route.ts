import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { AdminInputError, adminApiError, idSchema, offerSchema, readAdminJson } from '@/lib/admin-products-api';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const productId = idSchema.parse((await context.params).id);
    const data = offerSchema.parse(await readAdminJson(request));
    if (!await db.product.findUnique({ where: { id: productId }, select: { id: true } })) throw new AdminInputError('NOT_FOUND', 404);
    const offer = await db.productOffer.create({ data: { ...data, productId } });
    return NextResponse.json({ offer }, { status: 201 });
  } catch (error) { return adminApiError(error); }
}
