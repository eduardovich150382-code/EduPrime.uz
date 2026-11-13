import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { revalidateCampaigns } from '@/lib/cache-tags';
import { getBotSettings } from '@/lib/bot-settings';
import { checkChannel } from '@/lib/telegram-channel-check';
import { jsonError, readJson } from '@/lib/campaign/admin-api';
import { canPublishWinners } from '@/lib/campaign/finalize-rules';
import { campaignPhase } from '@/lib/campaign/phase';
import { CONFLICT_ERROR, postLockedError, botToken, loadPostTarget, postView, publishSchema, routeApi, type PostRouteContext } from '@/lib/campaign/post-api';
import {
  claimPublish, clearChannelMessage, createDefaultPost, deletePostRecord, loadPost, revertPublish, setChannelMessage,
} from '@/lib/campaign/post-store';
import { TYPE_CHANGED_ERROR, editOutcome, editPost, explainPostError, pinPost, sendPost } from '@/lib/campaign/post-telegram';
import { postSampleVars, postVars } from '@/lib/campaign/post-vars';
import { buildPostMessage, canPublishInPhase, validatePost } from '@/lib/campaign/posts';
import { loadRanking } from '@/lib/campaign/store';

/**
 * POST /api/admin/campaigns/[id]/posts/[kind]/publish — `{ mode: 'new'|'update', pin?, expectedUpdatedAt }`.
 * Ikki marta chiqib ketmasin: `publishedAt` optimistik qulf bilan band
 * qilinadi (ikki oyna, ikki bosish — faqat bittasi o'tadi), Telegram rad
 * etsa eski qiymatiga qaytariladi.
 */
export async function POST(request: NextRequest, context: PostRouteContext) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  try {
    const parsed = publishSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError(400, "Ma'lumot noto'g'ri");
    const { mode, pin = false, expectedUpdatedAt } = parsed.data;
    const target = await loadPostTarget(context);
    if (target instanceof NextResponse) return target;
    const { campaign, kind, post } = target;
    const locked = postLockedError(campaign, kind);
    if (locked) return jsonError(409, locked);

    const now = new Date();
    const phase = campaignPhase(campaign, now);
    if (kind === 'SHARE') return jsonError(400, 'Ulashiladigan post kanalga chiqmaydi: bot uni ishtirokchilarga yuboradi');
    // Yakunlangan qoralama — sinov: "g'oliblar" adminlar, kanalga chiqmasin (faqat «O'zimga sinov»).
    if (kind === 'WINNERS' && !canPublishWinners(campaign)) {
      return jsonError(400, "G'oliblar posti kanalga faqat e'lon qilingan va yakunlangan aksiyada chiqadi");
    }
    if (phase === 'DRAFT') return jsonError(400, "Avval aksiyani e'lon qiling");
    if (!canPublishInPhase(kind, phase)) return jsonError(400, "Bu postni aksiyaning hozirgi bosqichida kanalga chiqarib bo'lmaydi");
    if (mode === 'update' && !post?.channelMessageId) return jsonError(400, "Post kanalda yo'q — «Kanalga chiqarish» ni bosing");

    const bot = await getBotSettings();
    if (post) {
      const issues = validatePost(kind, { ...post, hasImage: Boolean(post.imageUrl) }, postSampleVars(campaign, bot, user.name));
      if (issues.length) return jsonError(400, `Postda xato bor: ${issues[0].message}`, { issues });
    }

    const token = botToken();
    if (!token) return jsonError(500, 'TELEGRAM_BOT_TOKEN sozlanmagan');
    let check;
    try {
      check = await checkChannel(token, campaign.channelUsername);
    } catch (err) {
      logger.error('Campaign post publish: channel check failed', { error: err, campaignId: campaign.id });
      return jsonError(502, "Telegram bilan aloqa o'rnatilmadi — keyinroq urinib ko'ring");
    }
    if (!check.ok) return jsonError(400, check.error);
    if (!check.canPost) return jsonError(400, "Botda kanalga post yozish huquqi yo'q");
    if ((pin || mode === 'update') && !check.canEdit) return jsonError(400, "Botda kanaldagi postlarni tahrirlash huquqi yo'q");

    // Qulf. Yozuvsiz (standart) post uchun avval yozuv yaratiladi.
    if (expectedUpdatedAt === null ? post !== null : post === null) return jsonError(409, CONFLICT_ERROR);
    const created = post === null;
    const record = post ?? await createDefaultPost(campaign, kind);
    const expected = created ? record.updatedAt : new Date(expectedUpdatedAt as string);
    if (!(await claimPublish(record.id, expected, now))) {
      if (created) await deletePostRecord(record.id);
      return jsonError(409, CONFLICT_ERROR);
    }
    const previous = record.publishedAt;
    const rollback = async () => {
      if (created) await deletePostRecord(record.id);
      else await revertPublish(record.id, previous);
    };

    const api = routeApi(token);
    const message = buildPostMessage(kind, record, postVars(kind, { campaign, bot, ranking: await loadRanking(campaign.id) }));
    let messageId: number;
    if (mode === 'new') {
      const sent = await sendPost(api, campaign.channelUsername, message);
      if (!sent.result.ok || sent.messageId === null) {
        await rollback();
        return jsonError(502, explainPostError(sent.result), { telegram: sent.result.description ?? null });
      }
      messageId = sent.messageId;
      await setChannelMessage(record.id, messageId);
    } else {
      messageId = record.channelMessageId as number;
      const result = await editPost(api, campaign.channelUsername, messageId, message);
      const outcome = editOutcome(result);
      if (outcome === 'not_found') {
        await rollback();
        await clearChannelMessage(record.id, messageId, false);
        revalidateCampaigns();
        return jsonError(409, 'Kanaldagi post topilmadi — qayta chiqaring');
      }
      if (outcome === 'type_changed') {
        await rollback();
        return jsonError(400, TYPE_CHANGED_ERROR);
      }
      if (outcome === 'error') {
        await rollback();
        return jsonError(502, explainPostError(result), { telegram: result.description ?? null });
      }
    }

    let warning: string | undefined;
    if (pin) {
      const pinned = await pinPost(api, campaign.channelUsername, messageId);
      if (!pinned.ok) warning = `Post chiqdi, lekin pin qilinmadi: ${explainPostError(pinned)}`;
    }
    revalidateCampaigns();
    return NextResponse.json({ ok: true, warning, post: postView(campaign, kind, await loadPost(campaign.id, kind)) });
  } catch (err) {
    logger.error('POST /api/admin/campaigns/[id]/posts/[kind]/publish error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}
