import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { revalidateCampaigns } from '@/lib/cache-tags';
import { jsonError } from '@/lib/campaign/admin-api';
import { botToken, loadPostTarget, postView, routeApi, type PostRouteContext } from '@/lib/campaign/post-api';
import { clearChannelMessage, loadPost } from '@/lib/campaign/post-store';
import { deleteChannelPost, editOutcome, explainPostError } from '@/lib/campaign/post-telegram';

/**
 * DELETE /api/admin/campaigns/[id]/posts/[kind]/channel — kanaldagi postni
 * o'chirish. Kanalda qo'lda o'chirilgan bo'lsa ("not found") ham muvaffaqiyat:
 * maqsad — bazadagi holatni kanal bilan tenglashtirish. Har bosqichda mumkin.
 */
export async function DELETE(_request: NextRequest, context: PostRouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const target = await loadPostTarget(context);
    if (target instanceof NextResponse) return target;
    const { campaign, kind, post } = target;
    if (!post?.channelMessageId) return jsonError(400, "Post kanalda yo'q");
    const token = botToken();
    if (!token) return jsonError(500, 'TELEGRAM_BOT_TOKEN sozlanmagan');

    const result = await deleteChannelPost(routeApi(token), campaign.channelUsername, post.channelMessageId);
    if (!result.ok && editOutcome(result) !== 'not_found') {
      return jsonError(result.error_code === undefined ? 502 : 400, explainPostError(result), { telegram: result.description ?? null });
    }
    await clearChannelMessage(post.id, post.channelMessageId, true);
    revalidateCampaigns();
    return NextResponse.json({ ok: true, post: postView(campaign, kind, await loadPost(campaign.id, kind)) });
  } catch (err) {
    logger.error('DELETE /api/admin/campaigns/[id]/posts/[kind]/channel error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}
