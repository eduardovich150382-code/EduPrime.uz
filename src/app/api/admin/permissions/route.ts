import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { AdminInputError, adminApiError, hasPrismaCode, idSchema, permissionSchema, readAdminJson } from '@/lib/admin-products-api';
import { tashkentDayEnd } from '@/lib/product-offers';

const querySchema = z.object({ userId: idSchema.optional(), search: z.string().trim().max(100).optional() });
const include = {
  user: { select: { id: true, name: true, email: true, telegramUsername: true } },
  category: { select: { id: true, nameUz: true, nameRu: true, nameEn: true, type: true } },
  subject: { select: { id: true, nameUz: true, nameRu: true, nameEn: true } },
};

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const query = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const now = new Date();
    const [categories, permissions, users] = await Promise.all([
      db.testCategory.findMany({ orderBy: { order: 'asc' }, include: { subjects: { select: { id: true, nameUz: true, nameRu: true, nameEn: true }, orderBy: { order: 'asc' } } } }),
      db.userPermission.findMany({ where: { ...(query.userId ? { userId: query.userId } : {}), isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] }, include, orderBy: { createdAt: 'desc' }, take: 100 }),
      query.search ? db.user.findMany({
        where: { OR: ['name', 'email', 'telegramUsername'].map((field) => ({ [field]: { contains: query.search, mode: 'insensitive' as const } })) },
        select: { id: true, name: true, email: true, telegramUsername: true }, take: 20, orderBy: { createdAt: 'desc' },
      }) : [],
    ]);
    return NextResponse.json({ categories, permissions, users });
  } catch (error) { return adminApiError(error); }
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  try {
    const input = permissionSchema.parse(await readAdminJson(request));
    const expiresAt = input.expiresAt ? tashkentDayEnd(input.expiresAt) : null;
    if (expiresAt && expiresAt <= new Date()) throw new AdminInputError('INVALID_DATE');
    const [targetUser, category, subject] = await Promise.all([
      db.user.findUnique({ where: { id: input.userId }, select: { id: true } }),
      db.testCategory.findUnique({ where: { id: input.categoryId }, select: { id: true } }),
      input.subjectId ? db.subject.findUnique({ where: { id: input.subjectId }, select: { categoryId: true } }) : null,
    ]);
    if (!targetUser || !category) throw new AdminInputError('NOT_FOUND', 404);
    if (input.subjectId && subject?.categoryId !== input.categoryId) throw new AdminInputError('INVALID_SUBJECT');
    const data = { expiresAt, isActive: true, grantedBy: user.id };
    let permission;
    if (input.subjectId) {
      permission = await db.userPermission.upsert({
        where: { userId_categoryId_subjectId: { userId: input.userId, categoryId: input.categoryId, subjectId: input.subjectId } },
        create: { userId: input.userId, categoryId: input.categoryId, subjectId: input.subjectId, ...data }, update: data,
      });
    } else {
      // Qisman unique indeks parallel so'rovda ham bir xil fansiz ruxsatni himoya qiladi.
      const where = { userId: input.userId, categoryId: input.categoryId, subjectId: null };
      try {
        permission = await db.userPermission.create({ data: { ...where, ...data } });
      } catch (error) {
        if (!hasPrismaCode(error, 'P2002')) throw error;
        const existing = await db.userPermission.findFirst({ where, select: { id: true } });
        if (!existing) throw error;
        permission = await db.userPermission.update({ where: { id: existing.id }, data });
      }
    }
    return NextResponse.json({ permission });
  } catch (error) { return adminApiError(error); }
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const { id } = z.object({ id: idSchema }).strict().parse(await readAdminJson(request));
    await db.userPermission.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (error) { return adminApiError(error); }
}
