import { db } from '../db';
import { logger } from '../logger';
import { hasPrismaCode } from '../admin-products-api';
import type { BotSettings } from '../bot-settings';
import { promoValidUntil } from './finalize-rules';
import { notifyKey } from './internal-keys';
import { INITIAL_NOTIFY_CURSOR } from './notify-cursor';
import { generatePromoCodes } from './promo-code';
import { countUnchecked } from './recheck';
import { campaignRewardRules, rewardedParticipants } from './rewards';
import { loadRanking, type Campaign } from './store';

// Yakuniy natija va yakunlash (A5). Yakunlash bitta tranzaksiya: aksiya
// "yakunlandi" deb band qilinadi, reyting shu tranzaksiya ichida qayta
// hisoblanadi va promokodlar yoziladi — biri yiqilsa hech biri qolmaydi.

export type FinalizeWinner = { rank: number; name: string | null; username: string | null; telegramId: string; score: number; percent: number };

export type FinalizePreview = {
  uncheckedCount: number;
  winners: FinalizeWinner[];
  noPrizeCount: number;
  participantCount: number;
  activeReferrals: number;
  /** Faqat admin uchun: g'oliblar chegirmalari yig'indisi (narx kiritilmagan bo'lsa `null`). */
  maxDiscountSum: number | null;
};

export async function loadFinalizePreview(campaign: Campaign, bot: BotSettings): Promise<FinalizePreview> {
  const [uncheckedCount, loaded] = await Promise.all([countUnchecked(campaign), loadRanking(campaign.id)]);
  if (!loaded) throw new Error('Campaign ranking failed to load');
  const rewarded = rewardedParticipants(loaded.ranking, campaignRewardRules(campaign)).filter((r) => r.percent > 0);
  const winners = rewarded.map((r) => {
    const p = loaded.participants.get(r.participantId);
    return {
      rank: r.rank, name: p?.firstName ?? null, username: p?.username ?? null, telegramId: p?.telegramId.toString() ?? '',
      score: r.activeCount, percent: r.percent,
    };
  });
  const price = bot.course.price;
  return {
    uncheckedCount,
    winners,
    noPrizeCount: loaded.ranking.length - winners.length,
    participantCount: loaded.ranking.length,
    activeReferrals: loaded.ranking.reduce((sum, r) => sum + r.activeCount, 0),
    maxDiscountSum: price === null ? null : Math.round(winners.reduce((sum, w) => sum + price * w.percent / 100, 0)),
  };
}

export const ALREADY_FINALIZED_ERROR = 'Allaqachon yakunlangan';

class FinalizeConflict extends Error {}

const MAX_ATTEMPTS = 3;

export type FinalizeResult = { ok: true; promoCount: number; noPrizeCount: number } | { ok: false; status: 409; error: string };

/**
 * Bitta tranzaksiya. Claim sharti (`finalizedAt: null`, `endsAt ≤ now`) ikki
 * oynadan bosilganda ikkinchisini to'xtatadi — promokodlar ikki marta
 * yaratilmaydi. Promokod boshqa aksiyaning kodi bilan to'qnashsa (P2002)
 * BUTUN tranzaksiya qaytadan: Postgres xatodan keyin tranzaksiyani bekor
 * qiladi, uning ichida qayta urinib bo'lmaydi.
 */
export async function finalizeCampaign(campaign: Campaign, now: Date): Promise<FinalizeResult> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        const claimed = await tx.campaign.updateMany({
          where: { id: campaign.id, finalizedAt: null, endsAt: { lte: now } },
          data: { finalizedAt: now },
        });
        if (claimed.count !== 1) throw new FinalizeConflict();

        // Natija oynasidan keyin referallar o'zgargan bo'lishi mumkin — shu yerda qayta.
        const loaded = await loadRanking(campaign.id, tx);
        if (!loaded) throw new Error('Campaign ranking failed to load');
        const winners = rewardedParticipants(loaded.ranking, campaignRewardRules(campaign)).filter((r) => r.percent > 0);
        const codes = generatePromoCodes(winners.length);
        const validUntil = promoValidUntil(now, campaign.promoValidDays);
        if (winners.length) {
          await tx.promoCode.createMany({
            data: winners.map((w, i) => ({
              code: codes[i],
              campaignId: campaign.id,
              telegramId: (loaded.participants.get(w.participantId) as { telegramId: bigint }).telegramId,
              percent: w.percent,
              validUntil,
            })),
          });
        }
        // Xabar yuborish kursori — sahifa yopilib qolsa "davom ettirish" shundan bilinadi.
        const value = JSON.stringify(INITIAL_NOTIFY_CURSOR);
        await tx.systemSetting.upsert({ where: { key: notifyKey(campaign.id) }, update: { value }, create: { key: notifyKey(campaign.id), value } });
        return { ok: true as const, promoCount: winners.length, noPrizeCount: loaded.ranking.length - winners.length };
      }, { maxWait: 10_000, timeout: 20_000 });
    } catch (error) {
      if (error instanceof FinalizeConflict) return { ok: false, status: 409, error: ALREADY_FINALIZED_ERROR };
      if (hasPrismaCode(error, 'P2002') && attempt < MAX_ATTEMPTS) {
        logger.warn('Campaign finalize: promo code collision, retrying', { campaignId: campaign.id, attempt });
        continue;
      }
      throw error;
    }
  }
}
