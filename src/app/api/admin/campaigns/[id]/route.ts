import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { revalidateCampaigns } from '@/lib/cache-tags';
import { getBotSettings, normalizeChannelUsername, normalizeTelegramLink } from '@/lib/bot-settings';
import { tashkentLocalToUtc } from '@/lib/date';
import {
  canDelete, canEditChannel, checkCampaignText, normalizeTextOverride, storedTextOverrides, validateDateChange, validateRewards,
} from '@/lib/campaign/admin-rules';
import { campaignDetail, campaignIdSchema, jsonError, patchSchema, readJson } from '@/lib/campaign/admin-api';
import { buildSampleVars } from '@/lib/campaign/sample-vars';
import type { CampaignTextKey } from '@/lib/campaign/texts';
import type { HtmlIssue } from '@/lib/telegram-html';

type Context = { params: Promise<{ id: string }> };

async function campaignId(context: Context): Promise<string | null> {
  const parsed = campaignIdSchema.safeParse((await context.params).id);
  return parsed.success ? parsed.data : null;
}

/** GET /api/admin/campaigns/[id] — aksiya, bosqich, matnlar (standart bilan), namunaviy qiymatlar. */
export async function GET(_request: NextRequest, context: Context) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  try {
    const id = await campaignId(context);
    const campaign = id ? await db.campaign.findUnique({ where: { id } }) : null;
    if (!campaign) return jsonError(404, 'Aksiya topilmadi');
    return NextResponse.json(await campaignDetail(campaign, await getBotSettings(), user.name, new Date()));
  } catch (err) {
    logger.error('GET /api/admin/campaigns/[id] error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}

/**
 * PATCH /api/admin/campaigns/[id] — `{ basic?, rewards?, texts? }`. Avval
 * hamma qism tekshiriladi, xato bo'lsa hech narsa yozilmaydi; so'ng bitta update.
 */
export async function PATCH(request: NextRequest, context: Context) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  try {
    const parsed = patchSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError(400, "Ma'lumot noto'g'ri");
    const { basic, rewards, texts } = parsed.data;
    if (!basic && !rewards && !texts) return jsonError(400, "O'zgarish yo'q");

    const id = await campaignId(context);
    const campaign = id ? await db.campaign.findUnique({ where: { id } }) : null;
    if (!campaign) return jsonError(404, 'Aksiya topilmadi');
    if (campaign.finalizedAt) return jsonError(409, "Aksiya yakunlangan — o'zgartirib bo'lmaydi");

    const now = new Date();
    const data: Prisma.CampaignUpdateInput = {};
    let next = { channelUsername: campaign.channelUsername, endsAt: campaign.endsAt, promoValidDays: campaign.promoValidDays };

    if (basic) {
      const startsAt = tashkentLocalToUtc(basic.startsAt);
      const endsAt = tashkentLocalToUtc(basic.endsAt);
      if (!startsAt || !endsAt) return jsonError(400, "Sana noto'g'ri");
      const dates = validateDateChange(campaign, { startsAt, endsAt }, now);
      if (dates.error) return jsonError(400, dates.error);

      const channelUsername = normalizeChannelUsername(basic.channelUsername);
      const channelLink = normalizeTelegramLink(basic.channelLink);
      if (!channelUsername) return jsonError(400, "Kanal nomi noto'g'ri: @ bilan boshlanib, 5–32 ta lotin harfi, raqam yoki _ bo'lsin");
      if (!channelLink) return jsonError(400, "Kanal havolasi noto'g'ri: https://t.me/... bo'lsin");
      if (channelUsername !== campaign.channelUsername || channelLink !== campaign.channelLink) {
        const rule = canEditChannel(campaign);
        if (!rule.ok) return jsonError(400, rule.error);
      }
      Object.assign(data, {
        title: basic.title, startsAt, endsAt, channelUsername, channelLink, dailyEnabled: basic.dailyEnabled, promoValidDays: basic.promoValidDays,
      });
      next = { channelUsername, endsAt, promoValidDays: basic.promoValidDays };
    }

    if (rewards) {
      const base = { min: rewards.baseMin, pct: rewards.basePct };
      const errors = validateRewards(rewards.tiers, base);
      if (errors.length) return jsonError(400, errors[0], { errors });
      data.rewardTiers = [...rewards.tiers].sort((a, b) => a.fromRank - b.fromRank);
      data.baseRewardMin = base.min;
      data.baseRewardPct = base.pct;
    }

    if (texts) {
      // Uzunlik namunaviy qiymatlar bilan — shu so'rovdagi yangi kanal/sana hisobga olinadi.
      const sampleVars = buildSampleVars(next, await getBotSettings(), user.name);
      const merged: Record<string, string> = { ...storedTextOverrides(campaign.texts) };
      const textErrors: Partial<Record<CampaignTextKey, HtmlIssue[]>> = {};
      for (const [key, text] of Object.entries(texts) as [CampaignTextKey, string][]) {
        const normalized = normalizeTextOverride(key, text);
        if (normalized === null) {
          delete merged[key];
          continue;
        }
        const { issues } = checkCampaignText(key, normalized, sampleVars);
        if (issues.length) textErrors[key] = issues;
        merged[key] = normalized;
      }
      if (Object.keys(textErrors).length) return jsonError(400, 'Matnda xato bor', { textErrors });
      data.texts = merged;
    }

    await db.campaign.update({ where: { id: campaign.id }, data });
    revalidateCampaigns();
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error('PATCH /api/admin/campaigns/[id] error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}

/** DELETE /api/admin/campaigns/[id] — faqat qoralama; shart bazadagi so'rovning o'zida (parallel e'lon bilan poyga yo'q). */
export async function DELETE(_request: NextRequest, context: Context) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const id = await campaignId(context);
    if (!id) return jsonError(404, 'Aksiya topilmadi');
    const deleted = await db.campaign.deleteMany({ where: { id, isPublished: false } });
    if (deleted.count === 0) {
      const existing = await db.campaign.findUnique({ where: { id }, select: { isPublished: true } });
      if (!existing) return jsonError(404, 'Aksiya topilmadi');
      const rule = canDelete(existing);
      return jsonError(409, rule.ok ? "Aksiyani o'chirib bo'lmadi" : rule.error);
    }
    revalidateCampaigns();
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error('DELETE /api/admin/campaigns/[id] error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}
