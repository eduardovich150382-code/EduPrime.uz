import { logger } from '../logger';
import { btn } from '../telegram-buttons';
import { campaignVars } from './format';
import { campaignText, plainText, renderTemplate } from './texts';
import {
  confirmReferral, createPendingReferral, findParticipantByCode, findReferral, getCurrentCampaign, participantStanding,
  type Campaign, type CampaignParticipant,
} from './store';
import {
  CMP_JOIN, CMP_ME, CMP_OK, CMP_RULES, cm, isJoinable, joinButtonRow, renderCampaignText, sendNotActive,
  type CampaignBotCtx, type Markup,
} from './bot-context';
import { joinFlow, sendMyResult, sendRules } from './bot-join';

// Referral aksiyaning bot oqimi. route.ts faqat yo'naltiradi — mantiq shu
// yerda. Har bir qadam xatoga chidamli: store xato bo'lsa "aksiya yo'q"
// qaytaradi va foydalanuvchi oddiy /start oqimiga tushadi.

export { joinFlow, CMP_JOIN };
export type { CampaignBotCtx };

export function isCampaignCallback(data: string): boolean {
  return data.startsWith('cmp:');
}

/** Welcome'dagi 🎁 tugmasi: joriy aksiyada shu foydalanuvchi qatnasha olsa. */
export async function campaignJoinVisible(userId: number, isAdmin: CampaignBotCtx['isAdmin']): Promise<boolean> {
  const campaign = await getCurrentCampaign();
  return campaign !== null && isJoinable(campaign, userId, { isAdmin });
}

async function sendReferralPrompt(ctx: CampaignBotCtx, campaign: Campaign): Promise<void> {
  const markup: Markup = {
    inline_keyboard: [
      [btn.success(cm.subscribeButton, { url: campaign.channelLink })],
      [btn.primary(cm.confirmButton, { callback_data: CMP_OK })],
    ],
  };
  await ctx.transport.send(ctx.chatId, renderCampaignText(campaign, 'referral_prompt', { bot: ctx.bot, firstName: ctx.firstName }), { reply_markup: markup });
}

/**
 * `/start c_<kod>` — majburiy kanal gate'idan OLDIN. `'stop'` — taklif
 * so'rovi yuborildi, oddiy /start yo'q (aks holda gate so'rovi bilan aralashib
 * ketardi). `'continue'` — chaqiruvchi oddiy /start'ni `''` parametr bilan davom ettiradi.
 */
export async function handleCampaignStart(ctx: CampaignBotCtx, code: string): Promise<'stop' | 'continue'> {
  const participant = await findParticipantByCode(code);
  const campaign = participant?.campaign ?? null;
  // Qoralamada havola faqat admin ishtirokchiniki bo'lsa ishlaydi — u esa hamma uchun ishlaydi.
  if (!participant || !campaign || !isJoinable(campaign, participant.telegramId, ctx)) {
    await sendNotActive(ctx, campaign);
    return 'continue';
  }
  if (participant.telegramId === BigInt(ctx.userId)) return 'continue';

  const existing = await findReferral(campaign.id, ctx.userId);
  if (existing) {
    // Qaror (PR): xuddi shu havola qayta bosilsa va hali PENDING bo'lsa,
    // ✅ tugmasi qayta beriladi — aks holda u yo'qolib, referal osilib qolardi.
    if (existing.status === 'PENDING' && existing.participantId === participant.id) {
      await sendReferralPrompt(ctx, campaign);
      return 'stop';
    }
    return 'continue';
  }

  const membership = await ctx.checkMembership(ctx.userId, campaign.channelUsername);
  if (membership === 'member') {
    const joinable = isJoinable(campaign, ctx.userId, ctx);
    await ctx.transport.send(ctx.chatId, renderCampaignText(campaign, 'already_member', { bot: ctx.bot, firstName: ctx.firstName }),
      joinable ? { reply_markup: { inline_keyboard: [joinButtonRow()] } } : {});
    return 'continue';
  }
  if (membership === 'unknown') {
    logger.error('Campaign referral: membership unknown, no point', { campaignId: campaign.id, channel: campaign.channelUsername });
    return 'continue';
  }

  const created = await createPendingReferral(campaign.id, participant.id, { telegramId: ctx.userId, username: ctx.username, firstName: ctx.firstName });
  if (created === null) return 'continue';
  await sendReferralPrompt(ctx, campaign);
  return 'stop';
}

