import type { BotSettings } from '../bot-settings';
import { campaignVars, formatCampaignDate } from './format';
import type { Standing } from './rewards';
import type { TemplateVars } from './texts';

// Admin panelidagi namunaviy qiymatlar: oldindan ko'rish, belgi hisoblagichi,
// saqlashdagi uzunlik tekshiruvi va "O'zimga sinov" — to'rttasi shu bitta
// manbadan, aks holda panel "sig'adi" desa-yu, sinov xabari boshqacha chiqardi.
// Haqiqiy `campaignVars` orqali: narx yashirin bo'lsa qator xuddi botdagidek o'chadi.

const DAY_MS = 24 * 60 * 60 * 1000;
export const SAMPLE_REF_CODE = 'TESTTEST';
export const SAMPLE_PROMO_CODE = 'TEST1234';
export const SAMPLE_STANDING: Standing = { activeCount: 7, rank: 4, percent: 50, next: { percent: 70, needed: 3 } };
const SAMPLE_TOP10 = '🥇 Dilnoza — 15\n🥈 Jasur — 12\n🥉 Malika — 9';

export type SampleCampaign = { channelUsername: string; endsAt: Date; promoValidDays: number };

export function buildSampleVars(campaign: SampleCampaign, bot: BotSettings, adminName: string | null | undefined): TemplateVars {
  return {
    ...campaignVars({ campaign, bot, firstName: adminName, refCode: SAMPLE_REF_CODE, standing: SAMPLE_STANDING }),
    promokod: SAMPLE_PROMO_CODE,
    muddat: formatCampaignDate(new Date(campaign.endsAt.getTime() + campaign.promoValidDays * DAY_MS)),
    top10: SAMPLE_TOP10,
  };
}
