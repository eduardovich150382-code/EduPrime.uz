import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const s = vi.hoisted(() => {
  process.env.TELEGRAM_BOT_TOKEN = 'test-token'; process.env.ADMIN_TELEGRAM_IDS = '456'; process.env.NEXT_PUBLIC_APP_URL = 'http://localhost';
  return { users: [] as Record<string, unknown>[], settings: new Map<string, string>(), starts: [] as Record<string, unknown>[], failStart: { value: false },
    intent: vi.fn(), link: vi.fn(async () => true) };
});

// Kanal tekshiruvi olib tashlangan: har qanday /start getChatMember'siz
// to'g'ridan-to'g'ri o'z oqimiga tushishi kerak. Checkout va referal
// modullari bu yerda faqat chaqirilganini ko'rish uchun almashtirilgan.
const fake = vi.hoisted(() => ({} as Record<string, unknown>));
vi.mock('@/lib/db', () => ({ db: fake }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/lib/purchases', () => ({ recordPurchase: vi.fn() }));
vi.mock('@/lib/subscription-payments', () => ({ processLegacySubscription: vi.fn() }));
vi.mock('@/lib/telegram-intent-checkout', () => ({ startIntentCheckout: s.intent }));
vi.mock('@/lib/ad-free-test', () => ({ getAdFreeTestId: async () => 'ad-mock' }));
vi.mock('@/lib/referral-code', () => ({ linkReferral: s.link, ensureReferralCode: vi.fn() }));
import { POST } from '../route';
import uz from '@/messages/uz.json';
import { AD_START_TEXT, AD_TEST_BUTTON } from '@/lib/telegram-ad-start';

Object.assign(fake, {
  user: {
    findUnique: async ({ where }: { where: { telegramId: string } }) => s.users.find((u) => u.telegramId === where.telegramId) ?? null,
    findFirst: async ({ where }: { where: { telegramId: string } }) => s.users.find((u) => u.telegramId === where.telegramId) ?? null,
    count: async () => s.users.length,
    create: async ({ data }: { data: Record<string, unknown> }) => { const u = { id: `u${s.users.length + 1}`, ...data }; s.users.push(u); return u; },
  },
  botStart: {
    findFirst: async ({ where }: { where: { telegramId: bigint } }) => {
      if (s.failStart.value) throw new Error('db down');
      return s.starts.find((b) => b.telegramId === where.telegramId) ?? null;
    },
    create: async ({ data }: { data: Record<string, unknown> }) => { s.starts.push(data); return data; },
    count: async ({ where }: { where: { isFirst: boolean; createdAt: { gte: Date } } }) => s.starts.filter((b) => b.isFirst === where.isFirst).length,
  },
  payment: { count: async () => 0 },
  systemSetting: {
    findMany: async () => [],
    upsert: async ({ where, create }: { where: { key: string }; create: { value: string } }) => { s.settings.set(where.key, create.value); return {}; },
  },
});

const tg = { id: 777, username: 'student', first_name: 'Ali' };
const request = (body: unknown) => new NextRequest('http://localhost/api/telegram/webhook', { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': 'test-webhook' }, body: JSON.stringify(body) });
const command = (text: string) => POST(request({ message: { text, chat: { id: tg.id }, from: tg } }));
type Sent = { chat_id: number; text: string; reply_markup?: { inline_keyboard?: { text: string; url?: string; callback_data?: string }[][] } };
const urls = () => vi.mocked(fetch).mock.calls.map(([url]) => String(url));
const sent = (): Sent[] => vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith('/sendMessage')).map(([, init]) => JSON.parse(String(init?.body)) as Sent);
const noChannelPrompt = () => {
  expect(urls().some((url) => url.endsWith('/getChatMember'))).toBe(false);
  expect(sent().some((msg) => msg.text.includes("Kanalga obuna bo'ling"))).toBe(false);
};

beforeEach(() => {
  // CI'da TELEGRAM_WEBHOOK_SECRET o'rnatilgan — testlar muhitga bog'liq bo'lmasin.
  vi.stubEnv('TELEGRAM_WEBHOOK_SECRET', 'test-webhook');
  s.users.length = 0; s.settings.clear(); s.starts.length = 0; s.failStart.value = false; s.intent.mockClear(); s.link.mockClear();
  // Obunasiz foydalanuvchi: getChatMember chaqirilsa "left" qaytadi.
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ json: async () => ({ ok: true, result: url.endsWith('/getChatMember') ? { status: 'left' } : { message_id: 1 } }) })));
});

