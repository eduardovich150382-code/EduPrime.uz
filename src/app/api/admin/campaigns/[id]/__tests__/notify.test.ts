import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import type { Campaign } from '@prisma/client';
import type { TelegramResult } from '@/lib/campaign/telegram';

// /finalize/notify — haqiqiy route + lib/campaign/notify, baza xotirada:
// kursorning shartli (CAS) yangilanishi shu yerda baholanadi.
const m = vi.hoisted(() => ({ requireAdmin: vi.fn(), revalidate: vi.fn(), bot: vi.fn(), tg: vi.fn() }));
vi.mock('@/lib/db', async () => ({ db: (await import('./fake-db')).fake.client }));
vi.mock('@/lib/api-auth', () => ({ requireAdmin: m.requireAdmin }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: vi.fn() }));
vi.mock('@/lib/cache-tags', async (importOriginal) => ({ ...(await importOriginal<object>()), revalidateCampaigns: m.revalidate }));
vi.mock('@/lib/bot-settings', async (importOriginal) => ({ ...(await importOriginal<object>()), getBotSettings: m.bot }));
vi.mock('@/lib/campaign/telegram', () => ({ telegramApi: m.tg }));

import { GET, POST } from '../finalize/notify/route';
import { parseBotSettings } from '@/lib/bot-settings';
import { notifyKey } from '@/lib/campaign/internal-keys';
import { runFinalizeNotify } from '@/lib/campaign/notify';
import { fake, type Row } from './fake-db';
import { ENDED, ctx, participant, referrals, seedCampaign } from './seed';

const post = () => POST(new NextRequest('http://localhost/api', { method: 'POST' }), ctx());
const sent: { chat_id: string; text: string }[] = [];
const blocked = new Set<string>();
const bot = parseBotSettings([
  { key: 'course_name', value: 'Fizika' }, { key: 'course_price', value: '500000' }, { key: 'course_price_public', value: 'true' },
  { key: 'course_manager_username', value: '@kurs_admin' },
]);
let p1: Row, p2: Row, p3: Row;

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  m.requireAdmin.mockResolvedValue({ error: null, user: { id: 'admin1', name: 'Admin' } });
  m.bot.mockResolvedValue(bot);
  vi.stubEnv('TELEGRAM_BOT_TOKEN', 'test-token');
  sent.length = 0;
  blocked.clear();
  m.tg.mockImplementation(async (_t: string, _method: string, body: { chat_id: string; text: string }): Promise<TelegramResult> => {
    if (blocked.has(body.chat_id)) return { ok: false, error_code: 403, description: 'Forbidden: bot was blocked by the user' };
    sent.push(body);
    return { ok: true };
  });
  seedCampaign({ finalizedAt: ENDED });
  p1 = participant('p1', 'Dilnoza');
  p2 = participant('p2', 'Jasur');
  p3 = participant('p3', 'Malika');
  referrals('p1', 'ACTIVE', 12);
  referrals('p2', 'ACTIVE', 3);
  referrals('p3', 'ACTIVE', 4);
  fake.insert('promoCode', {
    id: 'pc1', code: 'ABCD2345', campaignId: 'cmp1', telegramId: p1.telegramId, percent: 50,
    validUntil: new Date('2026-12-02T18:59:59Z'), usedAt: null, usedNote: null, createdAt: ENDED,
  });
  fake.insert('systemSetting', { id: 'cur', key: notifyKey('cmp1'), value: '{"lastParticipantId":null,"sent":0,"failed":0,"done":false}' });
});
afterEach(() => { vi.unstubAllEnvs(); });

const cursor = () => JSON.parse(fake.tables().systemSetting.find((s) => s.key === notifyKey('cmp1'))?.value as string);

