import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const m = vi.hoisted(() => ({
  requireAdmin: vi.fn(), bot: vi.fn(),
  campaign: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
}));
vi.mock('@/lib/api-auth', () => ({ requireAdmin: m.requireAdmin }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/db', () => ({ db: { campaign: m.campaign, user: m.user } }));
vi.mock('@/lib/bot-settings', async (importOriginal) => ({ ...(await importOriginal<object>()), getBotSettings: m.bot }));
import { POST } from '../route';
import { parseBotSettings } from '@/lib/bot-settings';
import { campaignFixture } from '@/lib/campaign/__tests__/fixtures';

const ctx = { params: Promise.resolve({ id: 'cmp1' }) };
const post = (body: unknown) => POST(new NextRequest('http://localhost/api/admin/campaigns/cmp1/test-message', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}), ctx);
const sent = () => JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body)) as Record<string, unknown>;
let reply: unknown = { ok: true };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('TELEGRAM_BOT_TOKEN', 'test-token');
  m.requireAdmin.mockResolvedValue({ error: null, user: { id: 'admin1', name: 'Admin' } });
  m.bot.mockResolvedValue(parseBotSettings([{ key: 'course_price', value: '350000' }])); // narx yashirin
  m.campaign.findUnique.mockResolvedValue(campaignFixture({ texts: { rules: 'Saqlangan qoidalar' } }));
  m.user.findUnique.mockResolvedValue({ telegramId: '555', name: 'Dilnoza' });
  reply = { ok: true };
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => reply })));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('POST test-message', () => {
  it('ADMIN emas — 403, Telegram so‘ralmaydi', async () => {
    m.requireAdmin.mockResolvedValue({ error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) });
    expect((await post({ key: 'rules' })).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('adminda telegramId yo‘q — 400', async () => {
    m.user.findUnique.mockResolvedValue({ telegramId: null, name: 'Admin' });
    const res = await post({ key: 'rules' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Profilingiz Telegram bilan bog'lanmagan");
    expect(fetch).not.toHaveBeenCalled();
  });

  it('saqlanmagan text yuboriladi — sarlavha, namunaviy qiymatlar, adminning o‘z chatiga', async () => {
    const res = await post({ key: 'my_result', text: '<b>{ism}</b>: {ball} ball, {orin}-o‘rin\n💰 {chegirmali_narx}\n{havola}' });
    expect(res.status).toBe(200);
    const body = sent();
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('/sendMessage');
    expect(body).toMatchObject({ chat_id: '555', parse_mode: 'HTML' });
    // Narx yashirin — `{chegirmali_narx}` qatori xuddi botdagidek o'chadi.
    expect(body.text).toBe('🧪 SINOV · my_result\n\n<b>Dilnoza</b>: 7 ball, 4-o‘rin\nhttps://t.me/EduPrimeuzbot?start=c_TESTTEST');
  });

  it('text berilmasa — saqlangan matn', async () => {
    await post({ key: 'rules' });
    expect(sent().text).toBe('🧪 SINOV · rules\n\nSaqlangan qoidalar');
  });

  it('alert — HTML’siz', async () => {
    await post({ key: 'not_subscribed_alert', text: '<b>Obuna</b> bo‘ling' });
    expect(sent()).not.toHaveProperty('parse_mode');
    expect(sent().text).toBe('🧪 SINOV · not_subscribed_alert\n\nObuna bo‘ling');
  });

  it('Telegram HTML xatosi — 400 va o‘zbekcha izoh', async () => {
    reply = { ok: false, error_code: 400, description: "Bad Request: can't parse entities: Unclosed start tag at byte offset 5" };
    const res = await post({ key: 'rules', text: '<b>x' });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('HTML xato');
    expect(body.telegram).toContain("can't parse entities");
  });

  it('bot bloklangan — /start bosish so‘raladi', async () => {
    reply = { ok: false, error_code: 403, description: 'Forbidden: bot was blocked by the user' };
    expect((await (await post({ key: 'rules' })).json()).error).toContain('/start');
  });
});
