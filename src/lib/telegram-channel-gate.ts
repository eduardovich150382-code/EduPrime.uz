import { logger } from './logger';
import { parseAdStart } from './telegram-bot-links';
import { btn, type InlineButton } from './telegram-buttons';
import uzMessages from '@/messages/uz.json';

// Majburiy kanal obunasi: /start'da salomlashish matnidan keyin foydalanuvchi
// @EduPrimeFizika kanaliga obuna bo'lmaguncha Mini App tugmalari va bot
// menyusi berilmaydi.
//
// MUHIM: bot @EduPrimeFizika kanalida ADMIN bo'lishi shart — aks holda
// getChatMember xato qaytaradi. Bunday holatda (va tarmoq xatosida)
// tekshiruv o'tkazib yuboriladi: kanal sozlamasi bot ishini to'xtatmasin.

export const REQUIRED_CHANNEL = '@EduPrimeFizika';
export const REQUIRED_CHANNEL_LINK = 'https://t.me/EduPrimeFizika';
export const CHECK_SUBSCRIPTION = 'check_subscription';

const m = uzMessages.telegramBot.channelGate;

export type Membership = 'member' | 'not_member' | 'unknown';

/** getChatMember javobi → a'zolik. Tushunarsiz javob — 'unknown' (o'tkazib yuboriladi). */
export function membershipFromReply(reply: unknown): Membership {
  const record = typeof reply === 'object' && reply !== null ? reply as { ok?: boolean; result?: { status?: string; is_member?: boolean } } : {};
  if (record.ok !== true || !record.result) return 'unknown';
  const { status, is_member: isMember } = record.result;
  if (status === 'creator' || status === 'administrator' || status === 'member') return 'member';
  if (status === 'restricted') return isMember ? 'member' : 'not_member';
  if (status === 'left' || status === 'kicked') return 'not_member';
  return 'unknown';
}

export async function checkChannelMembership(botToken: string, userId: number): Promise<Membership> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: REQUIRED_CHANNEL, user_id: userId }),
    });
    const reply: unknown = await response.json();
    const membership = membershipFromReply(reply);
    if (membership === 'unknown') {
      const description = (reply as { description?: string } | null)?.description;
      logger.error('Channel membership check failed (bot kanalda adminmi?):', { channel: REQUIRED_CHANNEL, description });
    }
    return membership;
  } catch (error) {
    logger.error('Channel membership check error:', { error });
    return 'unknown';
  }
}

/**
 * Saytdan kelgan to'lov (ci_, buy*, obuna) va kirish (login) oqimlari kanalga
 * bog'lanmaydi — to'lov va saytga kirish to'xtab qolmasin.
 */
export function isGatedStart(param: string): boolean {
  if (param === 'login' || param === 'buy' || param === 'obuna') return false;
  return !param.startsWith('ci_') && !param.startsWith('buy_');
}

/** "Obuna bo'ldim" tugmasi reklama kodini saqlaydi — tasdiqdan keyin reklama xabari chiqadi. */
export function checkCallbackData(param: string): string {
  return parseAdStart(param) ? `${CHECK_SUBSCRIPTION}:${param}` : CHECK_SUBSCRIPTION;
}

/** `check_subscription[:param]` → saqlangan start parametri; boshqa callback — `null`. */
export function parseCheckCallback(data: string): string | null {
  if (data === CHECK_SUBSCRIPTION) return '';
  return data.startsWith(`${CHECK_SUBSCRIPTION}:`) ? data.slice(CHECK_SUBSCRIPTION.length + 1) : null;
}

export function channelPromptMarkup(param: string): { inline_keyboard: InlineButton[][] } {
  return {
    inline_keyboard: [
      [btn.success(m.join, { url: REQUIRED_CHANNEL_LINK })],
      [btn.primary(m.check, { callback_data: checkCallbackData(param) })],
    ],
  };
}
