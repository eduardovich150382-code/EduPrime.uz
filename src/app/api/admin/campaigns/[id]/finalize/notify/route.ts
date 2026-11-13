import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { revalidateCampaigns } from '@/lib/cache-tags';
import { getBotSettings } from '@/lib/bot-settings';
import { jsonError } from '@/lib/campaign/admin-api';
import { loadCampaignParam, type IdContext } from '@/lib/campaign/finalize-api';
import { notifyStatus, runFinalizeNotify } from '@/lib/campaign/notify';
import { telegramApi } from '@/lib/campaign/telegram';

// 45 s byudjet + javob uchun zaxira (notify.ts).
export const maxDuration = 60;

const NOT_FINALIZED = 'Aksiya hali yakunlanmagan';

/** GET — yuborish holati: sahifa yopilib qolgan bo'lsa "Davom ettirish" tugmasi shundan bilinadi. */
export async function GET(_request: NextRequest, context: IdContext) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const campaign = await loadCampaignParam(context);
    if (campaign instanceof NextResponse) return campaign;
    if (!campaign.finalizedAt) return jsonError(400, NOT_FINALIZED);
    return NextResponse.json(await notifyStatus(campaign));
  } catch (err) {
    logger.error('GET /api/admin/campaigns/[id]/finalize/notify error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}

/** POST — `winner` / `no_prize` xabarlarining bitta partiyasi. Sahifa `remaining = 0` bo'lguncha qayta chaqiradi. */
export async function POST(_request: NextRequest, context: IdContext) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const campaign = await loadCampaignParam(context);
    if (campaign instanceof NextResponse) return campaign;
    if (!campaign.finalizedAt) return jsonError(400, NOT_FINALIZED);
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return jsonError(500, 'TELEGRAM_BOT_TOKEN sozlanmagan');

    const result = await runFinalizeNotify(campaign, {
      bot: await getBotSettings(),
      send: (chatId, text) => telegramApi(token, 'sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      now: () => new Date(),
    });
    if (!result.ok) return jsonError(result.status, result.error);
    revalidateCampaigns();
    return NextResponse.json({ sent: result.sent, failed: result.failed, remaining: result.remaining });
  } catch (err) {
    logger.error('POST /api/admin/campaigns/[id]/finalize/notify error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}
