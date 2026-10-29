import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { revalidateTaxonomy } from '@/lib/cache-tags';
import { AdminInputError, adminApiError, idSchema, readAdminJson } from '@/lib/admin-products-api';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const subjects = await db.subject.findMany({ include: { category: { select: { type: true, nameUz: true, nameRu: true, nameEn: true } } }, orderBy: [{ category: { order: 'asc' } }, { order: 'asc' }] });
    return NextResponse.json({ subjects });
  } catch (error) { return adminApiError(error); }
}

export async function PATCH(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const { id, isMandatory } = z.object({ id: idSchema, isMandatory: z.boolean() }).strict().parse(await readAdminJson(request));
    const subject = await db.subject.findUnique({ where: { id }, include: { category: { select: { type: true } } } });
    if (!subject) throw new AdminInputError('NOT_FOUND', 404);
    if (subject.category.type !== 'DTM') throw new AdminInputError('DTM_ONLY');
    const updated = await db.subject.update({ where: { id }, data: { isMandatory } });
    revalidateTaxonomy();
    return NextResponse.json({ subject: updated });
  } catch (error) { return adminApiError(error); }
}
