import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { jsonError } from '@/lib/campaign/admin-api';
import { captureKey, captureStartText, startCapture } from '@/lib/campaign/capture';
import { FINALIZED_ERROR, adminTelegram, botToken, loadPostTarget, type PostRouteContext } from '@/lib/campaign/post-api';
import { explainPostError } from '@/lib/campaign/post-telegram';
import { telegramApi } from '@/lib/campaign/telegram';

/**
 * POST /api/admin/campaigns/[id]/posts/[kind]/capture — adminning keyingi
 * shaxsiy xabari (10 daqiqa ichida) shu postga aylanadi. Webhook faqat
 * ADMIN_TELEGRAM_IDS dagi chatni tekshiradi — aks holda admin yozsa ham jimgina
 * hech narsa bo'lmasdi, shuning uchun bu shart oldindan aytiladi.
 */
export async function POST(_request: NextRequest, context: PostRouteContext) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  try {
    const target = await loadPostTarget(context);
    if (target instanceof NextResponse) return target;
    const { campaign, kind } = target;
    if (campaign.finalizedAt) return jsonError(409, FINALIZED_ERROR);

    const admin = await adminTelegram(user.id);
    if (!admin?.telegramId) return jsonError(400, "Profilingiz Telegram bilan bog'lanmagan");
    const adminIds = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!adminIds.includes(admin.telegramId)) return jsonError(400, "Telegram ID'ingiz botning admin ro'yxatida (ADMIN_TELEGRAM_IDS) yo'q");
    const token = botToken();
    if (!token) return jsonError(500, 'TELEGRAM_BOT_TOKEN sozlanmagan');

    const expiresAt = await startCapture(admin.telegramId, campaign.id, kind, new Date());
    const sent = await telegramApi(token, 'sendMessage', { chat_id: admin.telegramId, text: captureStartText(kind) });
    if (!sent.ok) {
      // Bot adminga yoza olmasa capture'ni ochiq qoldirmaymiz — keyingi tasodifiy xabar postga aylanmasin.
      await db.systemSetting.deleteMany({ where: { key: captureKey(admin.telegramId) } });
      return jsonError(sent.error_code === undefined ? 502 : 400, explainPostError(sent));
    }
    return NextResponse.json({ ok: true, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    logger.error('POST /api/admin/campaigns/[id]/posts/[kind]/capture error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}
