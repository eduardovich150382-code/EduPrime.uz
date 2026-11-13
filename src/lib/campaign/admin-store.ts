import type { CampaignReferralStatus } from '@prisma/client';
import { db } from '../db';
import { tashkentDayRangeUtc } from '../date';
import { campaignPhase, type CampaignPhase } from './phase';
import { campaignRewardRules, rewardFor, type RankedParticipant } from './rewards';
import { loadRanking, type Campaign, type CampaignParticipant } from './store';

// Admin paneli uchun o'qish so'rovlari. store.ts dan farqi: xato yutilmaydi —
// admin route'i 500 qaytarsin, "aksiya yo'q" deb jim qolmasin.

export type CampaignListItem = {
  id: string;
  title: string;
  phase: CampaignPhase;
  startsAt: Date;
  endsAt: Date;
  participants: number;
  activeReferrals: number;
  /** Yakunlangan qoralama ham "Yakunlandi" ko'rinsin — `campaignPhase` uni DRAFT deydi. */
  finalized: boolean;
};

export async function listCampaigns(now: Date): Promise<CampaignListItem[]> {
  const rows = await db.campaign.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, startsAt: true, endsAt: true, isPublished: true, isPaused: true, finalizedAt: true,
      _count: { select: { participants: true, referrals: { where: { status: 'ACTIVE' } } } },
    },
  });
  return rows.map((c) => ({
    id: c.id, title: c.title, phase: campaignPhase(c, now), startsAt: c.startsAt, endsAt: c.endsAt,
    participants: c._count.participants, activeReferrals: c._count.referrals, finalized: c.finalizedAt !== null,
  }));
}

export type AdminRankingRow = {
  participantId: string;
  rank: number;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  active: number;
  pending: number;
  left: number;
  invalid: number;
  lastActiveAt: Date | null;
  percent: number;
  joinedAt: Date;
};

export type AdminRankingTotals = { participants: number; active: number; pending: number; left: number; invalid: number; today: number };
export type AdminRanking = { rows: AdminRankingRow[]; totals: AdminRankingTotals };

type StatusCount = { participantId: string; status: CampaignReferralStatus; count: number };

/** Sof qism — reyting tartibi (store.loadRanking) + holatlar bo'yicha sonlar → jadval qatorlari. */
export function buildAdminRanking(
  campaign: Pick<Campaign, 'rewardTiers' | 'baseRewardMin' | 'baseRewardPct'>,
  ranking: RankedParticipant[],
  participants: Map<string, CampaignParticipant>,
  statusCounts: StatusCount[],
  today: number,
): AdminRanking {
  const rules = campaignRewardRules(campaign);
  const counts = new Map<string, Record<CampaignReferralStatus, number>>();
  const totals: AdminRankingTotals = { participants: ranking.length, active: 0, pending: 0, left: 0, invalid: 0, today };
  for (const row of statusCounts) {
    const entry = counts.get(row.participantId) ?? { PENDING: 0, ACTIVE: 0, LEFT: 0, INVALID: 0 };
    entry[row.status] += row.count;
    counts.set(row.participantId, entry);
    if (row.status === 'ACTIVE') totals.active += row.count;
    else if (row.status === 'PENDING') totals.pending += row.count;
    else if (row.status === 'LEFT') totals.left += row.count;
    else totals.invalid += row.count;
  }
  const rows: AdminRankingRow[] = [];
  for (const r of ranking) {
    const p = participants.get(r.participantId);
    if (!p) continue;
    const c = counts.get(r.participantId);
    rows.push({
      participantId: p.id, rank: r.rank, telegramId: p.telegramId.toString(), username: p.username, firstName: p.firstName,
      active: r.activeCount, pending: c?.PENDING ?? 0, left: c?.LEFT ?? 0, invalid: c?.INVALID ?? 0,
      lastActiveAt: r.lastActiveAt, percent: rewardFor(r.rank, r.activeCount, rules.tiers, rules.base), joinedAt: p.createdAt,
    });
  }
  return { rows, totals };
}

/** To'liq reyting (sahifalash va CSV chaqiruvchida). "Bugun" — Toshkent kuni. */
export async function loadAdminRanking(campaign: Campaign, now: Date): Promise<AdminRanking> {
  const { start, end } = tashkentDayRangeUtc(0, now);
  const [loaded, grouped, today] = await Promise.all([
    loadRanking(campaign.id),
    db.campaignReferral.groupBy({ by: ['participantId', 'status'], where: { campaignId: campaign.id }, _count: { _all: true } }),
    db.campaignReferral.count({ where: { campaignId: campaign.id, status: 'ACTIVE', confirmedAt: { gte: start, lt: end } } }),
  ]);
  if (!loaded) throw new Error('Campaign ranking failed to load');
  const statusCounts = grouped.map((g) => ({ participantId: g.participantId, status: g.status, count: g._count._all }));
  return buildAdminRanking(campaign, loaded.ranking, loaded.participants, statusCounts, today);
}
