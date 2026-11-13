import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { revalidateCampaigns } from '@/lib/cache-tags';
import { jsonError } from '@/lib/campaign/admin-api';
import { endedError, loadCampaignParam, type IdContext } from '@/lib/campaign/finalize-api';
import { runRecheck } from '@/lib/campaign/recheck';
import { telegramApi } from '@/lib/campaign/telegram';

// 45 s byudjet + javob uchun zaxira (recheck.ts).
export const maxDuration = 60;

/**
 * POST /api/admin/campaigns/[id]/recheck — tugagan aksiya referallarini kanalda
 * qayta tekshirish (bitta partiya). Admin sahifasi `remaining = 0` bo'lguncha
 * yoki xato chiqquncha qayta chaqiradi.
 */
export async function POST(_request: NextRequest, context: IdContext) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const campaign = await loadCampaignParam(context);
    if (campaign instanceof NextResponse) return campaign;
    const blocked = endedError(campaign, new Date());
    if (blocked) return blocked;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return jsonError(500, 'TELEGRAM_BOT_TOKEN sozlanmagan');

    const result = await runRecheck(campaign, {
      getChatMember: (userId) => telegramApi(token, 'getChatMember', { chat_id: campaign.channelUsername, user_id: userId }),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      now: () => new Date(),
    });
    revalidateCampaigns();
    return NextResponse.json(result);
  } catch (err) {
    logger.error('POST /api/admin/campaigns/[id]/recheck error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}
