import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { jsonError } from '@/lib/campaign/admin-api';
import { loadCampaignParam, paramId } from '@/lib/campaign/finalize-api';
import { flagBursts, noUsernameCount } from '@/lib/campaign/referral-review';

type Context = { params: Promise<{ id: string; pid: string }> };

/**
 * GET /api/admin/campaigns/[id]/participants/[pid]/referrals — ishtirokchining
 * barcha referallari. `suspicious` — faqat ko'rsatish (1 daqiqada ≥ 3 ta), qarorni admin qiladi.
 */
export async function GET(_request: NextRequest, context: Context) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const campaign = await loadCampaignParam(context);
    if (campaign instanceof NextResponse) return campaign;
    const pid = paramId((await context.params).pid);
    const participant = pid ? await db.campaignParticipant.findFirst({ where: { id: pid, campaignId: campaign.id } }) : null;
    if (!participant) return jsonError(404, 'Ishtirokchi topilmadi');

    const rows = await db.campaignReferral.findMany({ where: { campaignId: campaign.id, participantId: participant.id }, orderBy: { createdAt: 'asc' } });
    const suspicious = flagBursts(rows);
    return NextResponse.json({
      participant: { id: participant.id, firstName: participant.firstName, username: participant.username, telegramId: participant.telegramId.toString() },
      finalized: campaign.finalizedAt !== null,
      noUsernameCount: noUsernameCount(rows.map((r) => ({ username: r.referredUsername }))),
      referrals: rows.map((r) => ({
        id: r.id,
        firstName: r.referredFirstName,
        username: r.referredUsername,
        telegramId: r.referredTelegramId.toString(),
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        confirmedAt: r.confirmedAt?.toISOString() ?? null,
        checkedAt: r.checkedAt?.toISOString() ?? null,
        suspicious: suspicious.has(r.id),
      })),
    });
  } catch (err) {
    logger.error('GET /api/admin/campaigns/[id]/participants/[pid]/referrals error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}
