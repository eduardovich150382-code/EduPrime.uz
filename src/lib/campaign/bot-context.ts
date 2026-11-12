import type { BotSettings } from '../bot-settings';
import type { Membership } from '../telegram-channel-gate';
import { btn, type InlineButton } from '../telegram-buttons';
import uzMessages from '@/messages/uz.json';
import { campaignPhase, canJoin } from './phase';
import { campaignVars, type VarsInput } from './format';
import { campaignText, renderTemplate, type CampaignTextKey } from './texts';
import type { Campaign } from './store';

// Aksiya bot oqimining umumiy turlari va kichik yordamchilari. Transport va
// a'zolik tekshiruvi parametr bo'lib keladi (telegram-bot-menu.ts dagi
// BotTransport kabi) — testda Telegram'siz mock qilinadi.

export const cm = uzMessages.telegramBot.campaign;

export const CMP_OK = 'cmp:ok';
export const CMP_JOIN = 'cmp:join';
export const CMP_ME = 'cmp:me';
export const CMP_RULES = 'cmp:rules';

export type Markup = { inline_keyboard: InlineButton[][] };
type SendOptions = { reply_markup?: Markup; disable_web_page_preview?: boolean };

export interface CampaignTransport {
  send(chatId: number | string, text: string, options?: SendOptions): Promise<unknown>;
  sendPhoto(chatId: number | string, photo: string, caption: string, options?: { reply_markup?: Markup }): Promise<unknown>;
  answer(callbackQueryId: string, options?: { text?: string; show_alert?: boolean }): Promise<unknown>;
}

export interface CampaignBotCtx {
  chatId: number;
  userId: number;
  username: string;
  firstName: string;
  bot: BotSettings;
  isAdmin(telegramId: number | string | bigint): boolean;
  checkMembership(userId: number, channel: string): Promise<Membership>;
  transport: CampaignTransport;
  /** Oddiy /start oqimi (majburiy kanal gate'i bilan) — route.ts beradi. */
  startDefault(): Promise<void>;
}

export function isJoinable(campaign: Campaign, telegramId: number | string | bigint, ctx: Pick<CampaignBotCtx, 'isAdmin'>, now = new Date()): boolean {
  return canJoin(campaignPhase(campaign, now), ctx.isAdmin(telegramId));
}

export function joinButtonRow(): InlineButton[] {
  return [btn.success(cm.joinButton, { callback_data: CMP_JOIN })];
}

export function renderCampaignText(campaign: Campaign, key: CampaignTextKey, input: Omit<VarsInput, 'campaign'>): string {
  return renderTemplate(campaignText(campaign, key), campaignVars({ campaign, ...input }));
}

/** Aksiya yo'q yoki qatnashib bo'lmaydi. Aksiya yozuvi bo'lsa admin matni, yo'q bo'lsa standart. */
export async function sendNotActive(ctx: CampaignBotCtx, campaign: Campaign | null): Promise<void> {
  const text = campaign
    ? renderCampaignText(campaign, 'not_active', { bot: ctx.bot, firstName: ctx.firstName })
    : renderTemplate(campaignText({ texts: {} }, 'not_active'), {});
  await ctx.transport.send(ctx.chatId, text);
}

/** Telegram username'larida katta-kichik harf farqi yo'q. */
export function sameChannel(a: string, b: string): boolean {
  return a.trim().replace(/^@/, '').toLowerCase() === b.trim().replace(/^@/, '').toLowerCase();
}
