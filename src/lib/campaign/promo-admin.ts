import type { PromoCode } from '@prisma/client';
import { db } from '../db';
import { normalizePromoInput } from './promo-code';

// Promokodlarni tekshirish va "ishlatildi" deb belgilash (A5) — admin paneli
// va bot `/promo` uchun umumiy. Kurs EduPrime orqali emas, kurs admini orqali
// sotiladi: belgilash — "chegirma berildi" degan qayd, to'lov tizimiga bog'lanmaydi.

export type PromoStatus = 'active' | 'used' | 'expired';

export function promoStatus(p: Pick<PromoCode, 'usedAt' | 'validUntil'>, now: Date): PromoStatus {
  if (p.usedAt) return 'used';
  return p.validUntil.getTime() < now.getTime() ? 'expired' : 'active';
}

export const USED_NOTE_MAX = 200;
export const ALREADY_USED_ERROR = 'Allaqachon ishlatilgan';

export type PromoRow = {
  id: string; code: string; telegramId: string; name: string | null; username: string | null;
  percent: number; validUntil: string; status: PromoStatus; usedAt: string | null; usedNote: string | null;
};

/** Aksiya promokodlari egasi bilan. Kodlar soni g'oliblar soni (yuzlab) — qidiruv xotirada. */
export async function listPromoCodes(campaignId: string, q: string, now: Date): Promise<PromoRow[]> {
  const promos = await db.promoCode.findMany({ where: { campaignId }, orderBy: [{ percent: 'desc' }, { createdAt: 'asc' }] });
  const owners = await db.campaignParticipant.findMany({ where: { campaignId, telegramId: { in: promos.map((p) => p.telegramId) } } });
  const byTelegram = new Map(owners.map((o) => [o.telegramId.toString(), o]));
  const rows = promos.map((p): PromoRow => {
    const owner = byTelegram.get(p.telegramId.toString());
    return {
      id: p.id, code: p.code, telegramId: p.telegramId.toString(), name: owner?.firstName ?? null, username: owner?.username ?? null,
      percent: p.percent, validUntil: p.validUntil.toISOString(), status: promoStatus(p, now),
      usedAt: p.usedAt?.toISOString() ?? null, usedNote: p.usedNote,
    };
  });
  const needle = q.trim().toLowerCase().replace(/^@/, '');
  if (!needle) return rows;
  const code = normalizePromoInput(q);
  return rows.filter((r) => (code && r.code.includes(code))
    || r.username?.toLowerCase().includes(needle)
    || r.name?.toLowerCase().includes(needle));
}

/**
 * Atomar: `usedAt: null` sharti — panel va bot bir vaqtda bossa ham faqat
 * bittasi belgilaydi, ikkinchisi "Allaqachon ishlatilgan" oladi.
 */
export async function markPromoUsed(where: { id: string; campaignId?: string }, note: string | null, now: Date): Promise<'ok' | 'not_found' | 'already_used'> {
  const updated = await db.promoCode.updateMany({ where: { ...where, usedAt: null }, data: { usedAt: now, usedNote: note } });
  if (updated.count === 1) return 'ok';
  const existing = await db.promoCode.findFirst({ where, select: { id: true } });
  return existing ? 'already_used' : 'not_found';
}

/** Adashib bosilgan bo'lsa — bekor qilish. */
export async function unmarkPromoUsed(where: { id: string; campaignId: string }): Promise<boolean> {
  const updated = await db.promoCode.updateMany({ where, data: { usedAt: null, usedNote: null } });
  return updated.count === 1;
}
