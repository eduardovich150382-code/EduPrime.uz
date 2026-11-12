import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ warn: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { warn: m.warn, error: vi.fn() } }));
import {
  DEFAULT_BASE_REWARD, DEFAULT_REWARD_TIERS, nextGoal, parseRewardTiers, rankParticipants, rewardFor, standingOf,
  type RankInput,
} from '../rewards';

const tiers = DEFAULT_REWARD_TIERS;
const base = DEFAULT_BASE_REWARD;
const t0 = new Date('2026-11-15T00:00:00Z');
const at = (minutes: number) => new Date(t0.getTime() + minutes * 60_000);

// Ishtirokchilar: id → [ball, oxirgi ball vaqti (daqiqa), qo'shilgan vaqti (daqiqa)].
function rows(spec: Record<string, [number, number | null, number]>): RankInput[] {
  return Object.entries(spec).map(([participantId, [activeCount, last, joined]]) => ({
    participantId, activeCount, lastActiveAt: last === null ? null : at(last), joinedAt: at(joined),
  }));
}

beforeEach(() => { m.warn.mockClear(); });

describe('rewardFor', () => {
  it('pog‘ona va base dan kattasi', () => {
    expect(rewardFor(1, 12, tiers, base)).toBe(100);
    expect(rewardFor(3, 10, tiers, base)).toBe(70);
    expect(rewardFor(15, 10, tiers, base)).toBe(30);
    expect(rewardFor(25, 6, tiers, base)).toBe(20);
  });
  it('minReferrals yetmasa o‘rin bermaydi — faqat base yoki 0', () => {
    expect(rewardFor(1, 9, tiers, base)).toBe(20);
    expect(rewardFor(1, 4, tiers, base)).toBe(0);
    expect(rewardFor(1, 4, tiers, { min: null, pct: null })).toBe(0);
  });
});

describe('rankParticipants', () => {
  it('ball bo‘yicha; teng ballda o‘sha songa oldin yetgan yuqorida; 0 balli oxirida', () => {
    const ranked = rankParticipants(rows({ late: [3, 50, 0], early: [3, 20, 5], top: [5, 10, 9], zeroOld: [0, null, 1], zeroNew: [0, null, 2] }));
    expect(ranked.map((r) => r.participantId)).toEqual(['top', 'early', 'late', 'zeroOld', 'zeroNew']);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('nextGoal', () => {
  const goal = (spec: Record<string, [number, number | null, number]>, id: string) => {
    const ranking = rankParticipants(rows(spec));
    return nextGoal(ranking.find((r) => r.participantId === id)!, ranking, tiers, base);
  };

  it('base gacha: 3 ball → 20% uchun yana 2 ta', () => {
    expect(goal({ me: [3, 1, 0] }, 'me')).toEqual({ percent: 20, needed: 2 });
  });
  it('10-o‘ringa chiqish: 10-o‘rindagining bali + 1 (minReferrals dan katta bo‘lsa)', () => {
    const spec: Record<string, [number, number | null, number]> = { me: [11, 99, 0] };
    for (let i = 1; i <= 10; i++) spec[`p${i}`] = [22 - i, i, i];
    // Men 11-o'rinda (30%). 50% uchun 10-o'rinni olish kerak: boshqalar ichida 10-o'rinda 12 ball → 13 − 11 = 2.
    // 70% (3-o'rin, 19 ball) uchun 9, 100% uchun 11 kerak — eng yaqini 50%.
    expect(goal(spec, 'me')).toEqual({ percent: 50, needed: 2 });
  });
  it('minReferrals chegarasi: yolg‘iz ishtirokchi ham 10 tagacha yetishi kerak', () => {
    // Base (20%) allaqachon bor; 1-o'rin (100%) uchun countAt=0+1=1, lekin minReferrals=10 → 10 − 6 = 4.
    expect(goal({ me: [6, 1, 0] }, 'me')).toEqual({ percent: 100, needed: 4 });
  });
  it('teng needed — kattaroq foiz', () => {
    expect(nextGoal({ participantId: 'me', activeCount: 0, lastActiveAt: null, joinedAt: t0, rank: 1 }, [], [
      { fromRank: 1, toRank: 1, percent: 40, minReferrals: 3 }, { fromRank: 1, toRank: 5, percent: 30, minReferrals: 3 },
    ], { min: null, pct: null })).toEqual({ percent: 40, needed: 3 });
  });
  it('1-o‘rinda (100%) → null', () => {
    expect(goal({ me: [15, 1, 0], other: [9, 2, 1] }, 'me')).toBeNull();
  });
});

describe('standingOf', () => {
  it('bal, o‘rin, foiz va maqsad birga; noma’lum ishtirokchi — null', () => {
    const ranking = rankParticipants(rows({ a: [10, 1, 0], b: [4, 2, 1] }));
    expect(standingOf(ranking, 'a', { tiers, base })).toEqual({ activeCount: 10, rank: 1, percent: 100, next: null });
    expect(standingOf(ranking, 'b', { tiers, base })).toEqual({ activeCount: 4, rank: 2, percent: 0, next: { percent: 20, needed: 1 } });
    expect(standingOf(ranking, 'x', { tiers, base })).toBeNull();
  });
});

describe('parseRewardTiers', () => {
  it('to‘g‘ri JSON', () => {
    expect(parseRewardTiers(JSON.parse(JSON.stringify(DEFAULT_REWARD_TIERS)))).toEqual(DEFAULT_REWARD_TIERS);
  });
  it.each([
    ['satr', 'abc'],
    ['obyekt', { fromRank: 1 }],
    ['foiz > 100', [{ fromRank: 1, toRank: 1, percent: 150, minReferrals: 1 }]],
    ['toRank < fromRank', [{ fromRank: 3, toRank: 1, percent: 50, minReferrals: 1 }]],
    ['null', null],
  ])('noto‘g‘ri (%s) → [] + ogohlantirish', (_name, json) => {
    expect(parseRewardTiers(json)).toEqual([]);
    expect(m.warn).toHaveBeenCalledOnce();
  });
});
