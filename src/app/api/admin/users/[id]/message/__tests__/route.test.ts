import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Token modul yuklanishida o'qiladi — importdan oldin o'rnatiladi. fetch
// soxtalashtiriladi, shuning uchun sendUserTelegramNotification → sendTelegramMessage
// zanjiri (escape bilan birga) haqiqiy holda ishlaydi.
const m = vi.hoisted(() => {
  process.env.TELEGRAM_BOT_TOKEN = 'test-token';
  return { auth: vi.fn(), user: vi.fn(), create: vi.fn(), fetch: vi.fn() };
});
vi.mock('@/lib/api-auth', () => ({ requireAdmin: m.auth }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));
vi.mock('@/lib/db', () => ({ db: { user: { findUnique: m.user }, notification: { create: m.create } } }));
import { POST } from '../route';

const send = (body: unknown) => POST(
  new NextRequest('http://localhost/api/admin/users/u1/message', { method: 'POST', body: JSON.stringify(body) }),
  { params: Promise.resolve({ id: 'u1' }) },
);
const valid = { title: 'Chekni yuboring', message: "To'lovingiz kutilmoqda." };
const telegramBody = () => JSON.parse(m.fetch.mock.calls[0][1].body as string) as { chat_id: string; text: string };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('fetch', m.fetch);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  m.auth.mockResolvedValue({ error: null });
  m.user.mockResolvedValue({ id: 'u1', telegramId: '777' });
  m.create.mockResolvedValue({});
  m.fetch.mockResolvedValue({ ok: true, text: async () => '' });
});
afterEach(() => vi.unstubAllGlobals());

describe('POST /api/admin/users/[id]/message', () => {
  it('admin bo‘lmasa hech narsa yuborilmaydi', async () => {
    m.auth.mockResolvedValue({ error: NextResponse.json({}, { status: 403 }) });
    expect((await send(valid)).status).toBe(403);
    expect(m.user).not.toHaveBeenCalled(); expect(m.create).not.toHaveBeenCalled(); expect(m.fetch).not.toHaveBeenCalled();
  });

  it('foydalanuvchi topilmasa 404', async () => {
    m.user.mockResolvedValue(null);
    expect((await send(valid)).status).toBe(404);
    expect(m.create).not.toHaveBeenCalled();
  });

  it.each([
    { ...valid, title: '' },
    { ...valid, title: '   ' },
    { ...valid, message: '' },
    { ...valid, title: 'a'.repeat(121) },
    { ...valid, message: 'a'.repeat(2001) },
    { ...valid, channels: { site: false, telegram: false } },
  ])('noto‘g‘ri body → 400 (%#)', async (body) => {
    expect((await send(body)).status).toBe(400);
    expect(m.create).not.toHaveBeenCalled();
  });

  it.each(['javascript:alert(1)', '//evil.com', 'http://example.com', 'https://x.uz/"><b>', 'pricing', '/a b'])('noto‘g‘ri havola %s → 400', async (link) => {
    expect((await send({ ...valid, link })).status).toBe(400);
    expect(m.create).not.toHaveBeenCalled(); expect(m.fetch).not.toHaveBeenCalled();
  });

  it('ichki yo‘l va https havola qabul qilinadi', async () => {
    expect((await send({ ...valid, link: '/pricing' })).status).toBe(200);
    expect((await send({ ...valid, link: 'https://t.me/EduPrimeuzbot' })).status).toBe(200);
    expect(m.create).toHaveBeenLastCalledWith({ data: expect.objectContaining({ link: 'https://t.me/EduPrimeuzbot' }) });
  });

  it('muvaffaqiyat: notification yaratiladi va Telegram await qilinib "sent"', async () => {
    const response = await send({ ...valid, title: '  Chekni yuboring  ' });
    expect(await response.json()).toEqual({ success: true, site: true, telegram: 'sent' });
    expect(m.create).toHaveBeenCalledWith({ data: { userId: 'u1', title: 'Chekni yuboring', message: valid.message, type: 'admin_message', link: null } });
    expect(telegramBody().chat_id).toBe('777');
  });

  it('telegramId yo‘q → not_linked, sayt bildirishnomasi baribir yaratiladi', async () => {
    m.user.mockResolvedValue({ id: 'u1', telegramId: null });
    expect(await (await send(valid)).json()).toEqual({ success: true, site: true, telegram: 'not_linked' });
    expect(m.create).toHaveBeenCalledOnce(); expect(m.fetch).not.toHaveBeenCalled();
  });

  it('Telegram rad etsa → failed', async () => {
    m.fetch.mockResolvedValue({ ok: false, text: async () => 'Bad Request' });
    expect(await (await send(valid)).json()).toEqual({ success: true, site: true, telegram: 'failed' });
  });

  it('channels.site=false → notification yaratilmaydi', async () => {
    expect(await (await send({ ...valid, channels: { site: false } })).json()).toEqual({ success: true, site: false, telegram: 'sent' });
    expect(m.create).not.toHaveBeenCalled();
  });

  it('channels.telegram=false → skipped', async () => {
    expect(await (await send({ ...valid, channels: { telegram: false } })).json()).toEqual({ success: true, site: true, telegram: 'skipped' });
    expect(m.fetch).not.toHaveBeenCalled();
  });

  it('<b> va & Telegramga escape qilingan holda ketadi', async () => {
    await send({ title: 'A & <b>B</b>', message: 'x < y & z', link: '/pricing' });
    const { text } = telegramBody();
    expect(text).toContain('<b>A &amp; &lt;b&gt;B&lt;/b&gt;</b>');
    expect(text).toContain('x &lt; y &amp; z');
    expect(text).toMatch(/<a href="[^"]*\/pricing">/);
  });
});
