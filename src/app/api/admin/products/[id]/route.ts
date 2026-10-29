import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { revalidatePricing } from '@/lib/cache-tags';
import { adminApiError, idSchema, productSchema, readAdminJson } from '@/lib/admin-products-api';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const id = idSchema.parse((await context.params).id);
    const data = productSchema.parse(await readAdminJson(request));
    const product = await db.product.update({ where: { id }, data });
    revalidatePricing();
    return NextResponse.json({ product });
  } catch (error) { return adminApiError(error); }
}
