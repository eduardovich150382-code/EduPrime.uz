import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '../db';
import { utcToTashkentLocal } from '../date';
import type { BotSettings } from '../bot-settings';
import { isStartLocked, readRewardTiers, storedTextOverrides } from './admin-rules';
import { campaignPhase } from './phase';
import { buildSampleVars } from './sample-vars';
import { CAMPAIGN_TEXT_KEYS, DEFAULT_CAMPAIGN_TEXTS } from './texts';
import type { Campaign } from './store';

// /api/admin/campaigns/* route'larining umumiy qismi: kirish sxemalari,
// javob shakli va Telegram xatolarining o'zbekcha izohi.

export const campaignIdSchema = z.string().trim().min(1).max(64);

export function jsonError(status: number, error: string, extra: Record<string, unknown> = {}): NextResponse {
  return NextResponse.json({ error, ...extra }, { status });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/** Sanalar `datetime-local` qiymati — Toshkent vaqti; serverda `tashkentLocalToUtc` bilan aylanadi. */
const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
const int = z.number().int();

export const patchSchema = z.object({
  basic: z.object({
    title: z.string().trim().min(1).max(120),
    startsAt: localDateTime,
    endsAt: localDateTime,
    channelUsername: z.string().max(64),
    channelLink: z.string().max(256),
    dailyEnabled: z.boolean(),
    promoValidDays: int.min(1).max(60),
  }).optional(),
  rewards: z.object({
    // Chegaradan oshgani (11 qator) admin-rules xabari bilan qaytsin — shuning uchun bu yerda keng.
    tiers: z.array(z.object({ fromRank: int, toRank: int, percent: int, minReferrals: int })).max(50),
    baseMin: int.nullable(),
    basePct: int.nullable(),
  }).optional(),
  texts: z.partialRecord(z.enum(CAMPAIGN_TEXT_KEYS), z.string().max(20_000)).optional(),
});

export const statusSchema = z.object({
  action: z.enum(['publish', 'unpublish', 'pause', 'resume']),
  clearTestData: z.boolean().optional(),
});

export const testMessageSchema = z.object({
  key: z.enum(CAMPAIGN_TEXT_KEYS),
  text: z.string().max(20_000).optional(),
});

/** GET /api/admin/campaigns/[id] javobi — forma, matn muharriri va e'lon oynasi uchun hammasi bir joyda. */
export async function campaignDetail(campaign: Campaign, bot: BotSettings, adminName: string | null | undefined, now: Date) {
  const [participants, referrals] = await Promise.all([
    db.campaignParticipant.count({ where: { campaignId: campaign.id } }),
    db.campaignReferral.count({ where: { campaignId: campaign.id } }),
  ]);
  const overrides = storedTextOverrides(campaign.texts);
  return {
    campaign: {
      id: campaign.id,
      title: campaign.title,
      channelUsername: campaign.channelUsername,
      channelLink: campaign.channelLink,
      startsAt: campaign.startsAt.toISOString(),
      endsAt: campaign.endsAt.toISOString(),
      startsAtLocal: utcToTashkentLocal(campaign.startsAt),
      endsAtLocal: utcToTashkentLocal(campaign.endsAt),
      isPublished: campaign.isPublished,
      isPaused: campaign.isPaused,
      finalizedAt: campaign.finalizedAt?.toISOString() ?? null,
      dailyEnabled: campaign.dailyEnabled,
      promoValidDays: campaign.promoValidDays,
      rewardTiers: readRewardTiers(campaign.rewardTiers) ?? [],
      baseRewardMin: campaign.baseRewardMin,
      baseRewardPct: campaign.baseRewardPct,
    },
    phase: campaignPhase(campaign, now),
    startLocked: isStartLocked(campaign, now),
    now: now.toISOString(),
    texts: CAMPAIGN_TEXT_KEYS.map((key) => ({
      key,
      text: overrides[key] ?? DEFAULT_CAMPAIGN_TEXTS[key],
      isDefault: overrides[key] === undefined,
      defaultText: DEFAULT_CAMPAIGN_TEXTS[key],
    })),
    sampleVars: buildSampleVars(campaign, bot, adminName),
    // Faqat admin uchun hisob: narx ommaga yashirin bo'lsa ham.
    coursePrice: bot.course.price,
    testData: { participants, referrals },
  };
}

export type CampaignDetail = Awaited<ReturnType<typeof campaignDetail>>;

/**
 * Telegram rad etgan sinov xabari — sabab admin tushunadigan tilda. HTML
 * xatolarini ushlashning eng ishonchli yo'li shu: Telegram'ning o'z tahlilchisi.
 */
export function explainTelegramError(description: string | undefined): string {
  const d = description ?? '';
  if (/can't parse entities/i.test(d)) return `HTML xato — Telegram matnni o'qiy olmadi (teglarni tekshiring): ${d}`;
  if (/message is too long/i.test(d)) return "Xabar juda uzun: Telegram 4096 belgidan ko'pini qabul qilmaydi";
  if (/message text is empty/i.test(d)) return "Xabar bo'sh chiqdi: barcha qatorlar o'chib ketgan bo'lishi mumkin";
  if (/blocked|chat not found|deactivated|can't initiate/i.test(d)) return "Bot sizga yoza olmaydi: Telegram'da botga /start yuboring";
  return `Telegram xatosi: ${d || "noma'lum"}`;
}
