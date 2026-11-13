import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import type { TelegramResult } from '@/lib/campaign/telegram';

// Promokodlar API: ro'yxat, "ishlatildi" (atomar), bekor qilish, qayta yuborish.
const m = vi.hoisted(() => ({ requireAdmin: vi.fn(), revalidate: vi.fn(), bot: vi.fn(), tg: vi.fn() }));
vi.mock('@/lib/db', async () => ({ db: (await import('./fake-db')).fake.client }));
vi.mock('@/lib/api-auth', () => ({ requireAdmin: m.requireAdmin }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: vi.fn() }));
vi.mock('@/lib/cache-tags', async (importOriginal) => ({ ...(await importOriginal<object>()), revalidateCampaigns: m.revalidate }));
vi.mock('@/lib/bot-settings', async (importOriginal) => ({ ...(await importOriginal<object>()), getBotSettings: m.bot }));
vi.mock('@/lib/campaign/telegram', () => ({ telegramApi: m.tg }));

import { GET } from '../promo-codes/route';
import { PATCH } from '../promo-codes/[codeId]/route';
import { POST as resend } from '../promo-codes/[codeId]/resend/route';
import { DELETE as deleteCampaign } from '../route';
import { parseBotSettings } from '@/lib/bot-settings';
import { fake, type Row } from './fake-db';
import { ENDED, ctx, json, participant, seedCampaign } from './seed';

const list = async (q = '') => (await (await GET(new NextRequest(`http://localhost/api?q=${encodeURIComponent(q)}`), ctx())).json()).codes as { code: string; status: string }[];
const mark = (body: unknown, codeId = 'pc1') => PATCH(json('PATCH', body) as NextRequest, ctx({ codeId }));
const promo = (id = 'pc1') => fake.tables().promoCode.find((p) => p.id === id) as Row;
let owner: Row;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  m.requireAdmin.mockResolvedValue({ error: null, user: { id: 'admin1', name: 'Admin' } });
  m.bot.mockResolvedValue(parseBotSettings([]));
  vi.stubEnv('TELEGRAM_BOT_TOKEN', 'test-token');
  m.tg.mockResolvedValue({ ok: true } satisfies TelegramResult);
  seedCampaign({ finalizedAt: ENDED });
  owner = participant('p1', 'Dilnoza', { username: 'dilnoza_t' });
  const other = participant('p2', 'Jasur');
  fake.insert('promoCode', { id: 'pc1', code: 'ABCD2345', campaignId: 'cmp1', telegramId: owner.telegramId, percent: 100, validUntil: new Date('2099-01-01T00:00:00Z'), usedAt: null, usedNote: null, createdAt: ENDED });
  fake.insert('promoCode', { id: 'pc2', code: 'WXYZ6789', campaignId: 'cmp1', telegramId: other.telegramId, percent: 20, validUntil: new Date('2020-01-01T00:00:00Z'), usedAt: null, usedNote: null, createdAt: ENDED });
});

describe('GET /promo-codes', () => {
  it('egasi, holat (faol / muddati o‘tgan) va qidiruv: kod, username, ism', async () => {
    expect((await list()).map((c) => [c.code, c.status])).toEqual([['ABCD2345', 'active'], ['WXYZ6789', 'expired']]);
    expect((await list('abcd-2345')).map((c) => c.code)).toEqual(['ABCD2345']);
    expect((await list('@dilnoza')).map((c) => c.code)).toEqual(['ABCD2345']);
    expect((await list('jasur')).map((c) => c.code)).toEqual(['WXYZ6789']);
  });
});

describe('PATCH /promo-codes/[codeId]', () => {
  it('ishlatildi → usedAt va izoh; qayta → 409; bekor qilish', async () => {
    expect((await mark({ used: true, note: 'Telegram orqali' })).status).toBe(200);
    expect(promo()).toMatchObject({ usedNote: 'Telegram orqali' });
    expect(promo().usedAt).toBeInstanceOf(Date);
    expect(m.revalidate).toHaveBeenCalled();
    const again = await mark({ used: true });
    expect(again.status).toBe(409);
    expect((await again.json()).error).toBe('Allaqachon ishlatilgan');
    expect((await mark({ used: false })).status).toBe(200);
    expect(promo()).toMatchObject({ usedAt: null, usedNote: null });
    expect((await list()).find((c) => c.code === 'ABCD2345')?.status).toBe('active');
  });

  it('muddati o‘tgan kodni ham belgilash mumkin; izoh > 200 → 400; boshqa aksiya kodi → 404', async () => {
    expect((await mark({ used: true }, 'pc2')).status).toBe(200);
    expect((await mark({ used: true, note: 'x'.repeat(201) })).status).toBe(400);
    fake.insert('promoCode', { id: 'pc3', code: 'QQQQ2222', campaignId: 'other', telegramId: BigInt(1), percent: 20, validUntil: ENDED, usedAt: null, usedNote: null, createdAt: ENDED });
    expect((await mark({ used: true }, 'pc3')).status).toBe(404);
  });

  it('ADMIN emas → 403', async () => {
    m.requireAdmin.mockResolvedValue({ error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) });
    expect((await mark({ used: true })).status).toBe(403);
    expect((await GET(new NextRequest('http://localhost/api'), ctx())).status).toBe(403);
    expect((await resend(new NextRequest('http://localhost/api', { method: 'POST' }), ctx({ codeId: 'pc1' }))).status).toBe(403);
  });
});

describe('POST /promo-codes/[codeId]/resend', () => {
  it('winner xabari egasiga, promokod bilan', async () => {
    const res = await resend(new NextRequest('http://localhost/api', { method: 'POST' }), ctx({ codeId: 'pc1' }));
    expect(res.status).toBe(200);
    const [, method, body] = m.tg.mock.calls[0] as [string, string, { chat_id: string; text: string; parse_mode: string }];
    expect(method).toBe('sendMessage');
    expect(body.chat_id).toBe(String(owner.telegramId));
    expect(body.text).toContain('<code>ABCD2345</code>');
    expect(body.text).toContain('Dilnoza');
    expect(body.parse_mode).toBe('HTML');
  });
  it('bot bloklangan — 400 va tushunarli xato', async () => {
    m.tg.mockResolvedValue({ ok: false, error_code: 403, description: 'Forbidden: bot was blocked by the user' });
    const res = await resend(new NextRequest('http://localhost/api', { method: 'POST' }), ctx({ codeId: 'pc1' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('botni bloklagan');
  });
});

describe('yakunlangan qoralamani o‘chirish', () => {
  it('ruxsat etiladi (promokodlar bazada SetNull bilan qoladi)', async () => {
    seedCampaign({ isPublished: false, finalizedAt: ENDED });
    expect((await deleteCampaign(new NextRequest('http://localhost/api', { method: 'DELETE' }), ctx())).status).toBe(200);
    expect(fake.tables().campaign).toHaveLength(0);
  });
});
