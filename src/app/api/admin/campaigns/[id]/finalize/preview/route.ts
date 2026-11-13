import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { getBotSettings } from '@/lib/bot-settings';
import { jsonError } from '@/lib/campaign/admin-api';
import { loadCampaignParam, type IdContext } from '@/lib/campaign/finalize-api';
import { loadFinalizePreview } from '@/lib/campaign/finalize';

/** GET /api/admin/campaigns/[id]/finalize/preview — yakuniy natija: g'oliblar, sonlar, tekshirilmagan referallar. */
export async function GET(_request: NextRequest, context: IdContext) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const campaign = await loadCampaignParam(context);
    if (campaign instanceof NextResponse) return campaign;
    return NextResponse.json(await loadFinalizePreview(campaign, await getBotSettings()));
  } catch (err) {
    logger.error('GET /api/admin/campaigns/[id]/finalize/preview error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}
