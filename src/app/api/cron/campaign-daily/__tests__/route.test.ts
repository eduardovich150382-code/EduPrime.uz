import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Campaign } from '@prisma/client';

// Xotiradagi "baza": haqiqiy store.ts ishlaydi, shartli updateMany shu yerda
// baholanadi — "bir kunda ikki marta" claim mantig'ining o'zi tekshiriladi.
const s = vi.hoisted(() => ({
  campaign: null as Campaign | null, participants: [] as Record<string, unknown>[], active: [] as { participantId: string; count: number }[], blocked: new Set<string>(),
  posts: [] as Record<string, unknown>[], editReply: null as Record<string, unknown> | null,
}));
type PostRow = Record<string, unknown> & { id: string; updatedAt: Date };
const matches = (row: Record<string, unknown>, where: Record<string, unknown>) => Object.entries(where).every(([k, v]) => (
  v instanceof Date ? (row[k] as Date | null)?.getTime() === v.getTime() : row[k] === v
));
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
    campaignPost: {
      findMany: async ({ where }: { where: { campaignId: string } }) => (s.posts as PostRow[])
        .filter((p) => p.campaignId === where.campaignId).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).map((p) => ({ ...p })),
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const rows = (s.posts as PostRow[]).filter((p) => matches(p, where));
        for (const p of rows) Object.assign(p, data, { updatedAt: new Date() });
        return { count: rows.length };
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const p = (s.posts as PostRow[]).find((x) => x.id === where.id) as PostRow;
        Object.assign(p, data, { updatedAt: new Date() });
        return { ...p };
      },
    },
  },
}));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: vi.fn() }));
import { GET } from '../route';
import { campaignFixture, participantFixture } from '@/lib/campaign/__tests__/fixtures';
import { DEFAULT_POST_TEXTS } from '@/lib/campaign/posts';

const request = (auth = 'Bearer test-secret') => new NextRequest('http://localhost/api/cron/campaign-daily', { headers: { authorization: auth } });
const sentMessages = () => vi.mocked(fetch).mock.calls
  .filter(([url]) => String(url).endsWith('/sendMessage'))
  .map(([, init]) => JSON.parse(String(init?.body)) as { chat_id: string; text: string });
