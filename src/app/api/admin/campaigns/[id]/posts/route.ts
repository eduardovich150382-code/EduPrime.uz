import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { getBotSettings } from '@/lib/bot-settings';
import { campaignIdSchema, jsonError } from '@/lib/campaign/admin-api';
import { postsDetail } from '@/lib/campaign/post-api';
import { loadPosts } from '@/lib/campaign/post-store';

/** GET /api/admin/campaigns/[id]/posts — barcha tahrirlanadigan postlar (yozuv bo'lmasa standart) va namunaviy qiymatlar. */
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  try {
    const id = campaignIdSchema.safeParse((await context.params).id);
    const campaign = id.success ? await db.campaign.findUnique({ where: { id: id.data } }) : null;
    if (!campaign) return jsonError(404, 'Aksiya topilmadi');
    const posts = await loadPosts(campaign.id);
    return NextResponse.json(postsDetail(campaign, posts, await getBotSettings(), user.name, new Date()));
  } catch (err) {
    logger.error('GET /api/admin/campaigns/[id]/posts error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}
