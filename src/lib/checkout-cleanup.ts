import { z } from 'zod';
import type { PaymentStatus } from '@prisma/client';
import { db } from './db';
import { intentKey, parseIntent, paymentChatKey, telegramPaymentKey } from './checkout-intent';

// SystemSetting'da vaqt ustuni yo'q (checkout migratsiyasiz qurilgan), shuning
// uchun niyat yoshi qiymatdagi createdAt'dan, yo'naltirgichlarniki bog'langan
// Payment'dan olinadi. Niyat 1 soatda eskiradi — 24 soat zaxira bilan.
export const INTENT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
// PENDING bo'lsa ham 30 kundan keyin chek yo'naltirgichi kerak emas — tasdiq
// xabari baribir Payment egasining telegramId'siga boradi.
export const POINTER_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const DELETE_CHUNK = 500;

const INTENT_PREFIX = intentKey('');
const TG_PREFIX = telegramPaymentKey('');
const CHAT_PREFIX = paymentChatKey('');

export interface CheckoutSettingRow { key: string; value: string }
export interface CheckoutPaymentState { id: string; status: PaymentStatus; createdAt: Date }

const pointerSchema = z.object({ paymentId: z.string().min(1) });

export function pointerPaymentId(row: CheckoutSettingRow): string | null {
  if (row.key.startsWith(CHAT_PREFIX)) return row.key.slice(CHAT_PREFIX.length) || null;
  if (!row.key.startsWith(TG_PREFIX)) return null;
  try {
    const parsed = pointerSchema.safeParse(JSON.parse(row.value));
    return parsed.success ? parsed.data.paymentId : null;
  } catch { return null; }
}

// O'qib bo'lmaydigan qiymat ham eskirgan: claimIntent uni baribir "expired" deb
// biladi, yo'naltirgich esa hech qaysi to'lovni topa olmaydi.
export function staleCheckoutSettings(
  rows: readonly CheckoutSettingRow[], payments: readonly CheckoutPaymentState[], now: Date,
): CheckoutSettingRow[] {
  const byId = new Map(payments.map((p) => [p.id, p]));
  return rows.filter((row) => {
    if (row.key.startsWith(INTENT_PREFIX)) {
      const intent = parseIntent(row.value);
      return !intent || now.getTime() - intent.createdAt > INTENT_MAX_AGE_MS;
    }
    if (!row.key.startsWith(TG_PREFIX) && !row.key.startsWith(CHAT_PREFIX)) return false;
    const id = pointerPaymentId(row);
    const payment = id ? byId.get(id) : undefined;
    return !payment || payment.status !== 'PENDING' || now.getTime() - payment.createdAt.getTime() > POINTER_MAX_AGE_MS;
  });
}

export async function cleanupCheckoutSettings(now: Date): Promise<number> {
  const rows = await db.systemSetting.findMany({
    where: { OR: [INTENT_PREFIX, TG_PREFIX, CHAT_PREFIX].map((prefix) => ({ key: { startsWith: prefix } })) },
    select: { key: true, value: true },
  });
  const ids = [...new Set(rows.map(pointerPaymentId).filter((id): id is string => id !== null))];
  const payments = ids.length
    ? await db.payment.findMany({ where: { id: { in: ids } }, select: { id: true, status: true, createdAt: true } })
    : [];
  const stale = staleCheckoutSettings(rows, payments, now);
  let deleted = 0;
  for (let i = 0; i < stale.length; i += DELETE_CHUNK) {
    // Kalit VA qiymat bo'yicha: o'qish va o'chirish orasida yangi to'lovga qayta
    // yozilgan checkout_tg_ yo'naltirgichi o'chib ketmasin.
    const { count } = await db.systemSetting.deleteMany({
      where: { OR: stale.slice(i, i + DELETE_CHUNK).map(({ key, value }) => ({ key, value })) },
    });
    deleted += count;
  }
  return deleted;
}