describe('obunasiz /start', () => {
  it('/start — welcome va ixtiyoriy kanal tugmasi', async () => {
    await command('/start');
    noChannelPrompt();
    const welcome = sent()[0];
    expect(welcome.text).toContain('Ali');
    expect(welcome.reply_markup?.inline_keyboard?.flat().find((b) => b.text === uz.telegramBot.buttons.channel)?.url).toBe('https://t.me/EduPrimeuz');
  });
  it('/start ci_... — checkout darhol boshlanadi', async () => {
    await command('/start ci_abc123');
    noChannelPrompt();
    expect(s.intent).toHaveBeenCalledWith(777, expect.objectContaining({ id: 777 }), 'ci_abc123', expect.anything());
  });
  it('/start ref_... — yangi foydalanuvchi taklif qilganga bog‘lanadi', async () => {
    await command('/start ref_ali-ab12cd');
    noChannelPrompt();
    expect(s.link).toHaveBeenCalledWith('u1', 'ali-ab12cd');
    expect(sent()[0].text).toContain(uz.telegramBot.referredWelcome);
  });
  it('/start login — kirish havolasi', async () => {
    await command('/start login');
    noChannelPrompt();
    expect(s.settings.has('telegram_auth_777')).toBe(true);
    expect(sent()[0].reply_markup?.inline_keyboard?.[0][0].url).toContain('/api/auth/telegram-callback?telegramId=777');
    // Saytga kirish — yashil, Testlar/Dashboard — ko'k.
    expect(sent()[0].reply_markup?.inline_keyboard?.flat().map((b) => (b as { style?: string }).style)).toEqual(['success', 'primary', 'primary']);
  });
  it('eski check_subscription tugmasi parametrsiz — welcome, xato yo‘q', async () => {
    const res = await POST(request({ callback_query: { id: 'cb', from: tg, message: { chat: { id: tg.id } }, data: 'check_subscription' } }));
    expect(res.status).toBe(200);
    noChannelPrompt();
    expect(sent()[0].text).toContain('Ali');
  });
  it('/start ad_test1 — BotStart yoziladi va reklama xabari chiqadi', async () => {
    await command('/start ad_test1');
    noChannelPrompt();
    expect(s.starts).toEqual([{ telegramId: BigInt(777), source: 'ad_test1', isFirst: true }]);
    expect(sent()[0].text).toBe(AD_START_TEXT);
    expect(sent()[0].reply_markup?.inline_keyboard?.[0][0].text).toBe(AD_TEST_BUTTON);
    // Mini App to'g'ridan-to'g'ri reklama testining yechish sahifasiga.
    expect(JSON.stringify(sent()[0].reply_markup)).toContain(encodeURIComponent('/tests/ad-mock/solve'));
    await command('/start');
    expect(s.starts[1]).toEqual({ telegramId: BigInt(777), source: 'organic', isFirst: false });
  });
  it('noto‘g‘ri ad_ kodi — oddiy welcome', async () => {
    await command('/start ad_BAD!');
    expect(s.starts[0]).toMatchObject({ source: 'other' });
    expect(sent()[0].text).not.toBe(AD_START_TEXT);
    expect(sent()[0].text).toContain('Ali');
  });
  it('BotStart yozish xatosi javobni to‘xtatmaydi', async () => {
    s.failStart.value = true;
    await command('/start ad_test1');
    expect(sent()[0].text).toBe(AD_START_TEXT);
  });
  it('/admin — birinchi /start soni (bugun, 7 kun)', async () => {
    await command('/start ad_test1');
    vi.mocked(fetch).mockClear();
    await POST(request({ message: { text: '/admin', chat: { id: 456 }, from: { id: 456, first_name: 'Admin' } } }));
    expect(sent()[0].text).toContain('Birinchi /start: bugun <b>1</b> · 7 kun <b>1</b>');
  });
});