describe('POST /finalize/notify', () => {
  it('winner: promokod, muddat, chegirmali narx; no_prize: ball', async () => {
    const res = await post();
    expect(await res.json()).toEqual({ sent: 3, failed: 0, remaining: 0 });
    const winner = sent.find((s) => s.chat_id === String(p1.telegramId))?.text ?? '';
    expect(winner).toContain('Tabriklaymiz, Dilnoza');
    expect(winner).toContain('<code>ABCD2345</code>');
    expect(winner).toContain('2-dekabr, 23:59 gacha');
    expect(winner).toContain("250 000 so'm");
    expect(winner).toContain('<b>50%</b>');
    const noPrize = sent.find((s) => s.chat_id === String(p2.telegramId))?.text ?? '';
    expect(noPrize).toContain('rahmat, Jasur');
    expect(noPrize).toContain('<b>3</b> ball');
    expect(cursor()).toMatchObject({ sent: 3, failed: 0, done: true });
    expect(m.revalidate).toHaveBeenCalled();
  });

  it('403 (bot bloklangan) keyingilarini to‘xtatmaydi', async () => {
    blocked.add(String(p2.telegramId));
    expect(await (await post()).json()).toEqual({ sent: 2, failed: 1, remaining: 0 });
    expect(sent.map((s) => s.chat_id)).toContain(String(p3.telegramId));
  });

  it('done bo‘lgach qayta chaqiruv hech kimga yubormaydi', async () => {
    await post();
    sent.length = 0;
    expect(await (await post()).json()).toEqual({ sent: 3, failed: 0, remaining: 0 });
    expect(sent).toHaveLength(0);
  });

  it('parallel chaqiruv (kursor shu orada o‘zgargan) → 409, hech narsa yuborilmaydi', async () => {
    const original = fake.client.systemSetting.findUnique;
    vi.spyOn(fake.client.systemSetting, 'findUnique').mockImplementationOnce(async (args) => {
      const row = await original(args);
      // Boshqa oyna shu paytda kursorni surdi.
      const stored = fake.tables().systemSetting.find((s) => s.key === notifyKey('cmp1')) as Row;
      stored.value = JSON.stringify({ lastParticipantId: 'p1', sent: 1, failed: 0, done: false });
      return row;
    });
    const res = await post();
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('Xabarlar boshqa oynada yuborilmoqda');
    expect(sent).toHaveLength(0);
  });

  it('aksiya yakunlanmagan → 400; ADMIN emas → 403', async () => {
    seedCampaign();
    expect((await post()).status).toBe(400);
    m.requireAdmin.mockResolvedValue({ error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) });
    expect((await post()).status).toBe(403);
    expect((await GET(new NextRequest('http://localhost/api'), ctx())).status).toBe(403);
  });
});

describe('kursor bo‘yicha davom etish', () => {
  it('byudjet tugasa qolgan joydan davom etadi, yuborilganlar takrorlanmaydi', async () => {
    const campaign = fake.tables().campaign[0] as unknown as Campaign;
    let clock = 0;
    const deps = {
      bot,
      send: async (chatId: string, text: string) => m.tg('t', 'sendMessage', { chat_id: chatId, text }) as Promise<TelegramResult>,
      sleep: async () => undefined,
      now: () => new Date(clock),
    };
    clock = 0;
    // Birinchi chaqiruv: bitta yuborilgach soat byudjetdan o'tadi.
    const first = await runFinalizeNotify(campaign, { ...deps, now: () => { const d = new Date(clock); clock += 30_000; return d; } });
    expect(first).toMatchObject({ ok: true, remaining: 2 });
    expect(sent).toHaveLength(1);
    const status = await (await GET(new NextRequest('http://localhost/api'), ctx())).json();
    expect(status).toMatchObject({ started: true, done: false, remaining: 2 });

    const second = await runFinalizeNotify(campaign, deps);
    expect(second).toEqual({ ok: true, sent: 3, failed: 0, remaining: 0 });
    expect(sent.map((s) => s.chat_id).sort()).toEqual([p1, p2, p3].map((p) => String(p.telegramId)).sort());
  });
});
