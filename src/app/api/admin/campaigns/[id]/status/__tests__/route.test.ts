import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const m = vi.hoisted(() => {
  const tx = {
    campaign: { updateMany: vi.fn() },
    campaignParticipant: { deleteMany: vi.fn() },
    campaignReferral: { deleteMany: vi.fn() },
  };
  return {
    requireAdmin: vi.fn(), revalidate: vi.fn(), bot: vi.fn(), check: vi.fn(), tx,
    campaign: { findUnique: vi.fn(), updateMany: vi.fn() },
    campaignParticipant: { deleteMany: vi.fn() },
    campaignReferral: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  };
});
vi.mock('@/lib/api-auth', () => ({ requireAdmin: m.requireAdmin }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/cache-tags', () => ({ revalidateCampaigns: m.revalidate, CACHE_TAGS: { campaigns: 'campaigns', settings: 'settings' }, PUBLIC_CACHE_REVALIDATE_SEC: 3600 }));
vi.mock('@/lib/telegram-channel-check', () => ({ checkChannel: m.check }));
vi.mock('@/lib/db', () => ({
  db: {
    campaign: m.campaign, campaignParticipant: m.campaignParticipant, campaignReferral: m.campaignReferral, $transaction: m.$transaction,
  },
}));
vi.mock('@/lib/bot-settings', async (importOriginal) => ({ ...(await importOriginal<object>()), getBotSettings: m.bot }));
import { POST } from '../route';
import { parseBotSettings } from '@/lib/bot-settings';
import { campaignFixture, campaignNow } from '@/lib/campaign/__tests__/fixtures';

const ctx = { params: Promise.resolve({ id: 'cmp1' }) };
const post = (body: unknown) => POST(new NextRequest('http://localhost/api/admin/campaigns/cmp1/status', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}), ctx);
const draft = campaignFixture({ isPublished: false });
const adminOk = { ok: true, title: 'Kanal', memberCount: 10, isAdmin: true, canPost: true, canEdit: true };

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(campaignNow);
  vi.stubEnv('TELEGRAM_BOT_TOKEN', 'test-token');
  m.requireAdmin.mockResolvedValue({ error: null, user: { id: 'admin1', name: 'Admin' } });
  m.bot.mockResolvedValue(parseBotSettings([]));
  m.campaign.findUnique.mockResolvedValue(draft);
  m.check.mockResolvedValue(adminOk);
  m.tx.campaign.updateMany.mockResolvedValue({ count: 1 });
  m.$transaction.mockImplementation(async (fn: (tx: typeof m.tx) => Promise<unknown>) => fn(m.tx));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('POST status', () => {
  it('ADMIN emas — 403, hech narsa o‘zgarmaydi', async () => {
    m.requireAdmin.mockResolvedValue({ error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) });
    expect((await post({ action: 'publish' })).status).toBe(403);
    expect(m.campaign.findUnique).not.toHaveBeenCalled();
    expect(m.$transaction).not.toHaveBeenCalled();
  });

  it('publish: bot kanalda admin emas — 400, e’lon qilinmaydi', async () => {
    m.check.mockResolvedValue({ ...adminOk, isAdmin: false });
    const res = await post({ action: 'publish', clearTestData: true });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Bot kanalda admin emas');
    expect(m.check).toHaveBeenCalledWith('test-token', '@FizikaMSattestatsiya');
    expect(m.$transaction).not.toHaveBeenCalled();
    expect(m.revalidate).not.toHaveBeenCalled();
  });

  it('publish: Telegram javob bermasa — 502', async () => {
    m.check.mockRejectedValue(new Error('fetch failed'));
    expect((await post({ action: 'publish' })).status).toBe(502);
    expect(m.$transaction).not.toHaveBeenCalled();
  });

  it('publish: tugash vaqti o‘tgan — 400, kanal so‘ralmaydi', async () => {
    m.campaign.findUnique.mockResolvedValue(campaignFixture({ isPublished: false, endsAt: new Date('2026-11-19T00:00:00Z') }));
    expect((await post({ action: 'publish' })).status).toBe(400);
    expect(m.check).not.toHaveBeenCalled();
  });

  it('publish + clearTestData: ikkala deleteMany va update bitta tranzaksiyada', async () => {
    const res = await post({ action: 'publish', clearTestData: true });
    expect(res.status).toBe(200);
    expect(m.$transaction).toHaveBeenCalledOnce();
    expect(m.tx.campaignReferral.deleteMany).toHaveBeenCalledWith({ where: { campaignId: 'cmp1' } });
    expect(m.tx.campaignParticipant.deleteMany).toHaveBeenCalledWith({ where: { campaignId: 'cmp1' } });
    expect(m.tx.campaign.updateMany).toHaveBeenCalledWith({
      where: { id: 'cmp1', isPublished: false, finalizedAt: null }, data: { isPublished: true, isPaused: false },
    });
    // Tranzaksiyadan tashqarida hech narsa o'chmaydi.
    expect(m.campaignReferral.deleteMany).not.toHaveBeenCalled();
    expect(m.campaignParticipant.deleteMany).not.toHaveBeenCalled();
    expect(m.revalidate).toHaveBeenCalledOnce();
  });

  it('publish, clearTestData o‘chirilgan — hech narsa o‘chmaydi', async () => {
    expect((await post({ action: 'publish', clearTestData: false })).status).toBe(200);
    expect(m.tx.campaignReferral.deleteMany).not.toHaveBeenCalled();
    expect(m.tx.campaignParticipant.deleteMany).not.toHaveBeenCalled();
    expect(m.tx.campaign.updateMany).toHaveBeenCalledOnce();
  });

  it('publish: parallel e’lon (count 0) — 409, tranzaksiya throw bilan qaytariladi', async () => {
    m.tx.campaign.updateMany.mockResolvedValue({ count: 0 });
    const res = await post({ action: 'publish', clearTestData: true });
    expect(res.status).toBe(409);
    await expect(m.$transaction.mock.results[0].value).rejects.toThrow();
    expect(m.revalidate).not.toHaveBeenCalled();
  });

  it('pause — shartli updateMany va revalidate', async () => {
    m.campaign.findUnique.mockResolvedValue(campaignFixture());
    m.campaign.updateMany.mockResolvedValue({ count: 1 });
    expect((await post({ action: 'pause' })).status).toBe(200);
    expect(m.campaign.updateMany).toHaveBeenCalledWith({
      where: { id: 'cmp1', isPublished: true, isPaused: false, finalizedAt: null, endsAt: { gt: campaignNow } }, data: { isPaused: true },
    });
    expect(m.revalidate).toHaveBeenCalledOnce();
  });

  it('boshlangan aksiyani qoralamaga qaytarib bo‘lmaydi — 409', async () => {
    m.campaign.findUnique.mockResolvedValue(campaignFixture());
    expect((await post({ action: 'unpublish' })).status).toBe(409);
    expect(m.campaign.updateMany).not.toHaveBeenCalled();
  });

  it('noto‘g‘ri action — 400', async () => {
    expect((await post({ action: 'finalize' })).status).toBe(400);
  });
});
