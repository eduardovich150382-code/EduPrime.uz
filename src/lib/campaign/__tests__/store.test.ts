import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  campaign: { findFirst: vi.fn(), updateMany: vi.fn() },
  campaignParticipant: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  campaignReferral: { create: vi.fn(), updateMany: vi.fn(), groupBy: vi.fn(), findUnique: vi.fn() },
  campaignPost: { findFirst: vi.fn() },
  error: vi.fn(), cacheCalls: [] as { keys: string[]; options: { tags?: string[]; revalidate?: number } }[],
}));
vi.mock('@/lib/db', () => ({ db: { campaign: m.campaign, campaignParticipant: m.campaignParticipant, campaignReferral: m.campaignReferral, campaignPost: m.campaignPost } }));
vi.mock('@/lib/logger', () => ({ logger: { error: m.error, warn: vi.fn(), info: vi.fn() } }));
// Kesh "hit" ni taqlid qiladi: natija JSON'dan tiklanadi — Date satrga aylanadi.
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: <T>(fn: () => Promise<T>, keys: string[], options: { tags?: string[]; revalidate?: number }) => {
    m.cacheCalls.push({ keys, options });
    return async () => JSON.parse(JSON.stringify(await fn())) as T;
  },
}));
import {
  claimDaily, confirmReferral, createPendingReferral, getCurrentCampaign, joinCampaign, loadRanking, participantStanding,
} from '../store';
import { campaignFixture, participantFixture } from './fixtures';

const user = { telegramId: 777, username: 'ali', firstName: 'Ali' };
const p2002 = () => Object.assign(new Error('unique'), { code: 'P2002' });

beforeEach(() => { vi.clearAllMocks(); });

describe('getCurrentCampaign', () => {
  it('keshdan ham sanalar Date bo‘lib qaytadi; teg va 60 s', async () => {
    m.campaign.findFirst.mockResolvedValue(campaignFixture({ lastDailySentAt: new Date('2026-11-19T15:00:00Z') }));
    const c = await getCurrentCampaign();
    expect(c?.endsAt).toBeInstanceOf(Date);
    expect(c?.endsAt.toISOString()).toBe('2026-11-26T18:59:00.000Z');
    expect(c?.lastDailySentAt).toBeInstanceOf(Date);
    expect(c?.finalizedAt).toBeNull();
    expect(m.cacheCalls[0]?.options).toEqual({ revalidate: 60, tags: ['campaigns'] });
    expect(m.campaign.findFirst).toHaveBeenCalledWith({ where: { finalizedAt: null }, orderBy: { startsAt: 'desc' } });
  });
  it('baza xatosi (masalan, jadval hali yo‘q) — null, throw yo‘q', async () => {
    m.campaign.findFirst.mockRejectedValue(new Error('relation "Campaign" does not exist'));
    await expect(getCurrentCampaign()).resolves.toBeNull();
    expect(m.error).toHaveBeenCalled();
  });
});

describe('referallar', () => {
  it('createPendingReferral: P2002 → exists, boshqa xato → null', async () => {
    m.campaignReferral.create.mockResolvedValueOnce({});
    expect(await createPendingReferral('cmp1', 'p1', user)).toBe('created');
    expect(m.campaignReferral.create.mock.calls[0][0].data).toMatchObject({ referredTelegramId: BigInt(777), referredFirstName: 'Ali' });
    m.campaignReferral.create.mockRejectedValueOnce(p2002());
    expect(await createPendingReferral('cmp1', 'p1', user)).toBe('exists');
    m.campaignReferral.create.mockRejectedValueOnce(new Error('down'));
    expect(await createPendingReferral('cmp1', 'p1', user)).toBeNull();
  });
  it('confirmReferral faqat PENDING ni o‘zgartiradi', async () => {
    m.campaignReferral.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    expect(await confirmReferral('r1')).toBe(true);
    expect(await confirmReferral('r1')).toBe(false);
    expect(m.campaignReferral.updateMany.mock.calls[0][0].where).toEqual({ id: 'r1', status: 'PENDING' });
  });
});

describe('joinCampaign', () => {
  it('qayta bosish — mavjud ishtirokchi', async () => {
    const existing = participantFixture();
    m.campaignParticipant.create.mockRejectedValue(p2002());
    m.campaignParticipant.findUnique.mockResolvedValue(existing);
    expect(await joinCampaign('cmp1', user)).toBe(existing);
  });
  it('refCode to‘qnashuvi — yangi kod bilan qayta urinadi', async () => {
    m.campaignParticipant.create.mockRejectedValueOnce(p2002()).mockResolvedValueOnce(participantFixture({ refCode: 'New12345' }));
    m.campaignParticipant.findUnique.mockResolvedValue(null);
    expect((await joinCampaign('cmp1', user))?.refCode).toBe('New12345');
    const codes = m.campaignParticipant.create.mock.calls.map((call) => call[0].data.refCode);
    expect(codes[0]).not.toBe(codes[1]);
  });
});

describe('reyting', () => {
  it('ACTIVE soni bitta groupBy bilan; 0 balli ham ro‘yxatda', async () => {
    m.campaignParticipant.findMany.mockResolvedValue([
      participantFixture({ id: 'a', createdAt: new Date('2026-11-15T00:00:00Z') }),
      participantFixture({ id: 'b', createdAt: new Date('2026-11-16T00:00:00Z') }),
      participantFixture({ id: 'c', createdAt: new Date('2026-11-17T00:00:00Z') }),
    ]);
    m.campaignReferral.groupBy.mockResolvedValue([
      { participantId: 'b', _count: { _all: 6 }, _max: { confirmedAt: new Date('2026-11-18T00:00:00Z') } },
      { participantId: 'c', _count: { _all: 6 }, _max: { confirmedAt: new Date('2026-11-17T12:00:00Z') } },
    ]);
    const loaded = await loadRanking('cmp1');
    expect(loaded?.ranking.map((r) => [r.participantId, r.rank, r.activeCount])).toEqual([['c', 1, 6], ['b', 2, 6], ['a', 3, 0]]);
    expect(m.campaignReferral.groupBy).toHaveBeenCalledOnce();
    expect(m.campaignReferral.groupBy.mock.calls[0][0].where).toEqual({ campaignId: 'cmp1', status: 'ACTIVE' });
    const standing = await participantStanding(campaignFixture(), 'b');
    expect(standing).toMatchObject({ rank: 2, activeCount: 6, percent: 20 });
  });
});

describe('claimDaily', () => {
  it('shartli yangilash: bo‘sh yoki bugungi kundan oldin', async () => {
    m.campaign.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    const dayStart = new Date('2026-11-19T19:00:00Z');
    const now = new Date('2026-11-20T15:00:00Z');
    expect(await claimDaily('cmp1', dayStart, now)).toBe(true);
    expect(await claimDaily('cmp1', dayStart, now)).toBe(false);
    expect(m.campaign.updateMany.mock.calls[0][0]).toEqual({
      where: { id: 'cmp1', OR: [{ lastDailySentAt: null }, { lastDailySentAt: { lt: dayStart } }] }, data: { lastDailySentAt: now },
    });
  });
});
