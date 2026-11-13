import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const m = vi.hoisted(() => ({
  requireAdmin: vi.fn(), revalidate: vi.fn(), bot: vi.fn(),
  campaign: { findUnique: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
  campaignParticipant: { count: vi.fn() },
  campaignReferral: { count: vi.fn() },
}));
vi.mock('@/lib/api-auth', () => ({ requireAdmin: m.requireAdmin }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/cache-tags', () => ({ revalidateCampaigns: m.revalidate, CACHE_TAGS: { campaigns: 'campaigns', settings: 'settings' }, PUBLIC_CACHE_REVALIDATE_SEC: 3600 }));
vi.mock('@/lib/db', () => ({ db: { campaign: m.campaign, campaignParticipant: m.campaignParticipant, campaignReferral: m.campaignReferral } }));
vi.mock('@/lib/bot-settings', async (importOriginal) => ({ ...(await importOriginal<object>()), getBotSettings: m.bot }));
import { DELETE, GET, PATCH } from '../route';
import { parseBotSettings } from '@/lib/bot-settings';
import { DEFAULT_CAMPAIGN_TEXTS } from '@/lib/campaign/texts';
import { campaignFixture, campaignNow } from '@/lib/campaign/__tests__/fixtures';

const ctx = { params: Promise.resolve({ id: 'cmp1' }) };
const req = (method: string, body?: unknown) => new NextRequest('http://localhost/api/admin/campaigns/cmp1', {
  method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
});
const patch = (body: unknown) => PATCH(req('PATCH', body), ctx);
const draft = campaignFixture({ isPublished: false, texts: { rules: 'Eski qoidalar' } });
const active = campaignFixture(); // boshlangan (15-noyabr), campaignNow — 20-noyabr

const basic = (overrides: Record<string, unknown> = {}) => ({
  title: 'Noyabr', startsAt: '2026-11-15T05:00', endsAt: '2026-11-26T23:59', channelUsername: '@FizikaMSattestatsiya',
  channelLink: 'https://t.me/FizikaMSattestatsiya', dailyEnabled: true, promoValidDays: 5, ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(campaignNow);
  m.requireAdmin.mockResolvedValue({ error: null, user: { id: 'admin1', name: 'Admin' } });
  m.bot.mockResolvedValue(parseBotSettings([]));
  m.campaign.findUnique.mockResolvedValue(draft);
  m.campaign.update.mockResolvedValue({});
  m.campaignParticipant.count.mockResolvedValue(2);
  m.campaignReferral.count.mockResolvedValue(3);
});
afterEach(() => { vi.useRealTimers(); });

describe('ruxsat', () => {
  it('ADMIN emas — 403 (GET, PATCH, DELETE), bazaga tegilmaydi', async () => {
    m.requireAdmin.mockResolvedValue({ error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) });
    expect((await GET(req('GET'), ctx)).status).toBe(403);
    expect((await patch({ basic: basic() })).status).toBe(403);
    expect((await DELETE(req('DELETE'), ctx)).status).toBe(403);
    expect(m.campaign.findUnique).not.toHaveBeenCalled();
    expect(m.campaign.deleteMany).not.toHaveBeenCalled();
  });
});

describe('GET', () => {
  it('matnlar standart bilan birlashtirilgan, sinov ma’lumoti soni, Toshkent sanalari', async () => {
    const body = await (await GET(req('GET'), ctx)).json();
    expect(body.phase).toBe('DRAFT');
    expect(body.texts).toHaveLength(14);
    expect(body.texts.find((t: { key: string }) => t.key === 'rules')).toMatchObject({ text: 'Eski qoidalar', isDefault: false });
    expect(body.texts.find((t: { key: string }) => t.key === 'winner')).toMatchObject({ text: DEFAULT_CAMPAIGN_TEXTS.winner, isDefault: true });
    expect(body.testData).toEqual({ participants: 2, referrals: 3 });
    expect(body.campaign.endsAtLocal).toBe('2026-11-26T23:59');
    expect(body.sampleVars).toMatchObject({ ism: 'Admin', ball: '7', orin: '4', foiz: '50%', qolgan: '3', promokod: 'TEST1234' });
    expect(body.sampleVars.havola).toContain('start=c_TESTTEST');
  });
  it('topilmasa — 404', async () => {
    m.campaign.findUnique.mockResolvedValue(null);
    expect((await GET(req('GET'), ctx)).status).toBe(404);
  });
});

describe('PATCH texts', () => {
  it('noto‘g‘ri HTML — 400, qator raqami bilan, hech narsa yozilmaydi', async () => {
    const res = await patch({ texts: { rules: 'birinchi\n<b>yopilmagan', join_welcome: 'yaxshi' } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.textErrors.rules[0]).toMatchObject({ line: 2 });
    expect(m.campaign.update).not.toHaveBeenCalled();
    expect(m.revalidate).not.toHaveBeenCalled();
  });
  it('noma’lum o‘zgaruvchi — 400', async () => {
    expect((await patch({ texts: { rules: 'Salom {nomi}' } })).status).toBe(400);
    expect(m.campaign.update).not.toHaveBeenCalled();
  });
  it('to‘g‘ri matn birlashtiriladi; bo‘sh va standartga teng — kalit olib tashlanadi', async () => {
    m.campaign.findUnique.mockResolvedValue(campaignFixture({ isPublished: false, texts: { rules: 'Eski', winner: 'G‘olib' } }));
    const res = await patch({ texts: { join_welcome: '<b>Salom, {ism}!</b>', rules: '  ', winner: DEFAULT_CAMPAIGN_TEXTS.winner } });
    expect(res.status).toBe(200);
    expect(m.campaign.update).toHaveBeenCalledWith({ where: { id: 'cmp1' }, data: { texts: { join_welcome: '<b>Salom, {ism}!</b>' } } });
    expect(m.revalidate).toHaveBeenCalledOnce();
  });
  it('alert 200 belgidan uzun — 400', async () => {
    expect((await patch({ texts: { not_subscribed_alert: 'a'.repeat(201) } })).status).toBe(400);
  });
});

describe('PATCH basic', () => {
  it('Toshkent vaqti UTC ga aylanadi', async () => {
    expect((await patch({ basic: basic() })).status).toBe(200);
    const data = m.campaign.update.mock.calls[0][0].data;
    expect(data.startsAt.toISOString()).toBe('2026-11-15T00:00:00.000Z');
    expect(data.endsAt.toISOString()).toBe('2026-11-26T18:59:00.000Z');
  });
  it('boshlangan aksiyada startsAt o‘zgarsa — 400 va update yo‘q', async () => {
    m.campaign.findUnique.mockResolvedValue(active);
    const res = await patch({ basic: basic({ startsAt: '2026-11-16T05:00' }) });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Aksiya boshlangan: faqat tugash sanasini o'zgartirish mumkin");
    expect(m.campaign.update).not.toHaveBeenCalled();
  });
  it('boshlangan aksiyada endsAt uzaytiriladi', async () => {
    m.campaign.findUnique.mockResolvedValue(active);
    expect((await patch({ basic: basic({ endsAt: '2026-11-30T23:59' }) })).status).toBe(200);
    expect(m.campaign.update.mock.calls[0][0].data.endsAt.toISOString()).toBe('2026-11-30T18:59:00.000Z');
  });
  it('e’lon qilingandan keyin kanal o‘zgarmaydi', async () => {
    m.campaign.findUnique.mockResolvedValue(active);
    expect((await patch({ basic: basic({ channelUsername: '@BoshqaKanal' }) })).status).toBe(400);
    expect(m.campaign.update).not.toHaveBeenCalled();
  });
  it('tugash boshlanishdan oldin — 400', async () => {
    expect((await patch({ basic: basic({ endsAt: '2026-11-14T00:00' }) })).status).toBe(400);
  });
});

describe('PATCH rewards', () => {
  it('kesishgan pog‘onalar — 400 va hech narsa yozilmaydi (boshqa qism ham)', async () => {
    const res = await patch({
      basic: basic(),
      rewards: { tiers: [{ fromRank: 1, toRank: 3, percent: 50, minReferrals: 0 }, { fromRank: 2, toRank: 4, percent: 30, minReferrals: 0 }], baseMin: null, basePct: null },
    });
    expect(res.status).toBe(400);
    expect(m.campaign.update).not.toHaveBeenCalled();
  });
  it('to‘g‘ri — tartiblanib saqlanadi', async () => {
    const tiers = [{ fromRank: 2, toRank: 3, percent: 70, minReferrals: 5 }, { fromRank: 1, toRank: 1, percent: 100, minReferrals: 5 }];
    expect((await patch({ rewards: { tiers, baseMin: 3, basePct: 10 } })).status).toBe(200);
    expect(m.campaign.update.mock.calls[0][0].data).toEqual({ rewardTiers: [tiers[1], tiers[0]], baseRewardMin: 3, baseRewardPct: 10 });
  });
});

describe('DELETE', () => {
  it('qoralama o‘chadi — shart so‘rovning o‘zida', async () => {
    m.campaign.deleteMany.mockResolvedValue({ count: 1 });
    expect((await DELETE(req('DELETE'), ctx)).status).toBe(200);
    expect(m.campaign.deleteMany).toHaveBeenCalledWith({ where: { id: 'cmp1', isPublished: false } });
    expect(m.revalidate).toHaveBeenCalledOnce();
  });
  it('e’lon qilingan — 409', async () => {
    m.campaign.deleteMany.mockResolvedValue({ count: 0 });
    m.campaign.findUnique.mockResolvedValue({ isPublished: true });
    expect((await DELETE(req('DELETE'), ctx)).status).toBe(409);
    expect(m.revalidate).not.toHaveBeenCalled();
  });
});
