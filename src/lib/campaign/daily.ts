import type { BotSettings } from '../bot-settings';
import { tashkentDayRangeUtc } from '../date';
import { logger } from '../logger';
import { campaignVars } from './format';
import { campaignPhase, isLastDayWindow } from './phase';
import { runChannelPosts, type ChannelPostsResult } from './post-cron';
import type { TelegramApi } from './post-telegram';
import { campaignRewardRules, standingOf } from './rewards';
import { campaignText, renderTemplate } from './texts';
import { claimDaily, claimLastDay, loadCurrentCampaignFresh, loadRanking, type CampaignRanking } from './store';
import type { TelegramResult } from './telegram';

// Kunlik natija xabari (cron, 20:00 Toshkent). Huquq yuborishdan OLDIN
// atomar band qilinadi (store.claim*): Vercel cron'ni ikki marta chaqirsa
// ham ikkinchisi hech narsa yubormaydi. Narxi: yuborish o'rtasida yiqilsa
// qolganlar o'sha kuni xabar olmaydi — ikki marta olishdan ko'ra yaxshiroq.

// Telegram: bitta botdan ~30 xabar/s. 25/s — zaxira bilan.
const SEND_INTERVAL_MS = 40;
// maxDuration = 60 s; javob va loglar uchun 10 s qoldiriladi.
const TIME_BUDGET_MS = 50_000;

export type DailyDeps = {
  bot: BotSettings;
  send(chatId: string, text: string): Promise<TelegramResult>;
  /** Kanal postlari uchun Bot API chaqiruvi (sendPhoto, editMessageMedia va h.k.). */
  api: TelegramApi;
  sleep(ms: number): Promise<void>;
  now(): Date;
};

export type DailyResult = {
  kind: 'daily_result' | 'last_day' | null;
  reason?: string;
  sent: number;
  failed: number;
  skipped: number;
  posts?: ChannelPostsResult;
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

  // Reyting bir marta — kanal postlari ham, har ishtirokchi xabari ham shuni ishlatadi.
  let rankingPromise: Promise<CampaignRanking | null> | null = null;
  const ranking = () => (rankingPromise ??= loadRanking(campaign.id));

  // Kanal postlari shaxsiy xabarlardan OLDIN va "Kunlik natija xabari" kalitidan
  // mustaqil: admin ularni o'zi kanalga chiqargan/saqlagan (post-cron.ts).
  const posts = await runChannelPosts(campaign, startedAt, { api: deps.api, bot: deps.bot }, ranking);
  const stop = (reason: string): DailyResult => ({ ...none(reason), posts });

  if (campaignPhase(campaign, startedAt) !== 'ACTIVE') return stop('not_active');
  // Bitta "avtomatik xabarlar" kaliti: o'chiq bo'lsa oxirgi kun eslatmasi ham yo'q.
  if (!campaign.dailyEnabled) return stop('disabled');

  let kind: 'daily_result' | 'last_day';
  if (isLastDayWindow(campaign, startedAt) && !campaign.lastDayReminderSentAt) {
    if (!(await claimLastDay(campaign.id, startedAt))) return stop('already_sent');
    kind = 'last_day';
  } else {
    if (!(await claimDaily(campaign.id, tashkentDayRangeUtc(0, startedAt).start, startedAt))) return stop('already_sent');
    kind = 'daily_result';
  }

  const loaded = await ranking();
  if (!loaded) return { ...stop('ranking_failed'), kind };
  const rules = campaignRewardRules(campaign);
  const template = campaignText(campaign, kind);

  const result: DailyResult = { kind, sent: 0, failed: 0, skipped: 0, posts };
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
