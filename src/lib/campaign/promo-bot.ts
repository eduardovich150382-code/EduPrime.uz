import type { Campaign, PromoCode } from '@prisma/client';
import { db } from '../db';
import { logger } from '../logger';
import type { BotSettings } from '../bot-settings';
import { formatCampaignDate } from './format';
import { markPromoUsed, promoStatus } from './promo-admin';
import { normalizePromoInput } from './promo-code';
import type { TelegramResult } from './telegram';

// Botda `/promo KOD` (A5): kurs admini mijoz yuborgan kodni tekshiradi va
// "ishlatildi" deb belgilaydi. Faqat ADMIN_TELEGRAM_IDS va Sozlamalardagi kurs
// admini uchun; boshqalarga buyruq oshkor qilinmaydi — webhook uni odatdagi
// noma'lum matn kabi ishlaydi. Javoblar oddiy matn (ism ichidagi `<` buzmasin)
// va qattiq yozilgan — faqat adminlar ko'radi.

export const PROMO_CALLBACK_PREFIX = 'promo:use:';

export const PROMO_TEXTS = {
  usage: 'Foydalanish: /promo KOD',
  notFound: "❌ Bunday promokod yo'q",
  marked: '✅ Ishlatildi deb belgilandi',
  alreadyUsed: 'Allaqachon ishlatilgan',
  markButton: '✅ Ishlatildi deb belgilash',
} as const;

export type PromoUser = { id: number; username?: string };

const bareUsername = (value: string) => value.trim().replace(/^@/, '').toLowerCase();

export function canUsePromo(from: PromoUser | undefined, bot: BotSettings, isAdmin: (id: number) => boolean): boolean {
  if (!from) return false;
  if (isAdmin(from.id)) return true;
  const manager = bareUsername(bot.course.managerUsername);
  return Boolean(manager && from.username && bareUsername(from.username) === manager);
}

/** `/promo KOD` → `KOD` (bo'sh — kodsiz); boshqa matn — `null`. */
export function parsePromoCommand(text: string): string | null {
  const match = /^\/promo(?:@\w+)?(?:\s+([\s\S]*))?$/.exec(text.trim());
  return match ? (match[1] ?? '').trim() : null;
}

export function isPromoCallback(data: string): boolean {
  return data.startsWith(PROMO_CALLBACK_PREFIX);
}

export type PromoBotDeps = {
  api(method: string, body: unknown): Promise<TelegramResult>;
  now?: () => Date;
};

type PromoWithCampaign = PromoCode & { campaign: Campaign | null };

export function promoCard(promo: PromoWithCampaign, owner: { firstName: string | null; username: string | null } | null, now: Date): string {
  const name = owner?.firstName?.trim() || '—';
  const username = owner?.username ? ` (@${owner.username})` : '';
  const valid = promoStatus({ usedAt: null, validUntil: promo.validUntil }, now) === 'expired' ? "⌛ muddati o'tgan" : '✅ faol';
  const state = promo.usedAt
    ? `ishlatilgan (${formatCampaignDate(promo.usedAt)}${promo.usedNote ? `, ${promo.usedNote}` : ''})`
    : 'ishlatilmagan';
  return [
    `🎟 ${promo.code} · ${promo.percent}%`,
    `Egasi: ${name}${username} · ID ${promo.telegramId.toString()}`,
    `Aksiya: ${promo.campaign?.title ?? '—'}`,
    `Amal qiladi: ${formatCampaignDate(promo.validUntil)} gacha — ${valid}`,
    `Holat: ${state}`,
    '⚠️ Kodni egasining Telegram akkaunti bilan solishtiring.',
  ].join('\n');
}

async function loadCard(where: { id: string } | { code: string }, now: Date): Promise<{ promo: PromoWithCampaign; text: string } | null> {
  const promo = await db.promoCode.findUnique({ where, include: { campaign: true } }) as PromoWithCampaign | null;
  if (!promo) return null;
  const owner = promo.campaignId
    ? await db.campaignParticipant.findUnique({ where: { campaignId_telegramId: { campaignId: promo.campaignId, telegramId: promo.telegramId } } })
    : null;
  return { promo, text: promoCard(promo, owner, now) };
}

function markupFor(promo: PromoCode) {
  // `promo:use:` + cuid (25) = 35 bayt — callback_data chegarasi (64) ichida.
  return promo.usedAt ? undefined : { inline_keyboard: [[{ text: PROMO_TEXTS.markButton, callback_data: `${PROMO_CALLBACK_PREFIX}${promo.id}` }]] };
}

/** Chaqiruvchi (webhook) huquqni `canUsePromo` bilan tekshirgan. */
export async function handlePromoCommand(chatId: number, arg: string, deps: PromoBotDeps): Promise<void> {
  try {
    const code = normalizePromoInput(arg);
    if (!code) {
      await deps.api('sendMessage', { chat_id: chatId, text: PROMO_TEXTS.usage });
      return;
    }
    const card = await loadCard({ code }, deps.now?.() ?? new Date());
    if (!card) {
      await deps.api('sendMessage', { chat_id: chatId, text: PROMO_TEXTS.notFound });
      return;
    }
    await deps.api('sendMessage', { chat_id: chatId, text: card.text, reply_markup: markupFor(card.promo) });
  } catch (error) {
    logger.error('Promo command failed', { error });
  }
}

export type PromoCallback = { id: string; from: PromoUser; data: string; message?: { chat: { id: number }; message_id: number } };

/** Huquq har callback'da qayta (webhook `canUsePromo`): eski xabardagi tugmani huquqi olingan odam bosa olmasin. */
export async function handlePromoCallback(callback: PromoCallback, deps: PromoBotDeps): Promise<void> {
  try {
    const now = deps.now?.() ?? new Date();
    const id = callback.data.slice(PROMO_CALLBACK_PREFIX.length);
    const note = `bot: ${callback.from.username ? `@${callback.from.username}` : `ID ${callback.from.id}`}`;
    const outcome = await markPromoUsed({ id }, note, now);
    if (outcome === 'not_found') {
      await deps.api('answerCallbackQuery', { callback_query_id: callback.id, text: PROMO_TEXTS.notFound, show_alert: true });
      return;
    }
    await deps.api('answerCallbackQuery', outcome === 'ok'
      ? { callback_query_id: callback.id, text: PROMO_TEXTS.marked }
      : { callback_query_id: callback.id, text: PROMO_TEXTS.alreadyUsed, show_alert: true });
    const card = await loadCard({ id }, now);
    if (card && callback.message) {
      const text = outcome === 'ok' ? `${card.text}\n\n${PROMO_TEXTS.marked}` : card.text;
      await deps.api('editMessageText', { chat_id: callback.message.chat.id, message_id: callback.message.message_id, text });
    }
  } catch (error) {
    logger.error('Promo callback failed', { error });
  }
}
