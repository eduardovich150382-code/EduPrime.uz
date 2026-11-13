import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import type { Campaign } from '@prisma/client';

// /api/admin/campaigns/[id]/posts/* — haqiqiy route'lar va lib/campaign,
// baza xotirada (shartli updateMany shu yerda baholanadi: qulf mantig'ining o'zi tekshiriladi).
type Row = Record<string, unknown> & { id: string; kind: string; campaignId: string; updatedAt: Date };
const s = vi.hoisted(() => ({
  campaign: null as Campaign | null,
  posts: [] as Record<string, unknown>[],
  user: { telegramId: '456', name: 'Admin' } as { telegramId: string | null; name: string },
  settings: new Map<string, string>(),
  tg: {} as Record<string, unknown>,
  clock: 0,
}));
const m = vi.hoisted(() => ({ requireAdmin: vi.fn(), revalidate: vi.fn(), check: vi.fn(), bot: vi.fn() }));
const tick = () => new Date(Date.parse('2026-11-20T10:00:00Z') + (++s.clock) * 1000);
const same = (a: unknown, b: unknown) => (b instanceof Date ? a instanceof Date && a.getTime() === b.getTime() : a === b);
const match = (row: Record<string, unknown>, where: Record<string, unknown>) => Object.entries(where).every(([k, v]) => same(row[k], v));

vi.mock('@/lib/db', () => ({
  db: {
    campaign: { findUnique: async () => s.campaign },
    campaignPost: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        const rows = (s.posts as Row[]).filter((p) => match(p, where)).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        return rows[0] ? { ...rows[0] } : null;
      },
      findMany: async ({ where }: { where: Record<string, unknown> }) => (s.posts as Row[]).filter((p) => match(p, where))
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).map((p) => ({ ...p })),
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `post${s.posts.length + 1}`, imageUrl: null, buttonText: null, buttonUrl: null, channelMessageId: null, publishedAt: null, createdAt: tick(), updatedAt: tick(), ...data };
        s.posts.push(row);
        return { ...row };
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = (s.posts as Row[]).find((p) => p.id === where.id) as Row;
        Object.assign(row, data, { updatedAt: tick() });
        return { ...row };
      },
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const rows = (s.posts as Row[]).filter((p) => match(p, where));
        for (const row of rows) Object.assign(row, data, { updatedAt: tick() });
        return { count: rows.length };
      },
      deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
        const before = s.posts.length;
        s.posts = s.posts.filter((p) => !match(p, where));
        return { count: before - s.posts.length };
      },
    },
    campaignParticipant: { findMany: async () => [] },
    campaignReferral: { groupBy: async () => [] },
    user: { findUnique: async () => s.user },
    systemSetting: {
      findMany: async () => [],
      upsert: async ({ where, create }: { where: { key: string }; create: { value: string } }) => { s.settings.set(where.key, create.value); return {}; },
      deleteMany: async ({ where }: { where: { key: string } }) => ({ count: s.settings.delete(where.key) ? 1 : 0 }),
    },
  },
}));
vi.mock('@/lib/api-auth', () => ({ requireAdmin: m.requireAdmin }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: vi.fn() }));
vi.mock('@/lib/cache-tags', async (importOriginal) => ({ ...(await importOriginal<object>()), revalidateCampaigns: m.revalidate }));
vi.mock('@/lib/telegram-channel-check', () => ({ checkChannel: m.check }));
vi.mock('@/lib/bot-settings', async (importOriginal) => ({ ...(await importOriginal<object>()), getBotSettings: m.bot }));

import { GET as listGET } from '../route';
import { DELETE as postDELETE, PATCH } from '../[kind]/route';
import { DELETE as imageDELETE, GET as imageGET, POST as imagePOST } from '../[kind]/image/route';
import { POST as capturePOST } from '../[kind]/capture/route';
import { POST as testPOST } from '../[kind]/test/route';
import { POST as publishPOST } from '../[kind]/publish/route';
import { DELETE as channelDELETE } from '../[kind]/channel/route';
import { parseBotSettings } from '@/lib/bot-settings';
import { captureKey } from '@/lib/campaign/capture';
import { campaignFixture, campaignNow } from '@/lib/campaign/__tests__/fixtures';

