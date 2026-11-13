import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { jsonError } from '@/lib/campaign/admin-api';
import { loadCampaignParam, type IdContext } from '@/lib/campaign/finalize-api';
import { listPromoCodes } from '@/lib/campaign/promo-admin';

/** GET /api/admin/campaigns/[id]/promo-codes?q= — kod, egasi, foiz, muddat va holat; qidiruv: kod, username yoki ism. */
export async function GET(request: NextRequest, context: IdContext) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const campaign = await loadCampaignParam(context);
    if (campaign instanceof NextResponse) return campaign;
    const q = (request.nextUrl.searchParams.get('q') ?? '').slice(0, 64);
    return NextResponse.json({ codes: await listPromoCodes(campaign.id, q, new Date()) });
  } catch (err) {
    logger.error('GET /api/admin/campaigns/[id]/promo-codes error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}
