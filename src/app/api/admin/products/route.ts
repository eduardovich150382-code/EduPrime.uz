import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { adminApiError } from '@/lib/admin-products-api';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const [products, counts] = await Promise.all([
      db.product.findMany({
        include: { offers: { orderBy: [{ order: 'asc' }, { id: 'asc' }] }, category: {
          include: { subjects: { select: { id: true, nameUz: true, nameRu: true, nameEn: true, isMandatory: true }, orderBy: { order: 'asc' } } },
        } },
        orderBy: [{ order: 'asc' }, { id: 'asc' }],
      }),
      db.test.groupBy({ by: ['categoryId', 'subjectId'], where: { isPublished: true }, _count: { _all: true } }),
    ]);
    return NextResponse.json({ products: products.map((p) => ({ ...p,
      publishedTestCount: counts.filter((c) => p.kind === 'BUNDLE' || c.categoryId === p.categoryId).reduce((sum, c) => sum + c._count._all, 0),
      subjects: (p.category?.subjects ?? []).map((s) => ({ ...s, publishedTestCount: counts.filter((c) => c.categoryId === p.categoryId && c.subjectId === s.id).reduce((sum, c) => sum + c._count._all, 0) })),
    })) });
  } catch (error) { return adminApiError(error); }
}
