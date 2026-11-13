import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { revalidateCampaigns } from '@/lib/cache-tags';
import { jsonError } from '@/lib/campaign/admin-api';
import { frozenError, loadCampaignParam, paramId } from '@/lib/campaign/finalize-api';
import { FINALIZED_ERROR } from '@/lib/campaign/finalize-rules';

type Context = { params: Promise<{ id: string; pid: string }> };

/**
 * POST /api/admin/campaigns/[id]/participants/[pid]/invalidate-all — ishtirokchini
 * chetlatish: barcha referallari INVALID. Aksiya davomida ham mumkin.
 */
export async function POST(_request: NextRequest, context: Context) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const campaign = await loadCampaignParam(context);
    if (campaign instanceof NextResponse) return campaign;
    const frozen = frozenError(campaign);
    if (frozen) return frozen;
    const pid = paramId((await context.params).pid);
    const participant = pid ? await db.campaignParticipant.findFirst({ where: { id: pid, campaignId: campaign.id }, select: { id: true } }) : null;
    if (!participant) return jsonError(404, 'Ishtirokchi topilmadi');

    // `campaign.finalizedAt: null` — tekshiruv va yozuv orasida yakunlansa, yozilmaydi.
    const updated = await db.campaignReferral.updateMany({
      where: { campaignId: campaign.id, participantId: participant.id, status: { not: 'INVALID' }, campaign: { finalizedAt: null } },
      data: { status: 'INVALID' },
    });
    if (updated.count === 0) {
      const still = await db.campaign.findUnique({ where: { id: campaign.id }, select: { finalizedAt: true } });
      if (still?.finalizedAt) return jsonError(409, FINALIZED_ERROR);
    }
    revalidateCampaigns();
    return NextResponse.json({ ok: true, count: updated.count });
  } catch (err) {
    logger.error('POST /api/admin/campaigns/[id]/participants/[pid]/invalidate-all error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}
