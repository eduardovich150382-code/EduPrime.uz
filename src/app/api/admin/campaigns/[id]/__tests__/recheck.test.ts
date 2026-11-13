import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import type { TelegramResult } from '@/lib/campaign/telegram';

// POST /recheck — haqiqiy route + lib/campaign/recheck, baza xotirada.
const m = vi.hoisted(() => ({ requireAdmin: vi.fn(), revalidate: vi.fn(), tg: vi.fn() }));
vi.mock('@/lib/db', async () => ({ db: (await import('./fake-db')).fake.client }));
vi.mock('@/lib/api-auth', () => ({ requireAdmin: m.requireAdmin }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: vi.fn() }));
vi.mock('@/lib/cache-tags', async (importOriginal) => ({ ...(await importOriginal<object>()), revalidateCampaigns: m.revalidate }));
vi.mock('@/lib/campaign/telegram', () => ({ telegramApi: m.tg }));

import { POST } from '../recheck/route';
import { runRecheck } from '@/lib/campaign/recheck';
import { fake, type Row } from './fake-db';
import { ENDED, ctx, participant, referrals, seedCampaign } from './seed';

const req = () => new NextRequest('http://localhost/api/admin/campaigns/cmp1/recheck', { method: 'POST' });
const member = new Map<string, string | null>(); // user_id → status; null — Telegram xatosi
const ref = (id: string) => fake.tables().campaignReferral.find((r) => r.id === id) as Row;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(ENDED);
  vi.stubEnv('TELEGRAM_BOT_TOKEN', 'test-token');
  m.requireAdmin.mockResolvedValue({ error: null, user: { id: 'admin1', name: 'Admin' } });
  member.clear();
  m.tg.mockImplementation(async (_token: string, method: string, body: { user_id: string }): Promise<TelegramResult> => {
    if (method !== 'getChatMember') return { ok: true };
    const status = member.get(String(body.user_id));
    return status ? { ok: true, result: { status } } : { ok: false, description: 'Bad Request: member list is inaccessible' };
  });
  seedCampaign();
  participant('p1', 'Dilnoza');
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

const setMember = (r: Row, status: string | null) => member.set(String(r.referredTelegramId), status);

describe('POST /recheck', () => {
  it('holatlar o‘tishi: ACTIVE→LEFT, LEFT→ACTIVE, PENDING+a’zo→ACTIVE (confirmedAt = endsAt), PENDING+a’zo emas qoladi', async () => {
    const [a] = referrals('p1', 'ACTIVE', 1);
    const [l] = referrals('p1', 'LEFT', 1);
    const [p] = referrals('p1', 'PENDING', 1);
    const [q] = referrals('p1', 'PENDING', 1);
    setMember(a, 'left'); setMember(l, 'member'); setMember(p, 'member'); setMember(q, 'left');
    const res = await POST(req(), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ checked: 4, becameLeft: 1, becameActive: 2, remaining: 0 });
    expect(ref(a.id)).toMatchObject({ status: 'LEFT', checkedAt: ENDED });
    expect(ref(l.id).status).toBe('ACTIVE');
    expect(ref(p.id)).toMatchObject({ status: 'ACTIVE', confirmedAt: new Date('2026-11-26T18:59:00Z') });
    expect(ref(q.id)).toMatchObject({ status: 'PENDING', checkedAt: ENDED });
    expect(m.revalidate).toHaveBeenCalled();
  });

  it('INVALID va checkedAt ≥ endsAt tekshirilmaydi', async () => {
    const [inv] = referrals('p1', 'INVALID', 1);
    const [done] = referrals('p1', 'ACTIVE', 1, { checkedAt: new Date('2026-11-27T00:00:00Z') });
    setMember(inv, 'left'); setMember(done, 'left');
    expect(await (await POST(req(), ctx())).json()).toEqual({ checked: 0, becameLeft: 0, becameActive: 0, remaining: 0 });
    expect(m.tg).not.toHaveBeenCalled();
    expect(ref(done.id).status).toBe('ACTIVE');
  });

  it('unknown — partiya to‘xtaydi, yozuv o‘zgarmaydi, keyingi chaqiruv shundan davom etadi', async () => {
    const [x, y] = referrals('p1', 'ACTIVE', 2);
    setMember(x, null); setMember(y, 'left');
    const body = await (await POST(req(), ctx())).json();
    expect(body).toMatchObject({ checked: 0, remaining: 2, error: 'Telegram javob bermadi yoki bot kanalda admin emas' });
    expect(ref(x.id).status).toBe('ACTIVE');
    expect(ref(y.id).status).toBe('ACTIVE');
    setMember(x, 'member');
    expect(await (await POST(req(), ctx())).json()).toEqual({ checked: 2, becameLeft: 1, becameActive: 0, remaining: 0 });
  });

  it('429 — retry_after kutib bir marta qayta', async () => {
    const [x] = referrals('p1', 'ACTIVE', 1);
    m.tg.mockResolvedValueOnce({ ok: false, error_code: 429, parameters: { retry_after: 0 } });
    setMember(x, 'left');
    expect(await (await POST(req(), ctx())).json()).toMatchObject({ checked: 1, becameLeft: 1, remaining: 0 });
    expect(m.tg).toHaveBeenCalledTimes(2);
  });

  it('aksiya tugamagan → 400, yakunlangan → 409', async () => {
    vi.setSystemTime(new Date('2026-11-20T15:00:00Z'));
    expect((await POST(req(), ctx())).status).toBe(400);
    vi.setSystemTime(ENDED);
    seedCampaign({ finalizedAt: ENDED });
    expect((await POST(req(), ctx())).status).toBe(409);
  });

  it('ADMIN emas → 403', async () => {
    m.requireAdmin.mockResolvedValue({ error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) });
    expect((await POST(req(), ctx())).status).toBe(403);
  });
});

describe('runRecheck — vaqt byudjeti', () => {
  it('byudjet tugasa to‘xtaydi va remaining qaytaradi', async () => {
    const rows = referrals('p1', 'ACTIVE', 3);
    for (const r of rows) setMember(r, 'member');
    let clock = ENDED.getTime();
    const campaign = fake.tables().campaign[0] as unknown as Parameters<typeof runRecheck>[0];
    const result = await runRecheck(campaign, {
      getChatMember: (userId) => m.tg('t', 'getChatMember', { user_id: userId }),
      sleep: async () => undefined,
      now: () => { clock += 20_000; return new Date(clock); },
    });
    expect(result.checked).toBeGreaterThan(0);
    expect(result.remaining).toBe(3 - result.checked);
    expect(result.remaining).toBeGreaterThan(0);
  });
});
