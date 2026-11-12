import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Campaign } from '@prisma/client';

// Xotiradagi "baza": haqiqiy store.ts ishlaydi, shartli updateMany shu yerda
// baholanadi — "bir kunda ikki marta" claim mantig'ining o'zi tekshiriladi.
const s = vi.hoisted(() => ({ campaign: null as Campaign | null, participants: [] as Record<string, unknown>[], active: [] as { participantId: string; count: number }[], blocked: new Set<string>() }));
vi.mock('@/lib/db', () => ({
  db: {
    campaign: {
      findFirst: async () => (s.campaign ? { ...s.campaign } : null),
      updateMany: async ({ where, data }: { where: { id: string; lastDayReminderSentAt?: null; OR?: [unknown, { lastDailySentAt: { lt: Date } }] }; data: Partial<Campaign> }) => {
        const c = s.campaign;
        if (!c || c.id !== where.id) return { count: 0 };
        if ('lastDayReminderSentAt' in where && c.lastDayReminderSentAt !== null) return { count: 0 };
        if (where.OR) {
          const before = where.OR[1].lastDailySentAt.lt;
          if (c.lastDailySentAt !== null && !(c.lastDailySentAt < before)) return { count: 0 };
        }
        Object.assign(c, data);
        return { count: 1 };
      },
    },
    campaignParticipant: { findMany: async () => s.participants },
    campaignReferral: {
      groupBy: async () => s.active.map((a) => ({ participantId: a.participantId, _count: { _all: a.count }, _max: { confirmedAt: new Date('2026-11-18T00:00:00Z') } })),
    },
    systemSetting: { findMany: async () => [] },
  },
}));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: vi.fn() }));
import { GET } from '../route';
import { campaignFixture, participantFixture } from '@/lib/campaign/__tests__/fixtures';

const request = (auth = 'Bearer test-secret') => new NextRequest('http://localhost/api/cron/campaign-daily', { headers: { authorization: auth } });
const sentMessages = () => vi.mocked(fetch).mock.calls
  .filter(([url]) => String(url).endsWith('/sendMessage'))
  .map(([, init]) => JSON.parse(String(init?.body)) as { chat_id: string; text: string });

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', 'test-secret');
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-20T15:00:00Z'));
  s.campaign = campaignFixture();
  s.participants = [
    participantFixture({ id: 'a', telegramId: BigInt(1), firstName: 'Aziz', refCode: 'AAAAaaaa' }),
    participantFixture({ id: 'b', telegramId: BigInt(2), firstName: 'Bobur', refCode: 'BBBBbbbb' }),
    participantFixture({ id: 'c', telegramId: BigInt(3), firstName: 'Charos', refCode: 'CCCCcccc' }),
  ];
  s.active = [{ participantId: 'a', count: 4 }, { participantId: 'b', count: 1 }];
  s.blocked = new Set();
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: { body?: string }) => {
    const body = JSON.parse(String(init?.body)) as { chat_id: string };
    const blocked = s.blocked.has(String(body.chat_id));
    return { json: async () => (blocked ? { ok: false, error_code: 403, description: 'Forbidden: bot was blocked by the user' } : { ok: true, result: {} }) };
  }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('campaign-daily cron', () => {
  it('secret yo‘q yoki noto‘g‘ri → 401, hech narsa yuborilmaydi', async () => {
    expect((await GET(request('Bearer wrong'))).status).toBe(401);
    vi.stubEnv('CRON_SECRET', '');
    expect((await GET(request())).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('har ishtirokchiga daily_result (reyting bilan), keyin lastDailySentAt', async () => {
    const res = await (await GET(request())).json();
    expect(res).toMatchObject({ success: true, kind: 'daily_result', sent: 3, failed: 0, skipped: 0 });
    const byChat = new Map(sentMessages().map((m) => [m.chat_id, m.text]));
    expect(byChat.get('1')).toContain('<b>4</b> ball, <b>1</b>-o\'rin');
    expect(byChat.get('1')).toContain('20% chegirmagacha yana 1 ta odam');
    expect(byChat.get('3')).toContain('<b>0</b> ball, <b>3</b>-o\'rin');
    expect(byChat.get('2')).toContain('https://t.me/EduPrimeuzbot?start=c_BBBBbbbb');
    expect(s.campaign?.lastDailySentAt?.toISOString()).toBe('2026-11-20T15:00:00.000Z');
  });
  it('bir kunda ikki marta — ikkinchisi yubormaydi; ertasi kuni yana yuboradi', async () => {
    await GET(request());
    vi.setSystemTime(new Date('2026-11-20T15:20:00Z'));
    const second = await (await GET(request())).json();
    expect(second).toMatchObject({ kind: null, reason: 'already_sent', sent: 0 });
    expect(sentMessages()).toHaveLength(3);
    vi.setSystemTime(new Date('2026-11-21T15:00:00Z'));
    expect(await (await GET(request())).json()).toMatchObject({ kind: 'daily_result', sent: 3 });
  });
  it('oxirgi 24 soatda — daily_result o‘rniga last_day, bir marta', async () => {
    // Tugash 26-noyabr 23:59 Toshkent. 25-noyabr 20:00 da ~28 soat qolgan — oddiy kunlik.
    vi.setSystemTime(new Date('2026-11-25T15:00:00Z'));
    expect(await (await GET(request())).json()).toMatchObject({ kind: 'daily_result', sent: 3 });
    // 26-noyabr 20:00 — ~4 soat qolgan: last_day.
    vi.setSystemTime(new Date('2026-11-26T15:00:00Z'));
    expect(await (await GET(request())).json()).toMatchObject({ kind: 'last_day', sent: 3 });
    expect(sentMessages().at(-1)?.text).toContain('Aksiya tugashiga 24 soatdan kam qoldi!');
    expect(s.campaign?.lastDayReminderSentAt?.toISOString()).toBe('2026-11-26T15:00:00.000Z');
    // Qayta chaqiruv — na last_day, na kunlik.
    vi.setSystemTime(new Date('2026-11-26T15:10:00Z'));
    expect(await (await GET(request())).json()).toMatchObject({ kind: null, reason: 'already_sent' });
    expect(sentMessages()).toHaveLength(6);
  });
  it('bitta 403 (bot bloklangan) qolganlarni to‘xtatmaydi', async () => {
    s.blocked.add('1');
    const res = await (await GET(request())).json();
    expect(res).toMatchObject({ sent: 2, failed: 1 });
    expect(sentMessages().map((m) => m.chat_id)).toEqual(['1', '2', '3']);
  });
  it.each([
    ['qoralama', { isPublished: false }],
    ['to‘xtatilgan', { isPaused: true }],
    ['kunlik o‘chiq', { dailyEnabled: false }],
  ])('%s aksiya — hech narsa yuborilmaydi', async (_name, overrides) => {
    s.campaign = campaignFixture(overrides);
    expect(await (await GET(request())).json()).toMatchObject({ kind: null, sent: 0 });
    expect(sentMessages()).toHaveLength(0);
  });
  it('aksiya yo‘q — 200, hech narsa', async () => {
    s.campaign = null;
    expect(await (await GET(request())).json()).toMatchObject({ success: true, kind: null, reason: 'no_campaign' });
  });
});
