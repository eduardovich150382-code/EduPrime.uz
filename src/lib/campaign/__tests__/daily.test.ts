import { beforeEach, describe, expect, it, vi } from 'vitest';

const s = vi.hoisted(() => ({ load: vi.fn(), claimDaily: vi.fn(), claimLastDay: vi.fn(), ranking: vi.fn(), warn: vi.fn() }));
vi.mock('../store', () => ({ loadCurrentCampaignFresh: s.load, claimDaily: s.claimDaily, claimLastDay: s.claimLastDay, loadRanking: s.ranking }));
vi.mock('@/lib/db', () => ({ db: {} }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: s.warn, info: vi.fn() } }));
import { parseBotSettings } from '@/lib/bot-settings';
import { rankParticipants } from '../rewards';
import { runCampaignDaily, type DailyDeps } from '../daily';
import type { TelegramResult } from '../telegram';
import { campaignFixture, campaignNow, participantFixture } from './fixtures';

function setup(count: number) {
  const participants = Array.from({ length: count }, (_, i) => participantFixture({ id: `p${i}`, telegramId: BigInt(i + 1), refCode: `Code${String(i).padStart(4, '0')}` }));
  s.ranking.mockResolvedValue({
    ranking: rankParticipants(participants.map((p) => ({ participantId: p.id, activeCount: 0, lastActiveAt: null, joinedAt: p.createdAt }))),
    participants: new Map(participants.map((p) => [p.id, p])),
  });
}

function deps(send: (chatId: string) => TelegramResult, clockStepMs = 0) {
  let clock = campaignNow.getTime();
  const sleeps: number[] = [];
  const d: DailyDeps = {
    bot: parseBotSettings([]),
    send: vi.fn(async (chatId: string) => send(chatId)),
    sleep: vi.fn(async (ms: number) => { sleeps.push(ms); clock += ms; }),
    now: () => { clock += clockStepMs; return new Date(clock); },
  };
  return { d, sleeps };
}

beforeEach(() => {
  vi.resetAllMocks();
  s.load.mockResolvedValue(campaignFixture());
  s.claimDaily.mockResolvedValue(true);
  s.claimLastDay.mockResolvedValue(true);
});

describe('runCampaignDaily', () => {
  it('soniyasiga ≤ 25 xabar: har xabar orasida 40 ms', async () => {
    setup(3);
    const { d, sleeps } = deps(() => ({ ok: true }));
    expect(await runCampaignDaily(d)).toMatchObject({ sent: 3, failed: 0 });
    expect(sleeps).toEqual([40, 40]);
  });
  it('429 — retry_after qadar kutib bir marta qayta', async () => {
    setup(2);
    let first = true;
    const { d, sleeps } = deps((chatId) => {
      if (chatId === '1' && first) { first = false; return { ok: false, error_code: 429, parameters: { retry_after: 3 } }; }
      return { ok: true };
    });
    expect(await runCampaignDaily(d)).toMatchObject({ sent: 2, failed: 0 });
    expect(sleeps[0]).toBe(3000);
    expect(d.send).toHaveBeenCalledTimes(3);
  });
  it('429 qayta urinishda ham — muvaffaqiyatsiz, keyingisiga o‘tadi', async () => {
    setup(2);
    const { d } = deps((chatId) => (chatId === '1' ? { ok: false, error_code: 429, parameters: { retry_after: 1 } } : { ok: true }));
    expect(await runCampaignDaily(d)).toMatchObject({ sent: 1, failed: 1 });
  });
  it('50 s byudjet: sig‘maganlar soni qaytadi va logga yoziladi', async () => {
    setup(10);
    // Har now() chaqiruvi 10 s — byudjet bir necha xabardan keyin tugaydi.
    const { d } = deps(() => ({ ok: true }), 10_000);
    const result = await runCampaignDaily(d);
    expect(result.skipped).toBeGreaterThan(0);
    expect(result.sent + result.skipped).toBe(10);
    expect(s.warn).toHaveBeenCalledWith(expect.stringContaining('time budget'), expect.objectContaining({ skipped: result.skipped }));
  });
  it('claim yutqazilsa (parallel cron) — reyting ham so‘ralmaydi', async () => {
    s.claimDaily.mockResolvedValue(false);
    const { d } = deps(() => ({ ok: true }));
    expect(await runCampaignDaily(d)).toMatchObject({ kind: null, reason: 'already_sent' });
    expect(s.ranking).not.toHaveBeenCalled();
  });
});
