import type { BotSettings } from '../bot-settings';
import { BOT_USERNAME } from '../telegram-bot-links';
import { campaignVars, formatCampaignDate } from './format';
import { formatRewardsSummary, formatTop10ForChannel, type PostKind } from './posts';
import { CAMPAIGN_JOIN_PARAM } from './ref-code';
import { campaignRewardRules } from './rewards';
import { buildSampleVars } from './sample-vars';
import type { Campaign, CampaignRanking } from './store';
import type { TemplateVars } from './texts';

// Kanal postlarining o'zgaruvchi qiymatlari. Haqiqiy qiymatlar (cron, kanalga
// chiqarish, "O'zimga sinov") va namunaviylari (oldindan ko'rish, saqlashdagi
// tekshiruv) bitta joyda — panel ko'rsatgan bilan kanalga ketgani farq qilmasin.

export type PostCampaign = Pick<Campaign, 'channelUsername' | 'startsAt' | 'endsAt' | 'rewardTiers' | 'baseRewardMin' | 'baseRewardPct' | 'promoValidDays'>;

/** Kanal posti tugmasi: botda qatnashish oqimi (`/start aksiya`). */
export function participationLink(): string {
  return `https://t.me/${BOT_USERNAME}?start=${CAMPAIGN_JOIN_PARAM}`;
}

const countOrNull = (n: number): string | null => (n > 0 ? String(n) : null);

function commonVars(campaign: PostCampaign): TemplateVars {
  const rules = campaignRewardRules(campaign);
  return {
    qatnashish_havolasi: participationLink(),
    boshlanish_vaqti: formatCampaignDate(campaign.startsAt),
    mukofotlar: formatRewardsSummary(rules.tiers, rules.base),
  };
}

/** Reyting → `{top10}`, `{ishtirokchilar_soni}`, `{jami_referal}` (faqat ACTIVE referallar). */
export function rankingVars(loaded: CampaignRanking | null): TemplateVars {
  if (!loaded) return { top10: null, ishtirokchilar_soni: null, jami_referal: null };
  const rows = loaded.ranking.map((r) => ({ name: loaded.participants.get(r.participantId)?.firstName ?? null, score: r.activeCount }));
  return {
    top10: formatTop10ForChannel(rows),
    ishtirokchilar_soni: countOrNull(loaded.ranking.length),
    jami_referal: countOrNull(loaded.ranking.reduce((sum, r) => sum + r.activeCount, 0)),
  };
}

export type RealVarsInput = {
  campaign: PostCampaign;
  bot: BotSettings;
  ranking: CampaignRanking | null;
  /** SHARE uchun: `{havola}` shu kod bilan ("O'zimga sinov" da `TESTTEST`). */
  refCode?: string;
  firstName?: string | null;
};

/** Haqiqiy qiymatlar. SHARE'dan boshqa turda shaxsiy qiymat (`havola`) yo'q. */
export function postVars(kind: PostKind, input: RealVarsInput): TemplateVars {
  const refCode = kind === 'SHARE' ? input.refCode : undefined;
  return {
    ...campaignVars({ campaign: input.campaign, bot: input.bot, firstName: input.firstName, refCode }),
    ...commonVars(input.campaign),
    ...rankingVars(input.ranking),
  };
}

const SAMPLE_TOP10 = formatTop10ForChannel([
  { name: 'Dilnoza', score: 15 }, { name: 'Jasur', score: 12 }, { name: 'Malika', score: 9 }, { name: 'Sardor', score: 7 },
]);

/** Namunaviy qiymatlar — `buildSampleVars` (A3) ustiga kanal postlari o'zgaruvchilari. */
export function postSampleVars(campaign: PostCampaign, bot: BotSettings, adminName: string | null | undefined): TemplateVars {
  return {
    ...buildSampleVars(campaign, bot, adminName),
    ...commonVars(campaign),
    top10: SAMPLE_TOP10,
    ishtirokchilar_soni: '42',
    jami_referal: '128',
  };
}
