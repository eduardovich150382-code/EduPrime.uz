import { describe, expect, it } from 'vitest';
import {
  CREATE_CONFLICT_ERROR, STARTS_AT_LOCKED_ERROR, canCreate, canDelete, canEditChannel, checkCampaignText, maxDiscountSum,
  normalizeTextOverride, publishProblems, rewardSummary, statusTransition, validateDateChange, validateDates, validateRewards,
} from '../admin-rules';
import { DEFAULT_BASE_REWARD, DEFAULT_REWARD_TIERS, type RewardTier } from '../rewards';
import { DEFAULT_CAMPAIGN_TEXTS } from '../texts';
import { campaignFixture, campaignNow } from './fixtures';

const draft = campaignFixture({ isPublished: false });
const active = campaignFixture(); // 15-noyabrdan 26-noyabrgacha, campaignNow — 20-noyabr
const upcoming = campaignFixture({ startsAt: new Date('2026-11-22T19:00:00Z') });
const base = { min: 5, pct: 20 };
const tier = (fromRank: number, toRank: number, percent = 50, minReferrals = 0): RewardTier => ({ fromRank, toRank, percent, minReferrals });

describe('yaratish va o‘chirish', () => {
  it('yakunlanmagan aksiya bo‘lsa — 409 matni', () => {
    expect(canCreate(0)).toEqual({ ok: true });
    expect(canCreate(1)).toEqual({ ok: false, error: CREATE_CONFLICT_ERROR });
  });
  it('faqat qoralama o‘chiriladi', () => {
    expect(canDelete(draft).ok).toBe(true);
    expect(canDelete(active).ok).toBe(false);
    expect(canDelete(campaignFixture({ isPaused: true })).ok).toBe(false);
  });
  it('kanal faqat qoralamada o‘zgaradi', () => {
    expect(canEditChannel(draft).ok).toBe(true);
    expect(canEditChannel(upcoming).ok).toBe(false);
  });
});

describe('sanalar', () => {
  it('endsAt > startsAt', () => {
    expect(validateDates(new Date('2026-11-20T00:00:00Z'), new Date('2026-11-20T00:00:00Z')).ok).toBe(false);
    expect(validateDates(new Date('2026-11-20T00:00:00Z'), new Date('2026-11-20T00:01:00Z')).ok).toBe(true);
  });
  it('boshlangan aksiyada startsAt qulflangan, endsAt o‘zgaradi', () => {
    const later = new Date('2026-11-30T18:59:00Z');
    expect(validateDateChange(active, { startsAt: active.startsAt, endsAt: later }, campaignNow)).toEqual({ error: null, endsInPast: false });
    expect(validateDateChange(active, { startsAt: new Date('2026-11-16T00:00:00Z'), endsAt: later }, campaignNow).error).toBe(STARTS_AT_LOCKED_ERROR);
    // Pauzadagi boshlangan aksiya ham.
    const paused = campaignFixture({ isPaused: true });
    expect(validateDateChange(paused, { startsAt: new Date('2026-11-16T00:00:00Z'), endsAt: later }, campaignNow).error).toBe(STARTS_AT_LOCKED_ERROR);
  });
  it('boshlanmagan yoki qoralama — ikkala sana o‘zgaradi', () => {
    const next = { startsAt: new Date('2026-11-23T19:00:00Z'), endsAt: new Date('2026-11-30T18:59:00Z') };
    expect(validateDateChange(upcoming, next, campaignNow).error).toBeNull();
    expect(validateDateChange(draft, next, campaignNow).error).toBeNull();
  });
  it('o‘tgan endsAt — xato emas, tasdiq bayrog‘i', () => {
    const r = validateDateChange(active, { startsAt: active.startsAt, endsAt: new Date('2026-11-20T10:00:00Z') }, campaignNow);
    expect(r).toEqual({ error: null, endsInPast: true });
  });
  it('tugash boshlanishdan oldin — xato', () => {
    expect(validateDateChange(draft, { startsAt: new Date('2026-11-25T00:00:00Z'), endsAt: new Date('2026-11-24T00:00:00Z') }, campaignNow).error).toBeTruthy();
  });
});

describe('holat o‘tishlari', () => {
  it('publish faqat qoralamadan', () => {
    expect(statusTransition(draft, 'publish', campaignNow).ok).toBe(true);
    expect(statusTransition(active, 'publish', campaignNow).ok).toBe(false);
  });
  it('unpublish faqat boshlanmasdan oldin', () => {
    expect(statusTransition(upcoming, 'unpublish', campaignNow).ok).toBe(true);
    expect(statusTransition(active, 'unpublish', campaignNow).ok).toBe(false);
    expect(statusTransition(draft, 'unpublish', campaignNow).ok).toBe(false);
  });
  it('pause / resume', () => {
    expect(statusTransition(active, 'pause', campaignNow).ok).toBe(true);
    expect(statusTransition(draft, 'pause', campaignNow).ok).toBe(false);
    expect(statusTransition(campaignFixture({ isPaused: true }), 'pause', campaignNow).ok).toBe(false);
    expect(statusTransition(campaignFixture({ isPaused: true }), 'resume', campaignNow).ok).toBe(true);
    expect(statusTransition(active, 'resume', campaignNow).ok).toBe(false);
  });
  it('yakunlangan aksiyada hech narsa', () => {
    const finished = campaignFixture({ finalizedAt: campaignNow });
    for (const action of ['publish', 'unpublish', 'pause', 'resume'] as const) expect(statusTransition(finished, action, campaignNow).ok).toBe(false);
  });
});

