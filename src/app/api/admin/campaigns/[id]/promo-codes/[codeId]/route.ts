import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { revalidateCampaigns } from '@/lib/cache-tags';
import { jsonError, readJson } from '@/lib/campaign/admin-api';
import { loadCampaignParam, paramId, promoPatchSchema } from '@/lib/campaign/finalize-api';
import { ALREADY_USED_ERROR, markPromoUsed, unmarkPromoUsed } from '@/lib/campaign/promo-admin';

type Context = { params: Promise<{ id: string; codeId: string }> };

/**
 * PATCH /api/admin/campaigns/[id]/promo-codes/[codeId] — `{ used, note? }`.
 * `used: true` atomar (bot bilan bir vaqtda bosilsa ham bitta yozuv), qayta
 * belgilash — 409. `used: false` — adashib bosilganini bekor qilish.
 * Muddati o'tgan kodni ham belgilash mumkin (ogohlantirish UI'da).
 */
export async function PATCH(request: NextRequest, context: Context) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const parsed = promoPatchSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError(400, "Ma'lumot noto'g'ri (izoh ko'pi bilan 200 belgi)");
    const campaign = await loadCampaignParam(context);
    if (campaign instanceof NextResponse) return campaign;
    const codeId = paramId((await context.params).codeId);
    if (!codeId) return jsonError(404, 'Promokod topilmadi');
    const where = { id: codeId, campaignId: campaign.id };

    if (parsed.data.used) {
      const outcome = await markPromoUsed(where, parsed.data.note || null, new Date());
      if (outcome === 'not_found') return jsonError(404, 'Promokod topilmadi');
      if (outcome === 'already_used') return jsonError(409, ALREADY_USED_ERROR);
    } else if (!(await unmarkPromoUsed(where))) {
      return jsonError(404, 'Promokod topilmadi');
    }
    revalidateCampaigns();
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error('PATCH /api/admin/campaigns/[id]/promo-codes/[codeId] error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}
