import { logger } from '../logger';
import { btn, type InlineButton } from '../telegram-buttons';
import { fill } from '../telegram-bot-menu';
import { campaignLink, campaignVars } from './format';
import { campaignText, renderTemplate, renderUrl, type TemplateVars } from './texts';
import { findParticipant, getCurrentCampaign, joinCampaign, loadSharePost, participantStanding, type Campaign } from './store';
import {
  CMP_JOIN, CMP_ME, CMP_RULES, cm, isJoinable, joinButtonRow, renderCampaignText, sameChannel, sendNotActive,
  type CampaignBotCtx, type Markup,
} from './bot-context';

// Qatnashish: /start aksiya, /aksiya, `cmp:join` — hammasi shu yerga keladi.
// Majburiy kanal gate'i route.ts da (chaqirishdan oldin) ishlaydi.

const CAPTION_LIMIT = 1024;

function shareUrl(link: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(cm.shareText)}`;
}

function participantMarkup(link: string): Markup {
  return {
    inline_keyboard: [
      [btn.success(cm.shareButton, { url: shareUrl(link) })],
      [btn.primary(cm.myResultButton, { callback_data: CMP_ME }), btn.primary(cm.rulesButton, { callback_data: CMP_RULES })],
    ],
  };
}

// Admin yozgan tugma havolasi noto'g'ri bo'lsa Telegram butun xabarni rad
// etadi — shunda ishtirokchi ulashadigan postni umuman olmasdi.
function isButtonUrl(url: string): boolean {
  return /^(https?|tg):\/\/\S+$/.test(url);
}

/**
 * Ishtirokchi aynan shu xabarni forward qiladi. Rasm caption'i 1024
 * belgidan oshsa Telegram rad etadi — rasmsiz matn yuboriladi (A3 saqlashda
 * uzunlikni cheklaydi).
 */
async function sendSharePost(ctx: CampaignBotCtx, campaign: Campaign, vars: TemplateVars): Promise<void> {
  const post = await loadSharePost(campaign.id);
  if (!post) {
    await ctx.transport.send(ctx.chatId, renderTemplate(campaignText(campaign, 'share_post'), vars));
    return;
  }
  const text = renderTemplate(post.text, vars);
  const url = post.buttonUrl ? renderUrl(post.buttonUrl, vars) : '';
  const buttons: InlineButton[][] = post.buttonText && isButtonUrl(url) ? [[btn.success(post.buttonText, { url })]] : [];
  const reply_markup = buttons.length ? { inline_keyboard: buttons } : undefined;
  if (post.imageUrl && Array.from(text).length <= CAPTION_LIMIT) {
    await ctx.transport.sendPhoto(ctx.chatId, post.imageUrl, text, { reply_markup });
    return;
  }
  if (post.imageUrl) logger.warn('Campaign SHARE caption too long, sending text only', { campaignId: campaign.id });
  await ctx.transport.send(ctx.chatId, text, { reply_markup });
}

export type JoinResult = 'joined' | 'not_active' | 'subscribe_prompt' | 'error';

export async function joinFlow(ctx: CampaignBotCtx): Promise<JoinResult> {
  const campaign = await getCurrentCampaign();
  if (!campaign || !isJoinable(campaign, ctx.userId, ctx)) {
    await sendNotActive(ctx, campaign);
    return 'not_active';
  }

  // Aksiya kanali majburiy kanal bilan bir xil va gate yoqilgan bo'lsa,
  // gate uni allaqachon tekshirgan — qayta so'rov yubormaymiz.
  const gateCovers = ctx.bot.requiredChannel.enabled && sameChannel(ctx.bot.requiredChannel.username, campaign.channelUsername);
  if (!gateCovers && await ctx.checkMembership(ctx.userId, campaign.channelUsername) === 'not_member') {
    await ctx.transport.send(ctx.chatId, fill(cm.subscribeToJoin, { channel: campaign.channelUsername }), {
      reply_markup: {
        inline_keyboard: [
          [btn.success(cm.subscribeButton, { url: campaign.channelLink })],
          [btn.primary(cm.confirmButton, { callback_data: CMP_JOIN })],
        ],
      },
    });
    return 'subscribe_prompt';
  }

  const participant = await joinCampaign(campaign.id, { telegramId: ctx.userId, username: ctx.username, firstName: ctx.firstName });
  if (!participant) {
    await ctx.transport.send(ctx.chatId, cm.joinError);
    return 'error';
  }
  const vars = campaignVars({ campaign, bot: ctx.bot, firstName: ctx.firstName, refCode: participant.refCode });
  await ctx.transport.send(ctx.chatId, renderTemplate(campaignText(campaign, 'join_welcome'), vars), {
    disable_web_page_preview: true,
    reply_markup: participantMarkup(campaignLink(participant.refCode)),
  });
  await sendSharePost(ctx, campaign, vars);
  return 'joined';
}

/** Ishtirokchi bo'lmasa — qatnashish taklifi (qatnasha olsa tugma bilan), aks holda `not_active`. */
async function sendJoinInvite(ctx: CampaignBotCtx, campaign: Campaign): Promise<void> {
  if (!isJoinable(campaign, ctx.userId, ctx)) {
    await sendNotActive(ctx, campaign);
    return;
  }
  await ctx.transport.send(ctx.chatId, cm.joinInvite, { reply_markup: { inline_keyboard: [joinButtonRow()] } });
}

export async function sendMyResult(ctx: CampaignBotCtx): Promise<void> {
  const campaign = await getCurrentCampaign();
  if (!campaign) {
    await sendNotActive(ctx, null);
    return;
  }
  const participant = await findParticipant(campaign.id, ctx.userId);
  if (!participant) {
    await sendJoinInvite(ctx, campaign);
    return;
  }
  const standing = await participantStanding(campaign, participant.id);
  if (!standing) {
    await ctx.transport.send(ctx.chatId, cm.joinError);
    return;
  }
  const text = renderCampaignText(campaign, 'my_result', { bot: ctx.bot, firstName: ctx.firstName, refCode: participant.refCode, standing });
  await ctx.transport.send(ctx.chatId, text, { disable_web_page_preview: true, reply_markup: participantMarkup(campaignLink(participant.refCode)) });
}

export async function sendRules(ctx: CampaignBotCtx): Promise<void> {
  const campaign = await getCurrentCampaign();
  if (!campaign) {
    await sendNotActive(ctx, null);
    return;
  }
  const participant = await findParticipant(campaign.id, ctx.userId);
  if (!participant) {
    // Qoidalarni ko'rsatamiz, so'ng qatnashish taklifi.
    await ctx.transport.send(ctx.chatId, renderCampaignText(campaign, 'rules', { bot: ctx.bot, firstName: ctx.firstName }));
    await sendJoinInvite(ctx, campaign);
    return;
  }
  await ctx.transport.send(ctx.chatId, renderCampaignText(campaign, 'rules', { bot: ctx.bot, firstName: ctx.firstName, refCode: participant.refCode }));
}
