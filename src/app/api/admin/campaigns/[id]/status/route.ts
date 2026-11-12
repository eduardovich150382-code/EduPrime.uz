import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { revalidateCampaigns } from '@/lib/cache-tags';
import { getBotSettings } from '@/lib/bot-settings';
import { checkChannel } from '@/lib/telegram-channel-check';
import { publishProblems, statusTransition } from '@/lib/campaign/admin-rules';
import { campaignIdSchema, jsonError, readJson, statusSchema } from '@/lib/campaign/admin-api';
import { buildSampleVars } from '@/lib/campaign/sample-vars';

const CONFLICT = "Aksiya holati o'zgargan — sahifani yangilang";

class StatusConflict extends Error {}

/**
 * Holat yozuvi shartli `updateMany` bilan: tekshiruv va yozuv orasida boshqa
 * admin holatni o'zgartirgan bo'lsa count 0 — eskirgan qaror qo'llanmaydi.
 */
function transitionWhere(id: string, action: 'unpublish' | 'pause' | 'resume', now: Date): Prisma.CampaignWhereInput {
  if (action === 'unpublish') return { id, isPublished: true, finalizedAt: null, startsAt: { gt: now } };
  if (action === 'pause') return { id, isPublished: true, isPaused: false, finalizedAt: null, endsAt: { gt: now } };
  return { id, isPaused: true, finalizedAt: null };
}

const TRANSITION_DATA: Record<'unpublish' | 'pause' | 'resume', Prisma.CampaignUpdateManyMutationInput> = {
  unpublish: { isPublished: false, isPaused: false },
  pause: { isPaused: true },
  resume: { isPaused: false },
};

/** POST /api/admin/campaigns/[id]/status — `{ action: publish|unpublish|pause|resume, clearTestData? }`. */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  try {
    const parsed = statusSchema.safeParse(await readJson(request));
    const id = campaignIdSchema.safeParse((await context.params).id);
    if (!parsed.success || !id.success) return jsonError(400, "Ma'lumot noto'g'ri");
    const { action, clearTestData = false } = parsed.data;

    const campaign = await db.campaign.findUnique({ where: { id: id.data } });
    if (!campaign) return jsonError(404, 'Aksiya topilmadi');
    const now = new Date();
    const rule = statusTransition(campaign, action, now);
    if (!rule.ok) return jsonError(409, rule.error);

    if (action !== 'publish') {
      const updated = await db.campaign.updateMany({ where: transitionWhere(campaign.id, action, now), data: TRANSITION_DATA[action] });
      if (updated.count !== 1) return jsonError(409, CONFLICT);
      revalidateCampaigns();
      return NextResponse.json({ ok: true });
    }

    const problems = publishProblems(campaign, now, buildSampleVars(campaign, await getBotSettings(), user.name));
    if (problems.length) return jsonError(400, problems[0], { problems });

    // Bot admin bo'lmasa obuna tekshiruvi ishlamaydi — referallar hech qachon tasdiqlanmasdi.
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return jsonError(500, 'TELEGRAM_BOT_TOKEN sozlanmagan');
    let check;
    try {
      check = await checkChannel(token, campaign.channelUsername);
    } catch (err) {
      logger.error('Campaign publish: channel check failed', { error: err, campaignId: campaign.id });
      return jsonError(502, "Telegram bilan aloqa o'rnatilmadi — e'lon qilinmadi, keyinroq urinib ko'ring");
    }
    if (!check.ok) return jsonError(400, check.error);
    if (!check.isAdmin) return jsonError(400, 'Bot kanalda admin emas');

    // Qoralamadagi ishtirokchilar — adminlarning sinovi. Ular bilan birga
    // e'lon qilinsa, real ishtirokchilar reytingda sinov ballari ortida qolardi.
    // Bitta tranzaksiya: e'lon yiqilsa sinov ma'lumotlari ham joyida qoladi.
    try {
      await db.$transaction(async (tx) => {
        if (clearTestData) {
          await tx.campaignReferral.deleteMany({ where: { campaignId: campaign.id } });
          await tx.campaignParticipant.deleteMany({ where: { campaignId: campaign.id } });
        }
        const updated = await tx.campaign.updateMany({
          where: { id: campaign.id, isPublished: false, finalizedAt: null },
          data: { isPublished: true, isPaused: false },
        });
        if (updated.count !== 1) throw new StatusConflict();
      });
    } catch (err) {
      if (err instanceof StatusConflict) return jsonError(409, CONFLICT);
      throw err;
    }
    revalidateCampaigns();
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error('POST /api/admin/campaigns/[id]/status error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}
