import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// POST /finalize va GET /finalize/preview — haqiqiy route'lar + lib/campaign/finalize,
// baza xotirada (claim sharti, P2002 dan keyingi rollback shu yerda baholanadi).
const m = vi.hoisted(() => ({ requireAdmin: vi.fn(), revalidate: vi.fn(), bot: vi.fn() }));
vi.mock('@/lib/db', async () => ({ db: (await import('./fake-db')).fake.client }));
vi.mock('@/lib/api-auth', () => ({ requireAdmin: m.requireAdmin }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: vi.fn() }));
vi.mock('@/lib/cache-tags', async (importOriginal) => ({ ...(await importOriginal<object>()), revalidateCampaigns: m.revalidate }));
vi.mock('@/lib/bot-settings', async (importOriginal) => ({ ...(await importOriginal<object>()), getBotSettings: m.bot }));

import { POST } from '../finalize/route';
import { GET as previewGET } from '../finalize/preview/route';
import { parseBotSettings } from '@/lib/bot-settings';
import { notifyKey } from '@/lib/campaign/internal-keys';
import { fake } from './fake-db';
import { ENDED, ctx, participant, referrals, seedCampaign } from './seed';

const finalize = (body: unknown = {}) => POST(new NextRequest('http://localhost/api/admin/campaigns/cmp1/finalize', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}), ctx());
const preview = async () => (await previewGET(new NextRequest('http://localhost/api'), ctx())).json();
const campaignRow = () => fake.tables().campaign[0];
const promos = () => fake.tables().promoCode;
const p2002 = () => Object.assign(new Error('Unique constraint failed on code'), { code: 'P2002' });

/**
 * Standart mukofotlar: 1-o'rin 100% (≥ 10), 2–3 70% (≥ 10), base: ≥ 5 → 20%.
 * p1: 12 faol → 100%. p2: 6 faol + 4 chiqqan + 3 yaroqsiz — ular hisoblansa
 * 13 bo'lib 70% olardi; faqat faollar → base 20%. p3: 4 faol → 0 (minReferrals yetmaydi).
 */
function seedRanking() {
  participant('p1', 'Dilnoza');
  participant('p2', 'Jasur');
  participant('p3', 'Malika');
  referrals('p1', 'ACTIVE', 12, { checkedAt: ENDED });
  referrals('p2', 'ACTIVE', 6, { checkedAt: ENDED });
  referrals('p2', 'LEFT', 4, { checkedAt: ENDED });
  referrals('p2', 'INVALID', 3);
  referrals('p3', 'ACTIVE', 4, { checkedAt: ENDED });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(ENDED);
  m.requireAdmin.mockResolvedValue({ error: null, user: { id: 'admin1', name: 'Admin' } });
  m.bot.mockResolvedValue(parseBotSettings([{ key: 'course_price', value: '1000000' }]));
  seedCampaign();
  seedRanking();
});
afterEach(() => { vi.useRealTimers(); });

describe('GET /finalize/preview', () => {
  it('g‘oliblar, sonlar va jami chegirma', async () => {
    const body = await preview();
    expect(body.winners.map((w: { name: string; percent: number; rank: number }) => [w.rank, w.name, w.percent])).toEqual([[1, 'Dilnoza', 100], [2, 'Jasur', 20]]);
    expect(body).toMatchObject({ uncheckedCount: 0, noPrizeCount: 1, participantCount: 3, activeReferrals: 22, maxDiscountSum: 1_200_000 });
  });
  it('tekshirilmagan referallar sanaladi (INVALID emas)', async () => {
    referrals('p3', 'PENDING', 2);
    expect((await preview()).uncheckedCount).toBe(2);
  });
});

describe('POST /finalize', () => {
  it('promokodlar: o‘rin pog‘onasi va base; LEFT/INVALID hisoblanmaydi; validUntil — Toshkent 23:59:59', async () => {
    const res = await finalize();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, promoCount: 2, noPrizeCount: 1 });
    expect(campaignRow().finalizedAt).toEqual(ENDED);
    const telegramOf = (pid: string) => fake.tables().campaignParticipant.find((p) => p.id === pid)?.telegramId;
    expect(promos().map((p) => [p.telegramId, p.percent])).toEqual([[telegramOf('p1'), 100], [telegramOf('p2'), 20]]);
    for (const p of promos()) {
      expect(p.code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
      expect((p.validUntil as Date).toISOString()).toBe('2026-12-02T18:59:59.000Z');
    }
    expect(fake.tables().systemSetting.find((s) => s.key === notifyKey('cmp1'))?.value).toBe('{"lastParticipantId":null,"sent":0,"failed":0,"done":false}');
    expect(m.revalidate).toHaveBeenCalled();
  });

  it('ikkinchi chaqiruv → 409, promokod takrorlanmaydi', async () => {
    expect((await finalize()).status).toBe(200);
    const res = await finalize();
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('Allaqachon yakunlangan');
    expect(promos()).toHaveLength(2);
  });

  it('tekshirilmagan referal bor va skipRecheck yo‘q → 400; skipRecheck bilan — yakunlanadi', async () => {
    referrals('p3', 'ACTIVE', 1); // checkedAt < endsAt
    const res = await finalize();
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Avval qayta tekshiruvni tugating');
    expect(campaignRow().finalizedAt).toBeNull();
    expect((await finalize({ skipRecheck: true })).status).toBe(200);
  });

  it('P2002 — butun tranzaksiya qaytadan (claim ham rollback bo‘lgan)', async () => {
    const createMany = vi.spyOn(fake.client.promoCode, 'createMany').mockRejectedValueOnce(p2002());
    expect((await finalize()).status).toBe(200);
    expect(createMany).toHaveBeenCalledTimes(2);
    expect(promos()).toHaveLength(2);
  });

  it('P2002 uch marta — 500, aksiya yakunlanmagan qoladi', async () => {
    vi.spyOn(fake.client.promoCode, 'createMany').mockRejectedValue(p2002());
    expect((await finalize()).status).toBe(500);
    expect(campaignRow().finalizedAt).toBeNull();
    expect(promos()).toHaveLength(0);
  });

  it('pauzadagi va qoralama tugagan aksiya ham yakunlanadi', async () => {
    seedCampaign({ isPaused: true });
    expect((await finalize()).status).toBe(200);
    seedCampaign({ isPublished: false });
    seedRanking();
    expect(await (await finalize()).json()).toMatchObject({ ok: true, promoCount: 2 });
  });

  it('aksiya tugamagan → 400', async () => {
    vi.setSystemTime(new Date('2026-11-20T15:00:00Z'));
    expect((await finalize()).status).toBe(400);
    expect(campaignRow().finalizedAt).toBeNull();
  });

  it('ADMIN emas → 403 (finalize va preview)', async () => {
    m.requireAdmin.mockResolvedValue({ error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) });
    expect((await finalize()).status).toBe(403);
    expect((await previewGET(new NextRequest('http://localhost/api'), ctx())).status).toBe(403);
  });
});
