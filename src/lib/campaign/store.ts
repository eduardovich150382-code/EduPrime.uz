import { unstable_cache } from 'next/cache';
import type { Campaign, CampaignParticipant, CampaignPost, CampaignReferral, Prisma } from '@prisma/client';
import { db } from '../db';
import { logger } from '../logger';
import { CACHE_TAGS } from '../cache-tags';
import { hasPrismaCode } from '../admin-products-api';
import { generateRefCode } from './ref-code';
import { campaignRewardRules, rankParticipants, standingOf, type RankedParticipant, type Standing } from './rewards';

// Aksiyaning db qatlami. XAVFSIZLIK QOIDASI: har funksiya xatoni ichida
// ushlaydi va "aksiya yo'q" (null / false) qaytaradi — migratsiya prod'ga
// hali qo'llanmagan bo'lsa ham (jadval yo'q) `/start` buzilmasligi kerak.

export type { Campaign, CampaignParticipant, CampaignPost, CampaignReferral };

const DATE_FIELDS = ['startsAt', 'endsAt', 'lastDailySentAt', 'lastDayReminderSentAt', 'finalizedAt', 'createdAt', 'updatedAt'] as const;
type CachedCampaign = Omit<Campaign, (typeof DATE_FIELDS)[number]> & Record<(typeof DATE_FIELDS)[number], string | null>;

// `unstable_cache` miss'da jonli obyektni, hit'da JSON'dan tiklanganini
// qaytaradi (lib/public-catalog.ts boshidagi izoh). Shuning uchun kesh ichida
// sanalar har doim satrga aylantiriladi va tashqarida qayta Date qilinadi —
// birinchi so'rovda Date, keyingisida satr bo'lib, `now < c.endsAt` jimgina
// noto'g'ri ishlamasin.
function toCached(c: Campaign): CachedCampaign {
  const out = { ...c } as unknown as CachedCampaign;
  for (const key of DATE_FIELDS) out[key] = c[key] ? c[key].toISOString() : null;
  return out;
}

function reviveCampaign(c: CachedCampaign): Campaign {
  const out = { ...c } as unknown as Campaign;
  for (const key of DATE_FIELDS) {
    const value = c[key];
    (out as Record<string, unknown>)[key] = value === null ? null : new Date(value);
  }
  return out;
}

const CURRENT_WHERE = { finalizedAt: null } as const;

function queryCurrentCampaign(): Promise<Campaign | null> {
  // Qoralama ham kiradi — bosqichni chaqiruvchi so'rov vaqtida hisoblaydi.
  return db.campaign.findFirst({ where: CURRENT_WHERE, orderBy: { startsAt: 'desc' } });
}

let cachedCurrent: (() => Promise<CachedCampaign | null>) | null = null;

/**
 * Har /start'da chaqiriladi, shuning uchun keshdan (60 s). Faqat yozuv
 * qaytadi — bosqich `campaignPhase(c, new Date())` bilan so'rov vaqtida.
 * try/catch keshdan TASHQARIDA: xato (masalan, jadval yo'q) keshlanib qolmasin.
 */
export async function getCurrentCampaign(): Promise<Campaign | null> {
  try {
    cachedCurrent ??= unstable_cache(async () => {
      const c = await queryCurrentCampaign();
      return c ? toCached(c) : null;
    }, ['current-campaign'], { revalidate: 60, tags: [CACHE_TAGS.campaigns] });
    const cached = await cachedCurrent();
    return cached ? reviveCampaign(cached) : null;
  } catch (error) {
    logger.error('getCurrentCampaign error:', { error });
    return null;
  }
}

/** Keshsiz — cron uchun: eskirgan `lastDailySentAt` bir kunda ikki marta yuborishga olib kelmasin. */
export async function loadCurrentCampaignFresh(): Promise<Campaign | null> {
  try {
    return await queryCurrentCampaign();
  } catch (error) {
    logger.error('loadCurrentCampaignFresh error:', { error });
    return null;
  }
}

export type ParticipantWithCampaign = CampaignParticipant & { campaign: Campaign };

export async function findParticipantByCode(refCode: string): Promise<ParticipantWithCampaign | null> {
  try {
    return await db.campaignParticipant.findUnique({ where: { refCode }, include: { campaign: true } });
  } catch (error) {
    logger.error('findParticipantByCode error:', { error });
    return null;
  }
}

export async function findParticipant(campaignId: string, telegramId: number): Promise<CampaignParticipant | null> {
  try {
    return await db.campaignParticipant.findUnique({ where: { campaignId_telegramId: { campaignId, telegramId: BigInt(telegramId) } } });
  } catch (error) {
    logger.error('findParticipant error:', { error });
    return null;
  }
}

export type ReferralWithParticipant = CampaignReferral & { participant: CampaignParticipant };

export async function findReferral(campaignId: string, referredTelegramId: number): Promise<ReferralWithParticipant | null> {
  try {
    return await db.campaignReferral.findUnique({
      where: { campaignId_referredTelegramId: { campaignId, referredTelegramId: BigInt(referredTelegramId) } },
      include: { participant: true },
    });
  } catch (error) {
    logger.error('findReferral error:', { error });
    return null;
  }
}

type TelegramUser = { telegramId: number; username: string; firstName: string };

/**
 * Qayta bosish xato emas — mavjud ishtirokchi qaytadi. refCode unique'si
 * to'qnashsa (62^8 da amalda bo'lmaydi) yangi kod bilan qayta uriniladi.
 */