async function notifyReferrer(ctx: CampaignBotCtx, campaign: Campaign, participant: CampaignParticipant): Promise<void> {
  // Taklif qilganga xabar — yangi odamning oqimini hech qachon to'xtatmaydi.
  try {
    const standing = await participantStanding(campaign, participant.id);
    if (!standing) return;
    const text = renderTemplate(campaignText(campaign, 'point_added'),
      campaignVars({ campaign, bot: ctx.bot, firstName: participant.firstName, refCode: participant.refCode, standing }));
    await ctx.transport.send(participant.telegramId.toString(), text, { disable_web_page_preview: true });
  } catch (error) {
    logger.error('Campaign point_added send failed', { error });
  }
}

export type ConfirmResult =
  | { status: 'none' | 'already'; campaign: Campaign | null }
  | { status: 'confirmed' | 'not_member' | 'unknown'; campaign: Campaign };

/**
 * PENDING referalni tasdiqlash — `cmp:ok` va majburiy kanal gate'ining
 * "Obuna bo'ldim" i ikkalasi shuni chaqiradi: odam aksiya tugmasi o'rniga
 * gate orqali obuna bo'lsa ham ball yo'qolmasin. Bosqich taklif qilgan
 * ishtirokchi bo'yicha (qoralamada — admin) tekshiriladi.
 */
export async function confirmPendingReferral(ctx: CampaignBotCtx): Promise<ConfirmResult> {
  const campaign = await getCurrentCampaign();
  if (!campaign) return { status: 'none', campaign: null };
  const referral = await findReferral(campaign.id, ctx.userId);
  if (!referral) return { status: 'none', campaign };
  if (referral.status !== 'PENDING') return { status: referral.status === 'ACTIVE' ? 'already' : 'none', campaign };
  if (!isJoinable(campaign, referral.participant.telegramId, ctx)) return { status: 'none', campaign };

  const membership = await ctx.checkMembership(ctx.userId, campaign.channelUsername);
  if (membership === 'not_member') return { status: 'not_member', campaign };
  if (membership === 'unknown') return { status: 'unknown', campaign };

  // Parallel bosishda faqat bittasi `true` oladi — ikkinchisi "allaqachon".
  if (!(await confirmReferral(referral.id))) return { status: 'already', campaign };
  await notifyReferrer(ctx, campaign, referral.participant);
  return { status: 'confirmed', campaign };
}

async function handleConfirm(ctx: CampaignBotCtx, callbackId: string): Promise<void> {
  const result = await confirmPendingReferral(ctx);
  switch (result.status) {
    case 'not_member': {
      const alert = renderCampaignText(result.campaign, 'not_subscribed_alert', { bot: ctx.bot, firstName: ctx.firstName });
      await ctx.transport.answer(callbackId, { text: plainText(alert), show_alert: true });
      return;
    }
    case 'unknown':
      await ctx.transport.answer(callbackId, { text: cm.checkFailedAlert, show_alert: true });
      return;
    case 'none':
      await ctx.transport.answer(callbackId, { text: cm.notFoundToast });
      await ctx.startDefault();
      return;
    case 'already':
      await ctx.transport.answer(callbackId);
      await ctx.startDefault();
      return;
    case 'confirmed': {
      await ctx.transport.answer(callbackId);
      const campaign = result.campaign;
      const joinable = isJoinable(campaign, ctx.userId, ctx);
      await ctx.transport.send(ctx.chatId, renderCampaignText(campaign, 'invite_new', { bot: ctx.bot, firstName: ctx.firstName }),
        joinable ? { reply_markup: { inline_keyboard: [joinButtonRow()] } } : {});
      await ctx.startDefault();
      return;
    }
  }
}

/** `cmp:*` callback'lari. Javob (answerCallbackQuery) shu yerda — `cmp:ok` alert matni bilan javob beradi. */
export async function handleCampaignCallback(ctx: CampaignBotCtx, data: string, callbackId: string): Promise<void> {
  if (data === CMP_OK) {
    await handleConfirm(ctx, callbackId);
    return;
  }
  await ctx.transport.answer(callbackId);
  if (data === CMP_JOIN) await joinFlow(ctx);
  else if (data === CMP_ME) await sendMyResult(ctx);
  else if (data === CMP_RULES) await sendRules(ctx);
}
