import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { getBotSettings } from '@/lib/bot-settings';
import { jsonError } from '@/lib/campaign/admin-api';
import { loadCampaignParam, paramId } from '@/lib/campaign/finalize-api';
import { winnerText } from '@/lib/campaign/notify';
import { campaignRewardRules, standingOf } from '@/lib/campaign/rewards';
import { loadRanking } from '@/lib/campaign/store';
import { telegramApi } from '@/lib/campaign/telegram';

type Context = { params: Promise<{ id: string; codeId: string }> };

/** Telegram rad etgan qayta yuborish — sabab admin tushunadigan tilda (xabar g'olibga, adminga emas). */
function explainResendError(code: number | undefined, description: string | undefined): string {
  if (code === 403 || /blocked|deactivated|chat not found|can't initiate/i.test(description ?? '')) {
    return 'Bot foydalanuvchiga yoza olmaydi: u botni bloklagan yoki hech qachon /start bosmagan';
  }
  return `Telegram xatosi: ${description || "noma'lum"}`;
}

/** POST /api/admin/campaigns/[id]/promo-codes/[codeId]/resend — `winner` xabarini egasiga qayta (xabarni yo'qotgan bo'lsa). */
export async function POST(_request: NextRequest, context: Context) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const campaign = await loadCampaignParam(context);
    if (campaign instanceof NextResponse) return campaign;
    const codeId = paramId((await context.params).codeId);
    const promo = codeId ? await db.promoCode.findFirst({ where: { id: codeId, campaignId: campaign.id } }) : null;
    if (!promo) return jsonError(404, 'Promokod topilmadi');
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return jsonError(500, 'TELEGRAM_BOT_TOKEN sozlanmagan');

    const participant = await db.campaignParticipant.findUnique({ where: { campaignId_telegramId: { campaignId: campaign.id, telegramId: promo.telegramId } } });
    const loaded = participant ? await loadRanking(campaign.id) : null;
    const standing = participant && loaded ? standingOf(loaded.ranking, participant.id, campaignRewardRules(campaign)) : null;
    const text = winnerText(campaign, await getBotSettings(), { firstName: participant?.firstName ?? null }, promo, standing);
    const sent = await telegramApi(token, 'sendMessage', { chat_id: promo.telegramId.toString(), text, parse_mode: 'HTML', disable_web_page_preview: true });
    if (!sent.ok) return jsonError(sent.error_code === undefined ? 502 : 400, explainResendError(sent.error_code, sent.description));
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error('POST /api/admin/campaigns/[id]/promo-codes/[codeId]/resend error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}
