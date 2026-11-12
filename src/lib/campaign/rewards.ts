import { z } from 'zod';
import { logger } from '../logger';

// Mukofot qoidalari: o'rin pog'onasi (1-o'rin 100% va h.k.) yoki "kamida N ta
// referal" (base). Ikkalasi bir vaqtda mos kelsa, kattasi beriladi.
// Bu yerda db yo'q — store.ts ranking'ni bir marta yig'ib, shu funksiyalarga beradi.

export type RewardTier = { fromRank: number; toRank: number; percent: number; minReferrals: number };
export type BaseReward = { min: number | null; pct: number | null };

/** A3 yangi aksiya yaratishda shularni oladi. */
export const DEFAULT_REWARD_TIERS: RewardTier[] = [
  { fromRank: 1, toRank: 1, percent: 100, minReferrals: 10 },
  { fromRank: 2, toRank: 3, percent: 70, minReferrals: 10 },
  { fromRank: 4, toRank: 10, percent: 50, minReferrals: 10 },
  { fromRank: 11, toRank: 20, percent: 30, minReferrals: 10 },
];

export const DEFAULT_BASE_REWARD: { min: number; pct: number } = { min: 5, pct: 20 };

const tierSchema = z.object({
  fromRank: z.number().int().min(1),
  toRank: z.number().int().min(1),
  percent: z.number().int().min(1).max(100),
  minReferrals: z.number().int().min(0),
}).refine((t) => t.toRank >= t.fromRank);

/** Bazadagi Json (qo'lda SQL bilan ham yozilishi mumkin) — noto'g'ri bo'lsa bot yiqilmasin: mukofotsiz. */
export function parseRewardTiers(json: unknown): RewardTier[] {
  const parsed = z.array(tierSchema).safeParse(json);
  if (!parsed.success) {
    logger.warn('Invalid campaign rewardTiers, using none', { issues: parsed.error.issues.length });
    return [];
  }
  return parsed.data;
}

/** O'rin va referal soniga mos eng katta foiz; hech biri mos kelmasa 0. */
export function rewardFor(rank: number, count: number, tiers: RewardTier[], base: BaseReward): number {
  let best = 0;
  for (const t of tiers) {
    if (t.fromRank <= rank && rank <= t.toRank && count >= t.minReferrals) best = Math.max(best, t.percent);
  }
  if (base.min !== null && base.pct !== null && count >= base.min) best = Math.max(best, base.pct);
  return best;
}

export type RankInput = { participantId: string; activeCount: number; lastActiveAt: Date | null; joinedAt: Date };
export type RankedParticipant = RankInput & { rank: number };

function time(d: Date | null): number {
  // 0 balli ishtirokchida lastActiveAt yo'q — teng balda oxirga.
  return d ? d.getTime() : Number.POSITIVE_INFINITY;
}

/**
 * Teng balda o'sha songa birinchi yetgan yuqorida (lastActiveAt o'sish
 * bo'yicha) — aks holda kechroq qo'shilgan odam tasodifan o'zib ketardi.
 * O'rinlar takrorlanmaydi: har bir o'rinda bitta odam (mukofot o'ringa bog'liq).
 */
export function rankParticipants(rows: RankInput[]): RankedParticipant[] {
  return [...rows]
    .sort((a, b) =>
      b.activeCount - a.activeCount
      || time(a.lastActiveAt) - time(b.lastActiveAt)
      || a.joinedAt.getTime() - b.joinedAt.getTime()
      || a.participantId.localeCompare(b.participantId))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

/**
 * Keyingi katta mukofotgacha eng yaqin maqsad. O'rin pog'onasi uchun
 * `toRank` dagi (men bo'lmagan) odamdan bitta ko'p kerak — tenglikda oldin
 * yetgan yuqorida qoladi. `null` — undan katta mukofot yo'q.
 */
export function nextGoal(
  me: RankedParticipant,
  ranking: RankedParticipant[],
  tiers: RewardTier[],
  base: BaseReward,
): { percent: number; needed: number } | null {
  const current = rewardFor(me.rank, me.activeCount, tiers, base);
  const others = ranking.filter((r) => r.participantId !== me.participantId);
  const countAt = (rank: number) => others[rank - 1]?.activeCount ?? 0;

  const candidates: { percent: number; needed: number }[] = [];
  for (const t of tiers) {
    if (t.percent <= current) continue;
    const needed = Math.max(t.minReferrals, countAt(t.toRank) + 1) - me.activeCount;
    if (needed > 0) candidates.push({ percent: t.percent, needed });
  }
  if (base.min !== null && base.pct !== null && base.pct > current) {
    const needed = base.min - me.activeCount;
    if (needed > 0) candidates.push({ percent: base.pct, needed });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.needed - b.needed || b.percent - a.percent);
  return candidates[0];
}

/** Aksiya yozuvidagi qoidalar (Json + ikki ustun) → hisoblash uchun shakl. */
export function campaignRewardRules(c: { rewardTiers: unknown; baseRewardMin: number | null; baseRewardPct: number | null }): { tiers: RewardTier[]; base: BaseReward } {
  return { tiers: parseRewardTiers(c.rewardTiers), base: { min: c.baseRewardMin, pct: c.baseRewardPct } };
}

export type Standing = { activeCount: number; rank: number; percent: number; next: { percent: number; needed: number } | null };

/** Bitta ishtirokchining holati — ranking bir marta yig'iladi, har ishtirokchi uchun qayta so'ralmaydi (cron). */
export function standingOf(ranking: RankedParticipant[], participantId: string, rules: { tiers: RewardTier[]; base: BaseReward }): Standing | null {
  const me = ranking.find((r) => r.participantId === participantId);
  if (!me) return null;
  return {
    activeCount: me.activeCount,
    rank: me.rank,
    percent: rewardFor(me.rank, me.activeCount, rules.tiers, rules.base),
    next: nextGoal(me, ranking, rules.tiers, rules.base),
  };
}
