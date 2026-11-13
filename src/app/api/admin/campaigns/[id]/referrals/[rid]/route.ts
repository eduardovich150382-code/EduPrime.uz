import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { revalidateCampaigns } from '@/lib/cache-tags';
import { jsonError, readJson } from '@/lib/campaign/admin-api';
import { frozenError, loadCampaignParam, paramId, referralPatchSchema } from '@/lib/campaign/finalize-api';
import { FINALIZED_ERROR, restoredStatus } from '@/lib/campaign/finalize-rules';

type Context = { params: Promise<{ id: string; rid: string }> };

/**
 * PATCH /api/admin/campaigns/[id]/referrals/[rid] — `{ status: 'INVALID' | 'RESTORE' }`.
 * INVALID — istalgan holatdan. RESTORE — faqat INVALID dan; `checkedAt = null`,
 * shunda tugagan aksiyada qayta tekshiruv uni yana tekshiradi. Aksiya davomida ham mumkin.
 */
export async function PATCH(request: NextRequest, context: Context) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const parsed = referralPatchSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError(400, "Ma'lumot noto'g'ri");
    const campaign = await loadCampaignParam(context);
    if (campaign instanceof NextResponse) return campaign;
    const frozen = frozenError(campaign);
    if (frozen) return frozen;
    const rid = paramId((await context.params).rid);
    const referral = rid ? await db.campaignReferral.findFirst({ where: { id: rid, campaignId: campaign.id } }) : null;
    if (!referral) return jsonError(404, 'Referal topilmadi');

    let data: Prisma.CampaignReferralUpdateManyMutationInput & { status: 'INVALID' | 'ACTIVE' | 'PENDING' };
    if (parsed.data.status === 'INVALID') {
      if (referral.status === 'INVALID') return NextResponse.json({ ok: true, status: 'INVALID' });
      data = { status: 'INVALID' };
    } else {
      if (referral.status !== 'INVALID') return jsonError(409, 'Faqat yaroqsiz referalni tiklash mumkin');
      // Tasdiqlanmagan referal tiklanganda ball bermasin — PENDING ga qaytadi (finalize-rules.ts).
      data = { status: restoredStatus(referral.confirmedAt), checkedAt: null };
    }
    // Eski holat va `finalizedAt: null` sharti: shu orada boshqa oyna yoki yakunlash o'zgartirgan bo'lsa ustidan yozilmaydi.
    const updated = await db.campaignReferral.updateMany({
      where: { id: referral.id, status: referral.status, campaign: { finalizedAt: null } },
      data,
    });
    if (updated.count !== 1) {
      const still = await db.campaign.findUnique({ where: { id: campaign.id }, select: { finalizedAt: true } });
      return jsonError(409, still?.finalizedAt ? FINALIZED_ERROR : "Referal boshqa oynada o'zgargan — ro'yxatni yangilang");
    }
    revalidateCampaigns();
    return NextResponse.json({ ok: true, status: data.status });
  } catch (err) {
    logger.error('PATCH /api/admin/campaigns/[id]/referrals/[rid] error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}
