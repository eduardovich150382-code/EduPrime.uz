import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { AdminInputError, adminApiError, hasPrismaCode, idSchema, readAdminJson } from '@/lib/admin-products-api';

type Context = { params: Promise<{ id: string }> };
const bodySchema = z.object({ action: z.enum(['cancel', 'restore']) }).strict();

// Qator o'chirilmaydi: Payment bog'lanishi va tarix saqlansin, kirish huquqi
// esa `isActive` orqali darhol yopiladi (lib/access.ts shu ustunni tekshiradi).
// AdminAuditLog modeli yo'q — kim nima qilgani logger'da qoladi.
export async function PATCH(request: NextRequest, context: Context) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  try {
    const id = idSchema.parse((await context.params).id);
    const { action } = bodySchema.parse(await readAdminJson(request));
    const subscription = await db.$transaction(async (tx) => {
      const current = await tx.subscription.findUnique({ where: { id } });
      if (!current) throw new AdminInputError('NOT_FOUND', 404);
      if (action === 'cancel') return tx.subscription.update({ where: { id }, data: { isActive: false } });
      if (current.isActive) return current;
      const now = new Date();
      if (current.endDate < now) throw new AdminInputError('SUBSCRIPTION_EXPIRED');
      // Bekor qilingandan keyin admin yangisini bergan bo'lishi mumkin — ikkalasi
      // birga faol bo'lsa uzaytirish va statistikalar ikki karra sanaydi. Eski
      // tariflarda productId yo'q, ular plan bo'yicha solishtiriladi.
      const conflict = await tx.subscription.findFirst({
        where: {
          userId: current.userId, id: { not: id }, isActive: true, endDate: { gte: now },
          ...(current.productId ? { productId: current.productId } : { plan: current.plan, productId: null }),
        },
        select: { id: true },
      });
      if (conflict) throw new AdminInputError('ACTIVE_SUBSCRIPTION_EXISTS', 409);
      return tx.subscription.update({ where: { id }, data: { isActive: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    logger.info(`admin.subscription.${action}`, { adminId: user.id, subscriptionId: id, userId: subscription.userId });
    return NextResponse.json({ subscription });
  } catch (error) {
    if (hasPrismaCode(error, 'P2034')) return NextResponse.json({ error: 'RETRY_REQUIRED' }, { status: 409 });
    return adminApiError(error);
  }
}
