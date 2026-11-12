import type { Campaign, CampaignParticipant } from '@prisma/client';
import { DEFAULT_REWARD_TIERS } from '../rewards';

// Aksiya testlari uchun umumiy yozuvlar. Vaqt — `campaignNow` (ACTIVE oralig'ida).
export const campaignNow = new Date('2026-11-20T15:00:00Z');

export function campaignFixture(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'cmp1', title: 'Noyabr aksiyasi', channelUsername: '@FizikaMSattestatsiya', channelLink: 'https://t.me/FizikaMSattestatsiya',
    startsAt: new Date('2026-11-15T00:00:00Z'), endsAt: new Date('2026-11-26T18:59:00Z'),
    isPublished: true, isPaused: false, rewardTiers: DEFAULT_REWARD_TIERS, baseRewardMin: 5, baseRewardPct: 20, promoValidDays: 5,
    dailyEnabled: true, texts: {}, lastDailySentAt: null, lastDayReminderSentAt: null, finalizedAt: null,
    createdAt: new Date('2026-11-14T00:00:00Z'), updatedAt: new Date('2026-11-14T00:00:00Z'),
    ...overrides,
  };
}

export function participantFixture(overrides: Partial<CampaignParticipant> = {}): CampaignParticipant {
  return {
    id: 'p1', campaignId: 'cmp1', telegramId: BigInt(100), username: 'ustoz', firstName: 'Ustoz', refCode: 'Ab12Cd34',
    createdAt: new Date('2026-11-15T10:00:00Z'), ...overrides,
  };
}
