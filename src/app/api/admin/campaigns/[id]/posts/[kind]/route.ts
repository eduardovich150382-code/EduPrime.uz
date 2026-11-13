import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { revalidateCampaigns } from '@/lib/cache-tags';
import { getBotSettings } from '@/lib/bot-settings';
import { jsonError, readJson } from '@/lib/campaign/admin-api';
import { postLockedError, blankToNull, loadPostTarget, postDraftSchema, postView, type PostRouteContext } from '@/lib/campaign/post-api';
import { deleteUnpublishedPost, savePost } from '@/lib/campaign/post-store';
import { postSampleVars } from '@/lib/campaign/post-vars';
import { defaultPostText, validatePost } from '@/lib/campaign/posts';

/**
 * PATCH /api/admin/campaigns/[id]/posts/[kind] — `{ text?, buttonText?, buttonUrl? }`.
 * Bo'sh yoki standartga teng matn — standart. Avval to'liq tekshiruv: xato
 * bo'lsa hech narsa yozilmaydi.
 */
export async function PATCH(request: NextRequest, context: PostRouteContext) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  try {
    const parsed = postDraftSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError(400, "Ma'lumot noto'g'ri");
    const target = await loadPostTarget(context);
    if (target instanceof NextResponse) return target;
    const { campaign, kind, post } = target;
    const locked = postLockedError(campaign, kind);
    if (locked) return jsonError(409, locked);

    const text = parsed.data.text ?? post?.text ?? defaultPostText(kind, campaign);
    const buttonText = blankToNull(parsed.data.buttonText);
    const buttonUrl = blankToNull(parsed.data.buttonUrl);
    const merged = {
      text: text.trim() ? text : defaultPostText(kind, campaign),
      hasImage: Boolean(post?.imageUrl),
      buttonText: buttonText !== undefined ? buttonText : post?.buttonText ?? null,
      buttonUrl: buttonUrl !== undefined ? buttonUrl : post?.buttonUrl ?? null,
    };
    const issues = validatePost(kind, merged, postSampleVars(campaign, await getBotSettings(), user.name));
    if (issues.length) return jsonError(400, issues[0].message, { issues });

    const saved = await savePost(campaign, kind, post, { text: merged.text, buttonText: merged.buttonText, buttonUrl: merged.buttonUrl });
    revalidateCampaigns();
    return NextResponse.json({ ok: true, post: postView(campaign, kind, saved) });
  } catch (err) {
    logger.error('PATCH /api/admin/campaigns/[id]/posts/[kind] error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}

/**
 * DELETE — LAST_DAY "Avtomatik chiqarishni bekor qilish": yozuv borligi cron
 * uchun rozilik, shuning uchun bekor qilish = yozuvni o'chirish. Kanalga
 * chiqqan post o'chirilmaydi (avval "Kanaldan o'chirish").
 */
export async function DELETE(_request: NextRequest, context: PostRouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const target = await loadPostTarget(context);
    if (target instanceof NextResponse) return target;
    const { campaign, kind, post } = target;
    if (kind !== 'LAST_DAY') return jsonError(400, "Faqat oxirgi kun postining avtomatik chiqarilishini bekor qilish mumkin");
    if (!post) return NextResponse.json({ ok: true, post: postView(campaign, kind, null) });
    if (!(await deleteUnpublishedPost(post.id))) return jsonError(409, "Post kanalda: avval kanaldan o'chiring");
    revalidateCampaigns();
    return NextResponse.json({ ok: true, post: postView(campaign, kind, null) });
  } catch (err) {
    logger.error('DELETE /api/admin/campaigns/[id]/posts/[kind] error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}