const CHANNEL = '@FizikaMSattestatsiya';
const ctx = (kind = 'ANNOUNCE') => ({ params: Promise.resolve({ id: 'cmp1', kind }) });
const url = (path = '') => `http://localhost/api/admin/campaigns/cmp1/posts${path}`;
const json = (method: string, body?: unknown) => new NextRequest(url(), {
  method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
});
const bare = (method = 'GET') => new NextRequest(url(), { method });
const calls = (method: string) => vi.mocked(fetch).mock.calls
  .filter(([u]) => String(u).endsWith(`/${method}`))
  .map(([, init]) => (typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body) as Record<string, unknown>);
const post = (overrides: Record<string, unknown> = {}) => {
  const row = {
    id: 'post1', campaignId: 'cmp1', kind: 'ANNOUNCE', text: '📣 {kanal}', imageUrl: null, buttonText: null, buttonUrl: null,
    channelMessageId: null, publishedAt: null, createdAt: new Date('2026-11-19T00:00:00Z'), updatedAt: new Date('2026-11-19T00:00:00Z'), ...overrides,
  };
  s.posts.push(row);
  return row;
};
const okCheck = { ok: true, title: 'Kanal', memberCount: 10, isAdmin: true, canPost: true, canEdit: true };

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(campaignNow);
  vi.stubEnv('TELEGRAM_BOT_TOKEN', 'SECRET-BOT-TOKEN');
  vi.stubEnv('ADMIN_TELEGRAM_IDS', '456');
  s.campaign = campaignFixture();
  s.posts = [];
  s.user = { telegramId: '456', name: 'Admin' };
  s.settings.clear();
  s.tg = {};
  m.requireAdmin.mockResolvedValue({ error: null, user: { id: 'admin1', name: 'Admin' } });
  m.check.mockResolvedValue(okCheck);
  m.bot.mockResolvedValue(parseBotSettings([]));
  vi.stubGlobal('fetch', vi.fn(async (u: string) => {
    const target = String(u);
    if (target.includes('/file/bot')) return new Response('IMAGE-BYTES', { headers: { 'content-type': 'image/png', 'x-debug-url': target } });
    const method = target.split('/').pop() as string;
    const reply = s.tg[method] ?? (method === 'getFile' ? { ok: true, result: { file_path: 'photos/a.png' } } : { ok: true, result: { message_id: 900 } });
    return new Response(JSON.stringify(reply));
  }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('ruxsat', () => {
  it('ADMIN emas — har bir route 403, Telegram va baza tegilmaydi', async () => {
    m.requireAdmin.mockResolvedValue({ error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) });
    post();
    const responses = await Promise.all([
      listGET(bare(), { params: Promise.resolve({ id: 'cmp1' }) }),
      PATCH(json('PATCH', { text: 'x' }), ctx()),
      postDELETE(bare('DELETE'), ctx('LAST_DAY')),
      imagePOST(bare('POST'), ctx()),
      imageGET(bare(), ctx()),
      imageDELETE(bare('DELETE'), ctx()),
      capturePOST(bare('POST'), ctx()),
      testPOST(json('POST', {}), ctx()),
      publishPOST(json('POST', { mode: 'new', expectedUpdatedAt: null }), ctx()),
      channelDELETE(bare('DELETE'), ctx()),
    ]);
    expect(responses.map((r) => r.status)).toEqual(Array(10).fill(403));
    expect(fetch).not.toHaveBeenCalled();
    expect(s.posts[0].text).toBe('📣 {kanal}');
  });
});

describe('GET va PATCH', () => {
  it('GET — 5 tur (G‘oliblar posti bilan), yozuvsizlari standart', async () => {
    post();
    const body = await (await listGET(bare(), { params: Promise.resolve({ id: 'cmp1' }) })).json();
    expect(body.posts.map((p: { kind: string; isDefault: boolean }) => [p.kind, p.isDefault])).toEqual([
      ['SHARE', true], ['ANNOUNCE', false], ['LEADERBOARD', true], ['LAST_DAY', true], ['WINNERS', true],
    ]);
    expect(body.phase).toBe('ACTIVE');
    expect(body.sampleVars.qatnashish_havolasi).toBe('https://t.me/EduPrimeuzbot?start=aksiya');
  });

  it('PATCH saqlaydi va revalidateCampaigns chaqiriladi', async () => {
    const res = await PATCH(json('PATCH', { text: '<b>Yangi</b> {kanal}', buttonText: 'Bos', buttonUrl: '{qatnashish_havolasi}' }), ctx());
    expect(res.status).toBe(200);
    expect(s.posts[0]).toMatchObject({ kind: 'ANNOUNCE', text: '<b>Yangi</b> {kanal}', buttonText: 'Bos', buttonUrl: '{qatnashish_havolasi}' });
    expect(m.revalidate).toHaveBeenCalled();
  });

  it('PATCH xato — 400, hech narsa yozilmaydi', async () => {
    post();
    const res = await PATCH(json('PATCH', { text: 'Salom {ism}', buttonText: 'Bos' }), ctx());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.issues.map((i: { message: string }) => i.message)).toEqual(expect.arrayContaining(["Noma'lum o'zgaruvchi {ism}"]));
    expect(s.posts[0].text).toBe('📣 {kanal}');
    expect(m.revalidate).not.toHaveBeenCalled();
  });

  it('bo‘sh matn — standart: yozuv o‘chadi; LAST_DAY esa standart matn bilan ham saqlanadi', async () => {
    post();
    await PATCH(json('PATCH', { text: '' }), ctx());
    expect(s.posts).toHaveLength(0);
    await PATCH(json('PATCH', { text: '' }), ctx('LAST_DAY'));
    expect(s.posts).toEqual([expect.objectContaining({ kind: 'LAST_DAY', text: expect.stringContaining('Aksiya tugashiga oz qoldi') })]);
    // "Avtomatik chiqarishni bekor qilish"
    expect((await postDELETE(bare('DELETE'), ctx('LAST_DAY'))).status).toBe(200);
    expect(s.posts).toHaveLength(0);
  });
});

