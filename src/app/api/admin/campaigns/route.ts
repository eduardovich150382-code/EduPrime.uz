import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { revalidateCampaigns } from '@/lib/cache-tags';
import { getBotSettings } from '@/lib/bot-settings';
import { tashkentDayRangeUtc } from '@/lib/date';
import { canCreate } from '@/lib/campaign/admin-rules';
import { listCampaigns } from '@/lib/campaign/admin-store';
import { jsonError } from '@/lib/campaign/admin-api';
import { DEFAULT_BASE_REWARD, DEFAULT_REWARD_TIERS } from '@/lib/campaign/rewards';

const LAST_MINUTE_MS = (23 * 60 + 59) * 60 * 1000;

/** GET /api/admin/campaigns — ro'yxat (yangisi tepada). */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    return NextResponse.json({ campaigns: await listCampaigns(new Date()) });
  } catch (err) {
    logger.error('GET /api/admin/campaigns error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}

/**
 * POST /api/admin/campaigns — standartlar bilan qoralama. Sanalar Toshkent
 * kunlari bo'yicha: ertaga 00:00 dan 7-kun 23:59 gacha (7 to'liq kun).
 */
export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const rule = canCreate(await db.campaign.count({ where: { finalizedAt: null } }));
    if (!rule.ok) return jsonError(409, rule.error);

    const now = new Date();
    const bot = await getBotSettings();
    const campaign = await db.campaign.create({
      data: {
        title: 'Referral aksiya',
        channelUsername: bot.requiredChannel.username,
        channelLink: bot.requiredChannel.link,
        startsAt: tashkentDayRangeUtc(-1, now).start,
        endsAt: new Date(tashkentDayRangeUtc(-7, now).start.getTime() + LAST_MINUTE_MS),
        isPublished: false,
        rewardTiers: DEFAULT_REWARD_TIERS,
        baseRewardMin: DEFAULT_BASE_REWARD.min,
        baseRewardPct: DEFAULT_BASE_REWARD.pct,
        promoValidDays: 5,
        dailyEnabled: true,
        texts: {},
      },
      select: { id: true },
    });
    revalidateCampaigns();
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err) {
    logger.error('POST /api/admin/campaigns error:', { error: err });
    return jsonError(500, 'Server xatosi');
  }
}
