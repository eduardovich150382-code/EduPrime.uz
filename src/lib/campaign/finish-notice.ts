import { db } from '../db';
import { logger } from '../logger';
import { hasPrismaCode } from '../admin-products-api';
import { escapeHtml } from '../html-escape';
import { hasEnded } from './finalize-rules';
import { finishNoticeKey } from './internal-keys';
import type { Campaign } from './store';
import type { TelegramResult } from './telegram';

// Kunlik cron: aksiya tugagach adminlarga bir martalik eslatma (A5) —
// qayta tekshiruv va yakunlashni unutib qo'ymasin. Qoralama uchun yo'q: u
// adminlarning o'z sinovi, ular uni panelda o'zlari yakunlaydi.

export type FinishNoticeDeps = {
  adminIds: string[];
  appUrl: string;
  send(chatId: string, text: string): Promise<TelegramResult>;
};

export type FinishNoticeResult = 'sent' | 'already' | 'skipped';

export function finishNoticeText(campaign: Pick<Campaign, 'id' | 'title'>, appUrl: string): string {
  return `🏁 «${escapeHtml(campaign.title)}» aksiyasi tugadi. Qayta tekshiruv va yakunlash: ${appUrl}/uz/admin/campaigns/${campaign.id}`;
}

/**
 * Belgi yuborishdan OLDIN atomar yoziladi (`create` → P2002 = allaqachon):
 * Vercel cron'ni ikki marta chaqirsa ham eslatma bir marta. Narxi: yuborish
 * yiqilsa qayta urinilmaydi — bosqich belgisi panelda baribir ko'rinadi.
 */
export async function sendFinishNotice(campaign: Campaign, now: Date, deps: FinishNoticeDeps): Promise<FinishNoticeResult> {
  if (!campaign.isPublished || !hasEnded(campaign, now) || !deps.adminIds.length) return 'skipped';
  try {
    await db.systemSetting.create({ data: { key: finishNoticeKey(campaign.id), value: now.toISOString() } });
  } catch (error) {
    if (hasPrismaCode(error, 'P2002')) return 'already';
    logger.error('Campaign finish notice claim failed', { error, campaignId: campaign.id });
    return 'skipped';
  }
  const text = finishNoticeText(campaign, deps.appUrl);
  for (const adminId of deps.adminIds) {
    const result = await deps.send(adminId, text);
    if (!result.ok) logger.warn('Campaign finish notice not delivered', { adminId, description: result.description });
  }
  return 'sent';
}