describe('mukofot pog‘onalari', () => {
  it('standartlar to‘g‘ri', () => {
    expect(validateRewards(DEFAULT_REWARD_TIERS, DEFAULT_BASE_REWARD)).toEqual([]);
    expect(validateRewards([], { min: null, pct: null })).toEqual([]);
  });
  it('kesishish', () => {
    expect(validateRewards([tier(1, 3), tier(3, 5)], base).join()).toContain('kesishadi');
  });
  it('from > to', () => {
    expect(validateRewards([tier(4, 2)], base)).toHaveLength(1);
  });
  it('0% va 101%', () => {
    expect(validateRewards([tier(1, 1, 0)], base)).toHaveLength(1);
    expect(validateRewards([tier(1, 1, 101)], base)).toHaveLength(1);
    expect(validateRewards([tier(1, 1, 100)], base)).toEqual([]);
  });
  it('fromRank 0 va manfiy minReferrals', () => {
    expect(validateRewards([tier(0, 1)], base).length).toBeGreaterThan(0);
    expect(validateRewards([tier(1, 1, 50, -1)], base)).toHaveLength(1);
  });
  it('11 qator', () => {
    const tiers = Array.from({ length: 11 }, (_, i) => tier(i + 1, i + 1));
    expect(validateRewards(tiers, base).join()).toContain('10 ta');
    expect(validateRewards(tiers.slice(0, 10), base)).toEqual([]);
  });
  it('base yarim to‘ldirilgan yoki chegaradan tashqari', () => {
    expect(validateRewards([], { min: 5, pct: null })).toHaveLength(1);
    expect(validateRewards([], { min: null, pct: 20 })).toHaveLength(1);
    expect(validateRewards([], { min: 0, pct: 20 })).toHaveLength(1);
    expect(validateRewards([], { min: 3, pct: 101 })).toHaveLength(1);
  });
  it('xulosa va eng ko‘p chegirma', () => {
    expect(rewardSummary(DEFAULT_REWARD_TIERS.slice(0, 2), DEFAULT_BASE_REWARD))
      .toBe("1-o'rin: 100% (kamida 10 ta) · 2–3-o'rin: 70% (kamida 10 ta) · o'rindan qat'i nazar: kamida 5 ta → 20%");
    // 1×100% + 2×70% + 7×50% + 10×30% = 8.9 narx
    expect(maxDiscountSum(DEFAULT_REWARD_TIERS, 100_000)).toBeCloseTo(890_000);
  });
});

describe('matnlar', () => {
  const vars = { ism: 'Admin', ball: '7', havola: 'https://t.me/EduPrimeuzbot?start=c_TESTTEST' };
  it('standart matnlar to‘g‘ri', () => {
    for (const [key, text] of Object.entries(DEFAULT_CAMPAIGN_TEXTS)) {
      expect(checkCampaignText(key as keyof typeof DEFAULT_CAMPAIGN_TEXTS, text, vars).issues, key).toEqual([]);
    }
  });
  it('noma‘lum o‘zgaruvchi qatori bilan', () => {
    expect(checkCampaignText('rules', 'salom\n{nom}', vars).issues).toEqual([{ line: 2, message: "Noma'lum o'zgaruvchi {nom}" }]);
  });
  it('uzunlik: share_post 1024, alert teglarsiz 200', () => {
    expect(checkCampaignText('share_post', 'a'.repeat(1025), vars).issues).toHaveLength(1);
    expect(checkCampaignText('rules', 'a'.repeat(1025), vars).issues).toEqual([]);
    expect(checkCampaignText('not_subscribed_alert', `<b>${'a'.repeat(200)}</b>`, vars).issues).toEqual([]);
    expect(checkCampaignText('not_subscribed_alert', 'a'.repeat(201), vars).issues).toHaveLength(1);
  });
  it('bo‘sh yoki standartga teng matn saqlanmaydi', () => {
    expect(normalizeTextOverride('rules', '  ')).toBeNull();
    expect(normalizeTextOverride('rules', `${DEFAULT_CAMPAIGN_TEXTS.rules}\n`)).toBeNull();
    expect(normalizeTextOverride('rules', ' Yangi ')).toBe('Yangi');
  });
});

describe('e‘lon qilish shartlari', () => {
  it('to‘g‘ri qoralama — muammo yo‘q', () => {
    expect(publishProblems(draft, campaignNow, {})).toEqual([]);
  });
  it('o‘tgan endsAt, buzilgan pog‘onalar va xato matn', () => {
    const bad = campaignFixture({
      isPublished: false, endsAt: new Date('2026-11-19T00:00:00Z'), rewardTiers: [{ fromRank: 'x' }], texts: { rules: '<b>yopilmagan' },
    });
    const problems = publishProblems(bad, campaignNow, {});
    expect(problems).toHaveLength(3);
    expect(problems[2]).toContain('rules');
  });
  it('e‘lon qilingan — qayta e‘lon yo‘q', () => {
    expect(publishProblems(active, campaignNow, {})).toHaveLength(1);
  });
});
