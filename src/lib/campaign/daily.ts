import type { BotSettings } from '../bot-settings';
import { tashkentDayRangeUtc } from '../date';
import { logger } from '../logger';
import { campaignVars } from './format';
import { campaignPhase } from './phase';
import { campaignRewardRules, standingOf } from './rewards';
import { campaignText, renderTemplate } from './texts';
import { claimDaily, claimLastDay, loadCurrentCampaignFresh, loadRanking } from './store';
import type { TelegramResult } from './telegram';

// Kunlik natija xabari (cron, 20:00 Toshkent). Huquq yuborishdan OLDIN
// atomar band qilinadi (store.claim*): Vercel cron'ni ikki marta chaqirsa
// ham ikkinchisi hech narsa yubormaydi. Narxi: yuborish o'rtasida yiqilsa
// qolganlar o'sha kuni xabar olmaydi — ikki marta olishdan ko'ra yaxshiroq.

const DAY_MS = 24 * 60 * 60 * 1000;
// Telegram: bitta botdan ~30 xabar/s. 25/s — zaxira bilan.
const SEND_INTERVAL_MS = 40;
// maxDuration = 60 s; javob va loglar uchun 10 s qoldiriladi.
const TIME_BUDGET_MS = 50_000;

export type DailyDeps = {
  bot: BotSettings;
  send(chatId: string, text: string): Promise<TelegramResult>;
  sleep(ms: number): Promise<void>;
  now(): Date;
};

export type DailyResult = {
  kind: 'daily_result' | 'last_day' | null;
  reason?: string;
  sent: number;
  failed: number;
  skipped: number;
};

const none = (reason: string): DailyResult => ({ kind: null, reason, sent: 0, failed: 0, skipped: 0 });

/** 429 bo'lsa `retry_after` qadar kutib bir marta qayta; 403 (bot bloklangan) va boshqa xatolar — shunchaki muvaffaqiyatsiz. */
async function sendWithRetry(deps: DailyDeps, chatId: string, text: string): Promise<boolean> {
  const first = await deps.send(chatId, text);
  if (first.ok) return true;
  if (first.error_code === 429) {
    await deps.sleep((first.parameters?.retry_after ?? 1) * 1000);
    return (await deps.send(chatId, text)).ok;
  }
  return false;
}

export async function runCampaignDaily(deps: DailyDeps): Promise<DailyResult> {
  const startedAt = deps.now();
  const campaign = await loadCurrentCampaignFresh();
  if (!campaign) return none('no_campaign');
  if (campaignPhase(campaign, startedAt) !== 'ACTIVE') return none('not_active');
  // Bitta "avtomatik xabarlar" kaliti: o'chiq bo'lsa oxirgi kun eslatmasi ham yo'q.
  if (!campaign.dailyEnabled) return none('disabled');

  let kind: 'daily_result' | 'last_day';
  if (campaign.endsAt.getTime() - startedAt.getTime() <= DAY_MS && !campaign.lastDayReminderSentAt) {
    if (!(await claimLastDay(campaign.id, startedAt))) return none('already_sent');
    kind = 'last_day';
  } else {
    if (!(await claimDaily(campaign.id, tashkentDayRangeUtc(0, startedAt).start, startedAt))) return none('already_sent');
    kind = 'daily_result';
  }

  // Reyting bir marta — har ishtirokchi uchun alohida so'rov yo'q.
  const loaded = await loadRanking(campaign.id);
  if (!loaded) return { ...none('ranking_failed'), kind };
  const rules = campaignRewardRules(campaign);
  const template = campaignText(campaign, kind);

  const result: DailyResult = { kind, sent: 0, failed: 0, skipped: 0 };
  const order = loaded.ranking;
  for (let i = 0; i < order.length; i++) {
    if (deps.now().getTime() - startedAt.getTime() > TIME_BUDGET_MS) {
      result.skipped = order.length - i;
      logger.warn('Campaign daily: time budget exceeded, rest skipped today', { campaignId: campaign.id, skipped: result.skipped });
      break;
    }
    const participant = loaded.participants.get(order[i].participantId);
    if (!participant) continue;
    const standing = standingOf(order, participant.id, rules);
    const text = renderTemplate(template, campaignVars({ campaign, bot: deps.bot, firstName: participant.firstName, refCode: participant.refCode, standing }));
    if (await sendWithRetry(deps, participant.telegramId.toString(), text)) result.sent++;
    else result.failed++;
    if (i < order.length - 1) await deps.sleep(SEND_INTERVAL_MS);
  }
  logger.info('Campaign daily sent', { campaignId: campaign.id, ...result });
  return result;
}
