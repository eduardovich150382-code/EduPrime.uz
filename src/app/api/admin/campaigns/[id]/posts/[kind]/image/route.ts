import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { revalidateCampaigns } from '@/lib/cache-tags';
import { jsonError } from '@/lib/campaign/admin-api';
import { postLockedError, adminTelegram, botToken, loadPostTarget, postView, type PostRouteContext } from '@/lib/campaign/post-api';
import { savePost } from '@/lib/campaign/post-store';
import { TYPE_CHANGED_ERROR, explainPostError, fetchTelegramFile, uploadPhotoToChat } from '@/lib/campaign/post-telegram';
import { getBotSettings } from '@/lib/bot-settings';
import { postSampleVars } from '@/lib/campaign/post-vars';
import { POST_KIND_CONFIG, defaultPostText, validatePost } from '@/lib/campaign/posts';

// Rasm faylini o'zimiz saqlamaymiz: u adminning Telegram chatiga yuboriladi
// va `imageUrl` ga Telegram file_id yoziladi — sendPhoto uni to'g'ridan-to'g'ri
// qabul qiladi (bot oqimidagi loadSharePost → sendPhoto ham).

// Vercel so'rov tanasi chegarasi 4,5 MB — zaxira bilan.
const MAX_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** POST — multipart `file`: jpg, png yoki webp, ≤ 4 MB. */
export async function POST(request: NextRequest, context: PostRouteContext) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  try {
    const target = await loadPostTarget(context);
    if (target instanceof NextResponse) return target;
    const { campaign, kind, post } = target;
    const locked = postLockedError(campaign, kind);
    if (locked) return jsonError(409, locked);
    // Kanaldagi matnli postni rasmliga aylantirib bo'lmaydi (editMessageText ↔ editMessageMedia).
    if (post?.channelMessageId && !post.imageUrl) return jsonError(400, TYPE_CHANGED_ERROR);

    const form = await request.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof Blob)) return jsonError(400, 'Rasm fayli yuborilmadi');
    const ext = IMAGE_TYPES[file.type];
    if (!ext) return jsonError(400, 'Faqat JPG, PNG yoki WEBP rasm');
    if (file.size > MAX_BYTES) return jsonError(400, 'Rasm 4 MB dan katta');

    // Rasm bilan chegara 1024 ga tushadi — uzun matnli post rasm qo'shilgach chiqmay qolmasin.
    const text = post?.text ?? defaultPostText(kind, campaign);
    const issues = validatePost(kind, { text, hasImage: true, buttonText: post?.buttonText ?? null, buttonUrl: post?.buttonUrl ?? null },
      postSampleVars(campaign, await getBotSettings(), user.name));
    if (issues.length) return jsonError(400, `Rasm qo'shib bo'lmaydi: ${issues[0].message}`, { issues });

    const admin = await adminTelegram(user.id);
    if (!admin?.telegramId) return jsonError(400, "Profilingiz Telegram bilan bog'lanmagan");
    const token = botToken();
    if (!token) return jsonError(500, 'TELEGRAM_BOT_TOKEN sozlanmagan');

    const uploaded = await uploadPhotoToChat(token, admin.telegramId, file, `post.${ext}`, `🧪 Rasm yuklandi · ${POST_KIND_CONFIG[kind].name}`);
    if (!uploaded.ok) return jsonError(uploaded.result.error_code === undefined ? 502 : 400, explainPostError(uploaded.result));

    const saved = await savePost(campaign, kind, post, { imageUrl: uploaded.fileId });
    revalidateCampaigns();
    return NextResponse.json({ ok: true, post: postView(campaign, kind, saved) });
  } catch (err) {
    logger.error('POST /api/admin/campaigns/[id]/posts/[kind]/image error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}

/** GET — rasmni Telegram'dan oqim bilan beradi (admin preview). Token URL'da ham, sarlavhada ham chiqmaydi. */
export async function GET(_request: NextRequest, context: PostRouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const target = await loadPostTarget(context);
    if (target instanceof NextResponse) return target;
    const fileId = target.post?.imageUrl;
    if (!fileId) return jsonError(404, "Rasm yo'q");
    const token = botToken();
    if (!token) return jsonError(500, 'TELEGRAM_BOT_TOKEN sozlanmagan');
    const file = await fetchTelegramFile(token, fileId);
    if (!file) return jsonError(502, "Rasmni Telegram'dan olib bo'lmadi");
    return new Response(file.body, { headers: { 'Content-Type': file.contentType, 'Cache-Control': 'private, max-age=3600' } });
  } catch (err) {
    logger.error('GET /api/admin/campaigns/[id]/posts/[kind]/image error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}

/** DELETE — "Rasmni olib tashlash". */
export async function DELETE(_request: NextRequest, context: PostRouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const target = await loadPostTarget(context);
    if (target instanceof NextResponse) return target;
    const { campaign, kind, post } = target;
    const locked = postLockedError(campaign, kind);
    if (locked) return jsonError(409, locked);
    if (!post?.imageUrl) return NextResponse.json({ ok: true, post: postView(campaign, kind, post) });
    if (post.channelMessageId) return jsonError(400, TYPE_CHANGED_ERROR);
    const saved = await savePost(campaign, kind, post, { imageUrl: null });
    revalidateCampaigns();
    return NextResponse.json({ ok: true, post: postView(campaign, kind, saved) });
  } catch (err) {
    logger.error('DELETE /api/admin/campaigns/[id]/posts/[kind]/image error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}
