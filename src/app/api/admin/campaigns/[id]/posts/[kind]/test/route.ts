import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { getBotSettings } from '@/lib/bot-settings';
import { jsonError, readJson } from '@/lib/campaign/admin-api';
import { adminTelegram, blankToNull, botToken, loadPostTarget, postDraftSchema, routeApi, type PostRouteContext } from '@/lib/campaign/post-api';
import { explainPostError, sendPost } from '@/lib/campaign/post-telegram';
import { postSampleVars, postVars } from '@/lib/campaign/post-vars';
import { POST_KIND_CONFIG, buildPostMessage, defaultPostText, validatePost } from '@/lib/campaign/posts';
import { SAMPLE_REF_CODE } from '@/lib/campaign/sample-vars';
import { loadRanking } from '@/lib/campaign/store';

/**
 * POST /api/admin/campaigns/[id]/posts/[kind]/test — "O'zimga sinov". Post
 * kanalda qanday chiqsa, adminning o'z chatiga aynan shunday: rasm, caption,
 * tugma va haqiqiy qiymatlar (reyting, sonlar). Saqlanmagan qoralama
 * maydonlari berilishi mumkin. Sarlavha alohida xabar — caption'ga qo'shilsa
 * uzunlik kanaldagidan farq qilardi.
 */
export async function POST(request: NextRequest, context: PostRouteContext) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  try {
    const parsed = postDraftSchema.safeParse((await readJson(request)) ?? {});
    if (!parsed.success) return jsonError(400, "Ma'lumot noto'g'ri");
    const target = await loadPostTarget(context);
    if (target instanceof NextResponse) return target;
    const { campaign, kind, post } = target;

    const draftText = parsed.data.text ?? post?.text ?? defaultPostText(kind, campaign);
    const buttonText = blankToNull(parsed.data.buttonText);
    const buttonUrl = blankToNull(parsed.data.buttonUrl);
    const record = {
      text: draftText.trim() ? draftText : defaultPostText(kind, campaign),
      imageUrl: post?.imageUrl ?? null,
      buttonText: buttonText !== undefined ? buttonText : post?.buttonText ?? null,
      buttonUrl: buttonUrl !== undefined ? buttonUrl : post?.buttonUrl ?? null,
    };
    const bot = await getBotSettings();
    const admin = await adminTelegram(user.id);
    const issues = validatePost(kind, { ...record, hasImage: Boolean(record.imageUrl) }, postSampleVars(campaign, bot, admin?.name ?? user.name));
    if (issues.length) return jsonError(400, issues[0].message, { issues });
    if (!admin?.telegramId) return jsonError(400, "Profilingiz Telegram bilan bog'lanmagan");
    const token = botToken();
    if (!token) return jsonError(500, 'TELEGRAM_BOT_TOKEN sozlanmagan');

    const vars = postVars(kind, {
      campaign, bot, ranking: await loadRanking(campaign.id), refCode: SAMPLE_REF_CODE, firstName: admin.name ?? user.name,
    });
    const api = routeApi(token);
    const header = await api('sendMessage', { chat_id: admin.telegramId, text: `🧪 SINOV · ${POST_KIND_CONFIG[kind].name}` });
    if (!header.ok) return jsonError(header.error_code === undefined ? 502 : 400, explainPostError(header));
    const { result } = await sendPost(api, admin.telegramId, buildPostMessage(kind, record, vars));
    if (result.ok) return NextResponse.json({ ok: true });
    return jsonError(result.error_code === undefined ? 502 : 400, explainPostError(result), { telegram: result.description ?? null });
  } catch (err) {
    logger.error('POST /api/admin/campaigns/[id]/posts/[kind]/test error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}