describe('publish', () => {
  const publish = (body: Record<string, unknown>, kind = 'ANNOUNCE') => publishPOST(json('POST', body), ctx(kind));

  it('DRAFT — 400 "Avval aksiyani e’lon qiling"; SHARE — 400', async () => {
    s.campaign = campaignFixture({ isPublished: false });
    const res = await publish({ mode: 'new', expectedUpdatedAt: null });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Avval aksiyani e'lon qiling");
    s.campaign = campaignFixture();
    expect((await publish({ mode: 'new', expectedUpdatedAt: null }, 'SHARE')).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('canPost yo‘q — 400; pin bilan canEdit yo‘q — 400', async () => {
    m.check.mockResolvedValue({ ...okCheck, canPost: false });
    expect((await publish({ mode: 'new', expectedUpdatedAt: null })).status).toBe(400);
    m.check.mockResolvedValue({ ...okCheck, canEdit: false });
    expect((await publish({ mode: 'new', pin: true, expectedUpdatedAt: null })).status).toBe(400);
    expect(calls('sendMessage')).toHaveLength(0);
    expect(s.posts).toHaveLength(0);
  });

  it('eski expectedUpdatedAt — 409, hech narsa yuborilmaydi', async () => {
    post({ updatedAt: new Date('2026-11-19T12:00:00Z') });
    const res = await publish({ mode: 'new', expectedUpdatedAt: '2026-11-19T00:00:00.000Z' });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Post boshqa oynada o'zgargan, sahifani yangilang");
    expect(calls('sendMessage')).toHaveLength(0);
  });

  it('yangi post: kanalga sendMessage (preview o‘chiq), channelMessageId, pin (ovozsiz), revalidate', async () => {
    const row = post();
    const res = await publish({ mode: 'new', pin: true, expectedUpdatedAt: row.updatedAt.toISOString() });
    expect(res.status).toBe(200);
    expect(calls('sendMessage')[0]).toMatchObject({
      chat_id: CHANNEL, text: '📣 @FizikaMSattestatsiya', parse_mode: 'HTML', link_preview_options: { is_disabled: true },
      reply_markup: { inline_keyboard: [[{ text: '🎁 Aksiyada qatnashish', url: 'https://t.me/EduPrimeuzbot?start=aksiya' }]] },
    });
    expect(calls('pinChatMessage')[0]).toEqual({ chat_id: CHANNEL, message_id: 900, disable_notification: true });
    expect(s.posts[0]).toMatchObject({ channelMessageId: 900, publishedAt: campaignNow });
    expect(m.revalidate).toHaveBeenCalled();
  });

  it('standart (yozuvsiz) post: expectedUpdatedAt null — yozuv yaratilib chiqariladi', async () => {
    const res = await publish({ mode: 'new', expectedUpdatedAt: null }, 'LEADERBOARD');
    expect(res.status).toBe(200);
    expect(s.posts[0]).toMatchObject({ kind: 'LEADERBOARD', channelMessageId: 900 });
  });

  it('rasmli post — sendPhoto caption bilan', async () => {
    const row = post({ imageUrl: 'AgACfile' });
    await publish({ mode: 'new', expectedUpdatedAt: row.updatedAt.toISOString() });
    expect(calls('sendPhoto')[0]).toMatchObject({ chat_id: CHANNEL, photo: 'AgACfile', caption: '📣 @FizikaMSattestatsiya', parse_mode: 'HTML' });
  });

  it('Telegram xatosi — publishedAt eski qiymatiga qaytadi va 502', async () => {
    const previous = new Date('2026-11-18T15:00:00Z');
    const row = post({ publishedAt: previous });
    s.tg.sendMessage = { ok: false, error_code: 400, description: "Bad Request: can't parse entities" };
    const res = await publish({ mode: 'new', expectedUpdatedAt: row.updatedAt.toISOString() });
    expect(res.status).toBe(502);
    expect((await res.json()).error).toContain('HTML xato');
    expect(s.posts[0]).toMatchObject({ publishedAt: previous, channelMessageId: null });
  });

  it('pin xatosi chiqarishni bekor qilmaydi — ogohlantirish', async () => {
    const row = post();
    s.tg.pinChatMessage = { ok: false, error_code: 400, description: 'Bad Request: not enough rights to pin a message' };
    const res = await publish({ mode: 'new', pin: true, expectedUpdatedAt: row.updatedAt.toISOString() });
    expect(res.status).toBe(200);
    expect((await res.json()).warning).toContain('pin qilinmadi');
    expect(s.posts[0].channelMessageId).toBe(900);
  });

  it('update: "not modified" — 200; matnli post editMessageText bilan', async () => {
    const row = post({ channelMessageId: 55, publishedAt: new Date('2026-11-18T15:00:00Z') });
    s.tg.editMessageText = { ok: false, error_code: 400, description: 'Bad Request: message is not modified' };
    const res = await publish({ mode: 'update', expectedUpdatedAt: row.updatedAt.toISOString() });
    expect(res.status).toBe(200);
    expect(calls('editMessageText')[0]).toMatchObject({ chat_id: CHANNEL, message_id: 55, link_preview_options: { is_disabled: true } });
  });

  it('update: rasmli post — editMessageMedia (rasm, caption, tugma bitta chaqiruvda)', async () => {
    const row = post({ imageUrl: 'AgACnew', channelMessageId: 55, publishedAt: new Date('2026-11-18T15:00:00Z') });
    expect((await publish({ mode: 'update', expectedUpdatedAt: row.updatedAt.toISOString() })).status).toBe(200);
    expect(calls('editMessageMedia')[0]).toMatchObject({
      chat_id: CHANNEL, message_id: 55, media: { type: 'photo', media: 'AgACnew', caption: '📣 @FizikaMSattestatsiya', parse_mode: 'HTML' },
    });
  });

  it('update: rasmli↔rasmsiz — 400', async () => {
    const row = post({ channelMessageId: 55, publishedAt: new Date('2026-11-18T15:00:00Z') });
    s.tg.editMessageText = { ok: false, error_code: 400, description: 'Bad Request: there is no text in the message to edit' };
    const res = await publish({ mode: 'update', expectedUpdatedAt: row.updatedAt.toISOString() });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Kanaldagi postning turi o'zgaradi: avval kanaldan o'chiring, keyin qayta chiqaring");
  });

  it('update: kanalda topilmadi — channelMessageId null va 409', async () => {
    const row = post({ channelMessageId: 55, publishedAt: new Date('2026-11-18T15:00:00Z') });
    s.tg.editMessageText = { ok: false, error_code: 400, description: 'Bad Request: message to edit not found' };
    const res = await publish({ mode: 'update', expectedUpdatedAt: row.updatedAt.toISOString() });
    expect(res.status).toBe(409);
    expect(s.posts[0].channelMessageId).toBeNull();
  });
});

describe('rasm', () => {
  it('kanaldagi post: rasmli → rasmsiz va matnli → rasmli — 400', async () => {
    post({ imageUrl: 'AgACfile', channelMessageId: 55 });
    const removed = await imageDELETE(bare('DELETE'), ctx());
    expect(removed.status).toBe(400);
    expect((await removed.json()).error).toContain("avval kanaldan o'chiring");
    s.posts = [];
    post({ channelMessageId: 55 });
    const form = new FormData();
    form.append('file', new Blob(['x'], { type: 'image/png' }), 'a.png');
    const added = await imagePOST(new NextRequest(url(), { method: 'POST', body: form }), ctx());
    expect(added.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('yuklash: adminning chatiga sendPhoto, eng katta file_id saqlanadi', async () => {
    s.tg.sendPhoto = { ok: true, result: { photo: [{ file_id: 'small', width: 90, height: 90 }, { file_id: 'big', width: 1280, height: 960 }] } };
    const form = new FormData();
    form.append('file', new Blob(['png'], { type: 'image/png' }), 'a.png');
    const res = await imagePOST(new NextRequest(url(), { method: 'POST', body: form }), ctx());
    expect(res.status).toBe(200);
    const sent = calls('sendPhoto')[0] as unknown as FormData;
    expect(sent.get('chat_id')).toBe('456');
    expect(sent.get('caption')).toBe("🧪 Rasm yuklandi · E'lon posti");
    expect(s.posts[0]).toMatchObject({ kind: 'ANNOUNCE', imageUrl: 'big' });
  });

  it('yuklash: noto‘g‘ri tur — 400; Telegram profili yo‘q — 400', async () => {
    const gif = new FormData();
    gif.append('file', new Blob(['g'], { type: 'image/gif' }), 'a.gif');
    expect((await imagePOST(new NextRequest(url(), { method: 'POST', body: gif }), ctx())).status).toBe(400);
    s.user = { telegramId: null, name: 'Admin' };
    const png = new FormData();
    png.append('file', new Blob(['p'], { type: 'image/png' }), 'a.png');
    const res = await imagePOST(new NextRequest(url(), { method: 'POST', body: png }), ctx());
    expect((await res.json()).error).toBe("Profilingiz Telegram bilan bog'lanmagan");
  });

  it('proxy: rasm oqim bilan qaytadi, javobda token yo‘q', async () => {
    post({ imageUrl: 'AgACfile' });
    const res = await imageGET(bare(), ctx());
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('cache-control')).toBe('private, max-age=3600');
    const headers = JSON.stringify([...res.headers.entries()]);
    expect(headers).not.toContain('SECRET-BOT-TOKEN');
    expect(await res.text()).toBe('IMAGE-BYTES');
  });
});

describe('test, capture, kanaldan o‘chirish', () => {
  it('O‘zimga sinov: avval alohida sarlavha, keyin post (caption’ga qo‘shilmaydi); SHARE — c_TESTTEST', async () => {
    post({ kind: 'SHARE', text: 'Obuna: {havola}', imageUrl: 'AgACfile' });
    const res = await testPOST(json('POST', {}), ctx('SHARE'));
    expect(res.status).toBe(200);
    expect(calls('sendMessage')[0]).toEqual({ chat_id: '456', text: '🧪 SINOV · Ulashiladigan post' });
    expect(calls('sendPhoto')[0]).toMatchObject({ chat_id: '456', photo: 'AgACfile', caption: 'Obuna: https://t.me/EduPrimeuzbot?start=c_TESTTEST' });
  });

  it('capture: kalit 10 daqiqaga yoziladi va bot ko‘rsatma yuboradi; admin ro‘yxatida bo‘lmasa 400', async () => {
    expect((await capturePOST(bare('POST'), ctx('LEADERBOARD'))).status).toBe(200);
    const value = JSON.parse(s.settings.get(captureKey('456')) as string);
    expect(value).toEqual({ campaignId: 'cmp1', kind: 'LEADERBOARD', expiresAt: new Date(campaignNow.getTime() + 600_000).toISOString() });
    expect(calls('sendMessage')[0].text).toContain('«Reyting posti» uchun xabarni shu yerga yozing');
    vi.stubEnv('ADMIN_TELEGRAM_IDS', '999');
    expect((await capturePOST(bare('POST'), ctx('LEADERBOARD'))).status).toBe(400);
  });

  it('kanaldan o‘chirish: "not found" ham muvaffaqiyat, channelMessageId va publishedAt null', async () => {
    post({ channelMessageId: 55, publishedAt: new Date('2026-11-18T15:00:00Z') });
    s.tg.deleteMessage = { ok: false, error_code: 400, description: 'Bad Request: message to delete not found' };
    const res = await channelDELETE(bare('DELETE'), ctx());
    expect(res.status).toBe(200);
    expect(s.posts[0]).toMatchObject({ channelMessageId: null, publishedAt: null });
    expect(m.revalidate).toHaveBeenCalled();
  });
});

describe('yakunlangan aksiya — G‘oliblar posti (A5)', () => {
  const finished = new Date('2026-11-27T10:00:00Z');
  const publish = (kind: string, expectedUpdatedAt: string | null = null) => publishPOST(json('POST', { mode: 'new', expectedUpdatedAt }), ctx(kind));

  it('WINNERS tahrirlanadi va kanalga chiqadi; boshqa turlar 409', async () => {
    vi.setSystemTime(finished);
    s.campaign = campaignFixture({ finalizedAt: finished });
    const saved = await PATCH(json('PATCH', { text: '🏆 {goliblar}\n{kurs_admin}' }), ctx('WINNERS'));
    expect(saved.status).toBe(200);
    const { post: winners } = await saved.json();
    expect((await PATCH(json('PATCH', { text: 'x' }), ctx('ANNOUNCE'))).status).toBe(409);
    expect((await capturePOST(bare('POST'), ctx('WINNERS'))).status).toBe(200);
    expect((await capturePOST(bare('POST'), ctx('LAST_DAY'))).status).toBe(409);
    expect((await imageDELETE(bare('DELETE'), ctx('ANNOUNCE'))).status).toBe(409);
    expect((await publish('LEADERBOARD')).status).toBe(409);
    const res = await publish('WINNERS', winners.updatedAt);
    expect(res.status).toBe(200);
    expect(calls('sendMessage').some((c) => c.chat_id === CHANNEL)).toBe(true);
  });

  it('yakunlanmagan (FINISHING) aksiyada WINNERS publish → 400', async () => {
    vi.setSystemTime(finished);
    expect((await publish('WINNERS')).status).toBe(400);
    expect(calls('sendMessage')).toHaveLength(0);
  });

  it('yakunlangan qoralama: kanalga chiqmaydi (400), «O‘zimga sinov» ishlaydi', async () => {
    vi.setSystemTime(finished);
    s.campaign = campaignFixture({ isPublished: false, finalizedAt: finished });
    const res = await publish('WINNERS');
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("e'lon qilingan va yakunlangan");
    expect((await testPOST(json('POST', {}), ctx('WINNERS'))).status).toBe(200);
    expect(calls('sendMessage').every((c) => c.chat_id === '456')).toBe(true);
  });
});
