import { createHmac } from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ systemSetting: { upsert: vi.fn() } }));
vi.mock('@/lib/db', () => ({ db }));

import { NextRequest } from 'next/server';
import { POST } from '../route';

const TOKEN = '123456:TEST-bot-token';

function signed(token = TOKEN): string {
  const fields = { auth_date: String(Math.floor(Date.now() / 1000) - 5), user: JSON.stringify({ id: 777, first_name: 'Ali', username: 'ali' }) };
  const dcs = Object.keys(fields).sort().map((k) => `${k}=${fields[k as keyof typeof fields]}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  return new URLSearchParams({ ...fields, hash: createHmac('sha256', secret).update(dcs).digest('hex') }).toString();
}

function request(body: unknown) {
  return new NextRequest('https://eduprime.uz/api/auth/telegram-webapp/handoff', { method: 'POST', body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TELEGRAM_BOT_TOKEN = TOKEN;
  process.env.NEXT_PUBLIC_APP_URL = 'https://eduprime.uz';
});

describe('POST /api/auth/telegram-webapp/handoff', () => {
  it("imzo to'g'ri bo'lsa bir martalik kirish havolasini beradi", async () => {
    const response = await POST(request({ initData: signed(), next: '/tests' }));
    expect(response.status).toBe(200);
    const { url } = await response.json();
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe('https://eduprime.uz/api/auth/telegram-callback');
    expect(parsed.searchParams.get('telegramId')).toBe('777');
    expect(parsed.searchParams.get('next')).toBe('/tests');
    const saved = db.systemSetting.upsert.mock.calls[0][0];
    expect(saved.where.key).toBe('telegram_auth_777');
    // telegram-callback aynan shu formatni kutadi.
    expect(JSON.parse(saved.create.value).token).toBe(parsed.searchParams.get('token'));
  });

  it('soxta imzoni rad etadi va hech narsa saqlamaydi', async () => {
    const response = await POST(request({ initData: signed('999:other') }));
    expect(response.status).toBe(401);
    expect(db.systemSetting.upsert).not.toHaveBeenCalled();
  });

  it("tashqi manzilga yo'naltirishni qabul qilmaydi", async () => {
    const response = await POST(request({ initData: signed(), next: '//evil.com' }));
    const { url } = await response.json();
    expect(new URL(url).searchParams.get('next')).toBe('/attestation');
  });
});
