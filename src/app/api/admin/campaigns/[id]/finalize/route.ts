import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { revalidateCampaigns } from '@/lib/cache-tags';
import { jsonError, readJson } from '@/lib/campaign/admin-api';
import { endedError, finalizeSchema, loadCampaignParam, type IdContext } from '@/lib/campaign/finalize-api';
import { ALREADY_FINALIZED_ERROR, finalizeCampaign } from '@/lib/campaign/finalize';
import { countUnchecked } from '@/lib/campaign/recheck';

/**
 * POST /api/admin/campaigns/[id]/finalize — `{ skipRecheck? }`. Bekor qilib
 * bo'lmaydi: promokodlar yaratiladi, keyin xabarlar (`finalize/notify`) ketadi.
 * Yakunlangach bot bu aksiyani ko'rmaydi va yangi aksiya yaratish ochiladi.
 */
export async function POST(request: NextRequest, context: IdContext) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const parsed = finalizeSchema.safeParse((await readJson(request)) ?? {});
    if (!parsed.success) return jsonError(400, "Ma'lumot noto'g'ri");
    const campaign = await loadCampaignParam(context);
    if (campaign instanceof NextResponse) return campaign;
    const now = new Date();
    if (campaign.finalizedAt) return jsonError(409, ALREADY_FINALIZED_ERROR);
    const blocked = endedError(campaign, now);
    if (blocked) return blocked;
    if (!parsed.data.skipRecheck && await countUnchecked(campaign) > 0) return jsonError(400, 'Avval qayta tekshiruvni tugating');

    const result = await finalizeCampaign(campaign, now);
    if (!result.ok) return jsonError(result.status, result.error);
    revalidateCampaigns();
    return NextResponse.json(result);
  } catch (err) {
    logger.error('POST /api/admin/campaigns/[id]/finalize error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}
