import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const m = vi.hoisted(() => ({
  requireAdmin: vi.fn(), revalidate: vi.fn(), bot: vi.fn(),
  campaign: { count: vi.fn(), create: vi.fn(), findMany: vi.fn() },
}));
vi.mock('@/lib/api-auth', () => ({ requireAdmin: m.requireAdmin }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/cache-tags', () => ({ revalidateCampaigns: m.revalidate, CACHE_TAGS: { campaigns: 'campaigns', settings: 'settings' }, PUBLIC_CACHE_REVALIDATE_SEC: 3600 }));
vi.mock('@/lib/db', () => ({ db: { campaign: m.campaign } }));
vi.mock('@/lib/bot-settings', async (importOriginal) => ({ ...(await importOriginal<object>()), getBotSettings: m.bot }));
import { GET, POST } from '../route';
import { parseBotSettings } from '@/lib/bot-settings';
import { DEFAULT_REWARD_TIERS } from '@/lib/campaign/rewards';

const forbidden = () => ({ error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) });

beforeEach(() => {
  vi.clearAllMocks();
  m.requireAdmin.mockResolvedValue({ error: null, user: { id: 'admin1', name: 'Admin' } });
  m.bot.mockResolvedValue(parseBotSettings([
    { key: 'required_channel_username', value: '@FizikaKanal' }, { key: 'required_channel_link', value: 'https://t.me/FizikaKanal' },
  ]));
});
afterEach(() => { vi.useRealTimers(); });

describe('/api/admin/campaigns', () => {
  it('ADMIN emas — 403 (GET va POST), bazaga tegilmaydi', async () => {
    m.requireAdmin.mockResolvedValue(forbidden());
    expect((await GET()).status).toBe(403);
    expect((await POST()).status).toBe(403);
    expect(m.campaign.findMany).not.toHaveBeenCalled();
    expect(m.campaign.create).not.toHaveBeenCalled();
  });

  it('ro‘yxat: bosqich va sonlar', async () => {
    m.campaign.findMany.mockResolvedValue([{
      id: 'c1', title: 'A', startsAt: new Date('2026-11-15T00:00:00Z'), endsAt: new Date('2099-01-01T00:00:00Z'),
      isPublished: false, isPaused: false, finalizedAt: null, _count: { participants: 3, referrals: 2 },
    }]);
    const body = await (await GET()).json();
    expect(body.campaigns[0]).toMatchObject({ id: 'c1', phase: 'DRAFT', participants: 3, activeReferrals: 2 });
  });

  it('yakunlanmagan aksiya bor — 409, yaratilmaydi', async () => {
    m.campaign.count.mockResolvedValue(1);
    const res = await POST();
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Avvalgi aksiyani yakunlang yoki o'chiring");
    expect(m.campaign.create).not.toHaveBeenCalled();
    expect(m.campaign.count).toHaveBeenCalledWith({ where: { finalizedAt: null } });
  });

  it('standartlar: ertaga 00:00 → 7-kun 23:59 (Toshkent), kanal bot sozlamasidan, qoralama', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-13T20:30:00Z')); // Toshkentda 14-noyabr 01:30
    m.campaign.count.mockResolvedValue(0);
    m.campaign.create.mockResolvedValue({ id: 'new1' });
    const res = await POST();
    expect(res.status).toBe(201);
    const data = m.campaign.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      title: 'Referral aksiya', channelUsername: '@FizikaKanal', channelLink: 'https://t.me/FizikaKanal', isPublished: false,
      rewardTiers: DEFAULT_REWARD_TIERS, baseRewardMin: 5, baseRewardPct: 20, promoValidDays: 5, dailyEnabled: true, texts: {},
    });
    expect(data.startsAt.toISOString()).toBe('2026-11-14T19:00:00.000Z'); // 15-noyabr 00:00
    expect(data.endsAt.toISOString()).toBe('2026-11-21T18:59:00.000Z'); // 21-noyabr 23:59
    expect(m.revalidate).toHaveBeenCalledOnce();
  });
});
