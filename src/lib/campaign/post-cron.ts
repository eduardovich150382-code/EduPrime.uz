import type { BotSettings } from '../bot-settings';
import { logger } from '../logger';
import { campaignPhase, isLastDayWindow } from './phase';
import { claimAutoPublish, clearChannelMessage, loadPosts, revertPublish, setChannelMessage } from './post-store';
import { editOutcome, editPost, sendPost, type EditOutcome, type TelegramApi } from './post-telegram';
import { postVars } from './post-vars';
import { buildPostMessage } from './posts';
import type { Campaign, CampaignRanking } from './store';

// Kunlik cron'ning kanal qismi (A4): oxirgi kun postini chiqarish va reyting
// postini yangilash. Shaxsiy xabarlardan OLDIN ishlaydi — ular 50 s byudjetni
// yeb qo'ysa ham kanal posti qolib ketmasin. Hech qachon throw qilmaydi:
// kanal xatosi shaxsiy xabarlarni to'xtatmasin.

export type ChannelPostsResult = { lastDay?: 'published' | 'failed'; leaderboard?: EditOutcome };

export type ChannelPostsDeps = { api: TelegramApi; bot: BotSettings };

export async function runChannelPosts(
  campaign: Campaign, now: Date, deps: ChannelPostsDeps, ranking: () => Promise<CampaignRanking | null>,
): Promise<ChannelPostsResult> {
  const result: ChannelPostsResult = {};
  // Reyting va "oxirgi kun" faqat faol aksiyada ma'noli: tugagach "hali qo'shilish mumkin" yolg'on bo'lardi.
  if (campaignPhase(campaign, now) !== 'ACTIVE') return result;
  try {
    const posts = await loadPosts(campaign.id);
    const channel = campaign.channelUsername;

    // LAST_DAY: yozuv borligi — admin roziligi (standart matn bilan ham). `last_day`
    // xabari va "Kunlik natija xabari" kalitidan mustaqil; takror chiqmasligini
    // `publishedAt` qulfi ta'minlaydi (cron ikki marta chaqirilsa ham bir marta).
    const lastDay = posts.get('LAST_DAY');
    if (lastDay && lastDay.publishedAt === null && isLastDayWindow(campaign, now) && await claimAutoPublish(lastDay.id, now)) {
      const message = buildPostMessage('LAST_DAY', lastDay, postVars('LAST_DAY', { campaign, bot: deps.bot, ranking: await ranking() }));
      const sent = await sendPost(deps.api, channel, message);
      if (sent.result.ok && sent.messageId !== null) {
        await setChannelMessage(lastDay.id, sent.messageId);
        result.lastDay = 'published';
      } else {
        await revertPublish(lastDay.id, null);
        logger.warn('Campaign LAST_DAY post failed', { campaignId: campaign.id, description: sent.result.description });
        result.lastDay = 'failed';
      }
    }

    // LEADERBOARD: kanalda bo'lsa har kuni yangi raqamlar bilan bitta tahrir.
    const leaderboard = posts.get('LEADERBOARD');
    if (leaderboard?.channelMessageId) {
      const messageId = leaderboard.channelMessageId;
      const message = buildPostMessage('LEADERBOARD', leaderboard, postVars('LEADERBOARD', { campaign, bot: deps.bot, ranking: await ranking() }));
      const outcome = editOutcome(await editPost(deps.api, channel, messageId, message));
      result.leaderboard = outcome;
      if (outcome === 'not_found') {
        await clearChannelMessage(leaderboard.id, messageId, false);
        logger.warn('Campaign LEADERBOARD post not found in channel', { campaignId: campaign.id, messageId });
      } else if (outcome !== 'ok' && outcome !== 'not_modified') {
        logger.warn('Campaign LEADERBOARD edit failed', { campaignId: campaign.id, outcome });
      }
    }
  } catch (error) {
    logger.error('Campaign channel posts error:', { error, campaignId: campaign.id });
  }
  return result;
}
