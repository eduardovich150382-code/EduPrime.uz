import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { getBotSettings } from '@/lib/bot-settings';
import { campaignIdSchema, explainTelegramError, jsonError, readJson, testMessageSchema } from '@/lib/campaign/admin-api';
import { buildSampleVars } from '@/lib/campaign/sample-vars';
import { telegramApi } from '@/lib/campaign/telegram';
import { campaignText, plainText, renderTemplate } from '@/lib/campaign/texts';

/**
 * POST /api/admin/campaigns/[id]/test-message — `{ key, text? }`. `text`
 * berilsa hali SAQLANMAGAN matn sinaladi. Xabar adminning o'z Telegramiga
 * namunaviy qiymatlar bilan ketadi; Telegram rad etsa sababi o'zbekcha.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  try {
    const parsed = testMessageSchema.safeParse(await readJson(request));
    const id = campaignIdSchema.safeParse((await context.params).id);
    if (!parsed.success || !id.success) return jsonError(400, "Ma'lumot noto'g'ri");
    const { key, text } = parsed.data;

    const [campaign, admin] = await Promise.all([
      db.campaign.findUnique({ where: { id: id.data } }),
      db.user.findUnique({ where: { id: user.id }, select: { telegramId: true, name: true } }),
    ]);
    if (!campaign) return jsonError(404, 'Aksiya topilmadi');
    if (!admin?.telegramId) return jsonError(400, "Profilingiz Telegram bilan bog'lanmagan");

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return jsonError(500, 'TELEGRAM_BOT_TOKEN sozlanmagan');

    // Bo'sh matn — standart (saqlashdagi qoida bilan bir xil).
    const template = text?.trim() ? text : campaignText(campaign, key);
    const rendered = renderTemplate(template, buildSampleVars(campaign, await getBotSettings(), admin.name ?? user.name));
    const header = `🧪 SINOV · ${key}`;
    // Alert botda HTML'siz chiqadi — sinov ham shunday, aks holda admin teglarni ko'rmasdi.
    const body = key === 'not_subscribed_alert'
      ? { chat_id: admin.telegramId, text: `${header}\n\n${plainText(rendered)}` }
      : { chat_id: admin.telegramId, text: `${header}\n\n${rendered}`, parse_mode: 'HTML', disable_web_page_preview: true };

    const result = await telegramApi(token, 'sendMessage', body);
    if (result.ok) return NextResponse.json({ ok: true });
    if (result.error_code === undefined) return jsonError(502, "Telegram bilan aloqa o'rnatilmadi");
    return jsonError(400, explainTelegramError(result.description), { telegram: result.description ?? null });
  } catch (err) {
    logger.error('POST /api/admin/campaigns/[id]/test-message error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}