const CHANNEL = '@FizikaMSattestatsiya';
const calls = (method: string) => vi.mocked(fetch).mock.calls
  .filter(([url]) => String(url).endsWith(`/${method}`))
  .map(([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>);
const postFixture = (overrides: Record<string, unknown>) => ({
  id: 'post1', campaignId: 'cmp1', kind: 'LAST_DAY', text: '⏰ Oxirgi kun!\n{top10}', imageUrl: null, buttonText: null, buttonUrl: null,
  channelMessageId: null, publishedAt: null, createdAt: new Date('2026-11-14T00:00:00Z'), updatedAt: new Date('2026-11-14T00:00:00Z'), ...overrides,
});

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
  s.posts = [];
  s.editReply = null;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: { body?: string }) => {
    const body = JSON.parse(String(init?.body)) as { chat_id: string };
    const blocked = s.blocked.has(String(body.chat_id));
    if (String(url).includes('/editMessage') && s.editReply) return { json: async () => s.editReply };
    return { json: async () => (blocked ? { ok: false, error_code: 403, description: 'Forbidden: bot was blocked by the user' } : { ok: true, result: { message_id: 77 } }) };
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
  it('oxirgi 36 soatda — tugashdan oldingi kechada last_day, bir marta; oxirgi kechada yana daily_result', async () => {
    // Tugash 26-noyabr 23:59 Toshkent. 24-noyabr 20:00 da ~52 soat qolgan — oddiy kunlik.
    vi.setSystemTime(new Date('2026-11-24T15:00:00Z'));
    expect(await (await GET(request())).json()).toMatchObject({ kind: 'daily_result', sent: 3 });
    // 25-noyabr 20:00 — ~28 soat qolgan: last_day.
    vi.setSystemTime(new Date('2026-11-25T15:00:00Z'));
    expect(await (await GET(request())).json()).toMatchObject({ kind: 'last_day', sent: 3 });
    expect(sentMessages().at(-1)?.text).toContain('Aksiya tugashiga oz qoldi!</b>\nTugash: 26-noyabr, 23:59');
    expect(s.campaign?.lastDayReminderSentAt?.toISOString()).toBe('2026-11-25T15:00:00.000Z');
    // O'sha kechasi qayta chaqiruv — na last_day, na kunlik.
    vi.setSystemTime(new Date('2026-11-25T15:10:00Z'));
    expect(await (await GET(request())).json()).toMatchObject({ kind: null, reason: 'already_sent' });
    // 26-noyabr 20:00 — ~4 soat qolgan, last_day allaqachon ketgan: odatdagi kunlik.
    vi.setSystemTime(new Date('2026-11-26T15:00:00Z'));
    expect(await (await GET(request())).json()).toMatchObject({ kind: 'daily_result', sent: 3 });
    expect(sentMessages()).toHaveLength(9);
  });
  it('40 soat qolganda — hali daily_result', async () => {
    vi.setSystemTime(new Date('2026-11-25T02:59:00Z'));
    expect(await (await GET(request())).json()).toMatchObject({ kind: 'daily_result', sent: 3 });
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

describe('campaign-daily cron — kanal postlari', () => {
  it('LEADERBOARD kanalda bo‘lsa — yangi top10 bilan bitta tahrir, shaxsiy xabarlardan oldin', async () => {
    s.posts = [postFixture({ kind: 'LEADERBOARD', text: '📊 Reyting\n{top10}\n👥 {ishtirokchilar_soni}', channelMessageId: 55, publishedAt: new Date('2026-11-18T15:00:00Z') })];
    expect(await (await GET(request())).json()).toMatchObject({ kind: 'daily_result', posts: { leaderboard: 'ok' } });
    const edits = calls('editMessageText');
    expect(edits).toHaveLength(1);
    expect(edits[0]).toMatchObject({ chat_id: CHANNEL, message_id: 55, parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
    // Faqat ism, 0 balli (Charos) chiqmaydi.
    expect(edits[0].text).toBe('📊 Reyting\n🥇 Aziz — 4\n🥈 Bobur — 1\n👥 3');
    const urls = vi.mocked(fetch).mock.calls.map(([url]) => String(url));
    expect(urls.findIndex((u) => u.endsWith('/editMessageText'))).toBeLessThan(urls.findIndex((u) => u.endsWith('/sendMessage')));
  });

  it('LEADERBOARD: "not modified" e’tiborsiz; "not found" — channelMessageId tozalanadi', async () => {
    s.posts = [postFixture({ kind: 'LEADERBOARD', channelMessageId: 55, publishedAt: new Date('2026-11-18T15:00:00Z') })];
    s.editReply = { ok: false, error_code: 400, description: 'Bad Request: message is not modified' };
    expect(await (await GET(request())).json()).toMatchObject({ posts: { leaderboard: 'not_modified' } });
    expect(s.posts[0].channelMessageId).toBe(55);
    s.editReply = { ok: false, error_code: 400, description: 'Bad Request: message to edit not found' };
    vi.setSystemTime(new Date('2026-11-21T15:00:00Z'));
    expect(await (await GET(request())).json()).toMatchObject({ posts: { leaderboard: 'not_found' } });
    expect(s.posts[0].channelMessageId).toBeNull();
  });

  it('LAST_DAY standart matn bilan saqlangan — oynada kanalga o‘zi chiqadi, faqat bir marta', async () => {
    s.posts = [postFixture({ text: DEFAULT_POST_TEXTS.LAST_DAY })];
    vi.setSystemTime(new Date('2026-11-25T15:00:00Z'));
    expect(await (await GET(request())).json()).toMatchObject({ kind: 'last_day', posts: { lastDay: 'published' } });
    const toChannel = sentMessages().filter((m) => m.chat_id === CHANNEL);
    expect(toChannel).toHaveLength(1);
    expect(toChannel[0].text).toContain('Hozirgi peshqadamlar:\n🥇 Aziz — 4');
    expect(sentMessages()[0].chat_id).toBe(CHANNEL);
    expect(s.posts[0]).toMatchObject({ channelMessageId: 77 });
    vi.setSystemTime(new Date('2026-11-26T15:00:00Z'));
    await GET(request());
    expect(sentMessages().filter((m) => m.chat_id === CHANNEL)).toHaveLength(1);
  });

  it('LAST_DAY saqlanmagan — kanalga chiqmaydi', async () => {
    vi.setSystemTime(new Date('2026-11-25T15:00:00Z'));
    expect(await (await GET(request())).json()).toMatchObject({ kind: 'last_day', posts: {} });
    expect(sentMessages().filter((m) => m.chat_id === CHANNEL)).toHaveLength(0);
  });

  it('LAST_DAY 36 soatlik oynadan oldin chiqmaydi', async () => {
    s.posts = [postFixture({})];
    vi.setSystemTime(new Date('2026-11-24T15:00:00Z'));
    await GET(request());
    expect(sentMessages().filter((m) => m.chat_id === CHANNEL)).toHaveLength(0);
  });

  it('"Kunlik natija xabari" o‘chiq bo‘lsa ham LAST_DAY chiqadi', async () => {
    s.campaign = campaignFixture({ dailyEnabled: false });
    s.posts = [postFixture({})];
    vi.setSystemTime(new Date('2026-11-25T15:00:00Z'));
    expect(await (await GET(request())).json()).toMatchObject({ kind: null, reason: 'disabled', posts: { lastDay: 'published' } });
    expect(sentMessages().map((m) => m.chat_id)).toEqual([CHANNEL]);
  });

  it('last_day allaqachon yuborilgandan keyin saqlangan post keyingi cron ishida chiqadi', async () => {
    vi.setSystemTime(new Date('2026-11-25T15:00:00Z'));
    expect(await (await GET(request())).json()).toMatchObject({ kind: 'last_day' });
    s.posts = [postFixture({})];
    vi.setSystemTime(new Date('2026-11-26T15:00:00Z'));
    expect(await (await GET(request())).json()).toMatchObject({ kind: 'daily_result', posts: { lastDay: 'published' } });
    expect(sentMessages().filter((m) => m.chat_id === CHANNEL)).toHaveLength(1);
  });

  it('LAST_DAY: Telegram rad etsa publishedAt qaytariladi', async () => {
    s.posts = [postFixture({})];
    s.blocked.add(CHANNEL);
    vi.setSystemTime(new Date('2026-11-25T15:00:00Z'));
    expect(await (await GET(request())).json()).toMatchObject({ posts: { lastDay: 'failed' } });
    expect(s.posts[0]).toMatchObject({ publishedAt: null, channelMessageId: null });
  });
});