export async function joinCampaign(campaignId: string, user: TelegramUser): Promise<CampaignParticipant | null> {
  try {
    const telegramId = BigInt(user.telegramId);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await db.campaignParticipant.create({
          data: { campaignId, telegramId, username: user.username || null, firstName: user.firstName || null, refCode: generateRefCode() },
        });
      } catch (error) {
        if (!hasPrismaCode(error, 'P2002')) throw error;
        // Parallel bosish yoki avvaldan qatnashgan — (campaignId, telegramId) to'qnashuvi.
        const existing = await db.campaignParticipant.findUnique({ where: { campaignId_telegramId: { campaignId, telegramId } } });
        if (existing) return existing;
      }
    }
    logger.error('joinCampaign: refCode collisions exhausted', { campaignId });
    return null;
  } catch (error) {
    logger.error('joinCampaign error:', { error });
    return null;
  }
}

/** `'exists'` — bu odam shu aksiyada allaqachon referal (birinchi havola yutadi); `null` — baza xatosi. */
export async function createPendingReferral(
  campaignId: string, participantId: string, user: TelegramUser,
): Promise<'created' | 'exists' | null> {
  try {
    await db.campaignReferral.create({
      data: {
        campaignId, participantId, referredTelegramId: BigInt(user.telegramId),
        referredUsername: user.username || null, referredFirstName: user.firstName || null,
      },
    });
    return 'created';
  } catch (error) {
    if (hasPrismaCode(error, 'P2002')) return 'exists';
    logger.error('createPendingReferral error:', { error });
    return null;
  }
}

/**
 * PENDING → ACTIVE shartli yangilash bilan: ikki marta bosish yoki gate va
 * `cmp:ok` bir vaqtda kelsa ham faqat bittasi `true` oladi — ball haqidagi
 * xabar ikki marta ketmaydi.
 */
export async function confirmReferral(referralId: string, now = new Date()): Promise<boolean> {
  try {
    const updated = await db.campaignReferral.updateMany({
      where: { id: referralId, status: 'PENDING' },
      data: { status: 'ACTIVE', confirmedAt: now, checkedAt: now },
    });
    return updated.count === 1;
  } catch (error) {
    logger.error('confirmReferral error:', { error });
    return false;
  }
}

export type CampaignRanking = { ranking: RankedParticipant[]; participants: Map<string, CampaignParticipant> };

/**
 * Butun reyting: ishtirokchilar + ACTIVE referallar bitta groupBy bilan; tartib xotirada.
 * `client` — yakunlash tranzaksiyasi (A5): promokodlar aynan tranzaksiya ko'rgan reyting bo'yicha.
 */
export async function loadRanking(campaignId: string, client: Prisma.TransactionClient = db): Promise<CampaignRanking | null> {
  try {
    const [participants, counts] = await Promise.all([
      client.campaignParticipant.findMany({ where: { campaignId } }),
      client.campaignReferral.groupBy({
        by: ['participantId'], where: { campaignId, status: 'ACTIVE' },
        _count: { _all: true }, _max: { confirmedAt: true },
      }),
    ]);
    const byParticipant = new Map(counts.map((row) => [row.participantId, row]));
    const ranking = rankParticipants(participants.map((p) => {
      const row = byParticipant.get(p.id);
      return { participantId: p.id, activeCount: row?._count._all ?? 0, lastActiveAt: row?._max.confirmedAt ?? null, joinedAt: p.createdAt };
    }));
    return { ranking, participants: new Map(participants.map((p) => [p.id, p])) };
  } catch (error) {
    logger.error('loadRanking error:', { error });
    return null;
  }
}

/** Ulashiladigan post (A4 da admin yozadi); bo'lmasa standart `share_post` matni ishlatiladi. */
export async function loadSharePost(campaignId: string): Promise<CampaignPost | null> {
  try {
    return await db.campaignPost.findFirst({ where: { campaignId, kind: 'SHARE' }, orderBy: { updatedAt: 'desc' } });
  } catch (error) {
    logger.error('loadSharePost error:', { error });
    return null;
  }
}

/**
 * Kunlik xabar huquqini atomar "band qilish": yuborishdan OLDIN yoziladi.
 * Vercel cron'ni ikki marta chaqirsa ham faqat bittasi `true` oladi.
 */
export async function claimDaily(campaignId: string, dayStart: Date, now: Date): Promise<boolean> {
  try {
    const updated = await db.campaign.updateMany({
      where: { id: campaignId, OR: [{ lastDailySentAt: null }, { lastDailySentAt: { lt: dayStart } }] },
      data: { lastDailySentAt: now },
    });
    return updated.count === 1;
  } catch (error) {
    logger.error('claimDaily error:', { error });
    return false;
  }
}

/** Oxirgi kun eslatmasi bir marta; o'sha kunning kunlik xabari o'rnida — shuning uchun ikkala maydon. */
export async function claimLastDay(campaignId: string, now: Date): Promise<boolean> {
  try {
    const updated = await db.campaign.updateMany({
      where: { id: campaignId, lastDayReminderSentAt: null },
      data: { lastDayReminderSentAt: now, lastDailySentAt: now },
    });
    return updated.count === 1;
  } catch (error) {
    logger.error('claimLastDay error:', { error });
    return false;
  }
}

/** Bitta ishtirokchining bali, o'rni, foizi va keyingi maqsadi. */
export async function participantStanding(campaign: Campaign, participantId: string): Promise<Standing | null> {
  const loaded = await loadRanking(campaign.id);
  return loaded ? standingOf(loaded.ranking, participantId, campaignRewardRules(campaign)) : null;
}
