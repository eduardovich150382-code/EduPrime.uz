import type { CampaignReferralStatus } from '@prisma/client';
import { tashkentDayRangeUtc } from '../date';
import type { Membership } from '../telegram-channel-gate';
import type { CampaignPhase, PhaseInput } from './phase';

// Aksiyani yakunlash (A5) qoidalari — sof funksiyalar: route, cron va admin
// formasi shularni ishlatadi. ATAYLAB db yo'q — client komponent ham import qiladi.

export const FINALIZED_ERROR = 'Aksiya yakunlangan';
export const NOT_ENDED_ERROR = 'Aksiya hali tugamagan';

/**
 * Qayta tekshiruv, referallarni o'zgartirish va yakunlash mumkinmi.
 * Pauza ham kiradi: `campaignPhase` uni PAUSED deydi, lekin tugash vaqti
 * o'tgan bo'lsa yakunlanishi kerak — aks holda pauzadagi aksiya abadiy
 * "joriy" bo'lib, yangi aksiya yaratishni bloklardi. Qoralama ham kiradi:
 * prod'da real foydalanuvchilarga ko'rinmasdan butun oqimni sinash uchun.
 */
export function hasEnded(c: Pick<PhaseInput, 'finalizedAt' | 'endsAt'>, now: Date): boolean {
  return !c.finalizedAt && now.getTime() >= c.endsAt.getTime();
}

/** Ro'yxat va bosqich belgisi uchun: yakunlangan qoralama ham "Yakunlandi". `campaignPhase` ning o'zi o'zgarmaydi. */
export function displayPhase(phase: CampaignPhase, finalized: boolean): CampaignPhase {
  return finalized ? 'FINISHED' : phase;
}

/**
 * G'oliblar posti kanalga faqat e'lon qilingan va yakunlangan aksiyada.
 * Yakunlangan qoralama — sinov: uning "g'oliblari" adminlar, kanalga chiqmasin.
 */
export function canPublishWinners(c: Pick<PhaseInput, 'isPublished' | 'finalizedAt'>): boolean {
  return c.isPublished && c.finalizedAt !== null;
}

export type RecheckChange = { status: CampaignReferralStatus; confirmedAt?: Date; checkedAt: Date };

/**
 * Qayta tekshiruvdagi holat o'tishi. `unknown` — `null`: yozuv o'zgarmaydi
 * (Telegram javob bermadi — chiqib ketgan deb hisoblash adolatsiz bo'lardi).
 * PENDING + a'zo — havolani bosib obuna bo'lgan, lekin "Obuna bo'ldim" ni
 * bosmagan odam ham hisoblanadi; `confirmedAt = endsAt` teng balda uni
 * "eng kech yetgan" qiladi — o'z vaqtida tasdiqlaganlardan oldinga o'tmasin.
 */
export function recheckTransition(status: CampaignReferralStatus, membership: Membership, endsAt: Date, now: Date): RecheckChange | null {
  if (membership === 'unknown' || status === 'INVALID') return null;
  if (membership === 'member') {
    if (status === 'PENDING') return { status: 'ACTIVE', confirmedAt: endsAt, checkedAt: now };
    return { status: 'ACTIVE', checkedAt: now };
  }
  return { status: status === 'ACTIVE' ? 'LEFT' : status, checkedAt: now };
}

/**
 * Tiklangan referal holati. Tasdiqlanmagan (PENDING dan yaroqsiz qilingan)
 * referal tiklanganda ball bermasin — PENDING ga qaytadi; tugagach qayta
 * tekshiruv uni kanal bo'yicha aniqlaydi (`checkedAt = null`).
 */
export function restoredStatus(confirmedAt: Date | null): 'ACTIVE' | 'PENDING' {
  return confirmedAt ? 'ACTIVE' : 'PENDING';
}

/**
 * Promokod muddati: yakunlangan Toshkent kunidan `days` kun keyingi kunning
 * 23:59:59 (Toshkent). Server UTC'da — `toISOString()` sanasi bilan hisoblansa
 * 05:00 gacha yakunlanganda bir kun kam chiqardi.
 */
export function promoValidUntil(now: Date, days: number): Date {
  return new Date(tashkentDayRangeUtc(-days, now).end.getTime() - 1000);
}
