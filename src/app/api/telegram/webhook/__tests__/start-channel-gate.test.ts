import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const s = vi.hoisted(() => {
  process.env.TELEGRAM_BOT_TOKEN = 'test-token'; process.env.ADMIN_TELEGRAM_IDS = '456'; process.env.NEXT_PUBLIC_APP_URL = 'http://localhost';
  return { users: [] as Record<string, unknown>[], settings: new Map<string, string>(), starts: [] as Record<string, unknown>[], failStart: { value: false },
    intent: vi.fn(), link: vi.fn(async () => true), member: { value: 'left' as string | null },
    botRows: [] as { key: string; value: string }[], failSettings: { value: false } };
});

// Majburiy kanal (admin sozlamasidan): obunasiz /start — welcome matni, keyin
// kanal so'rovi; to'lov/kirish oqimlari va adminlar tekshirilmaydi.
// Checkout va referal modullari faqat chaqirilganini ko'rish uchun almashtirilgan.
const fake = vi.hoisted(() => ({} as Record<string, unknown>));
vi.mock('@/lib/db', () => ({ db: fake }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));
// unstable_cache Next so'rov kontekstisiz ishlamaydi — testda to'g'ridan-to'g'ri chaqiriladi.
vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: vi.fn() }));
vi.mock('@/lib/purchases', () => ({ recordPurchase: vi.fn() }));
vi.mock('@/lib/subscription-payments', () => ({ processLegacySubscription: vi.fn() }));
vi.mock('@/lib/telegram-intent-checkout', () => ({ startIntentCheckout: s.intent }));
vi.mock('@/lib/ad-free-test', () => ({ getAdFreeTestId: async () => 'ad-mock' }));
vi.mock('@/lib/referral-code', () => ({ linkReferral: s.link, ensureReferralCode: vi.fn() }));
import { POST } from '../route';
import uz from '@/messages/uz.json';
import { AD_START_TEXT, AD_TEST_BUTTON } from '@/lib/telegram-ad-start';
import { BOT_SETTING_DEFAULTS } from '@/lib/bot-settings-defaults';
import { fill } from '@/lib/telegram-bot-menu';

const REQUIRED_CHANNEL = BOT_SETTING_DEFAULTS.required_channel_username;
const REQUIRED_CHANNEL_LINK = BOT_SETTING_DEFAULTS.required_channel_link;
const promptFor = (channel: string = REQUIRED_CHANNEL) => fill(uz.telegramBot.channelGate.prompt, { channel });

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
    // Bot sozlamalari (key IN [...]) — s.botRows; s.failSettings — baza xatosi.
    findMany: async ({ where }: { where?: { key?: { in?: string[] } } } = {}) => {
      const keys = where?.key?.in;
      if (!keys) return [];
      if (s.failSettings.value) throw new Error('db down');
      return s.botRows.filter((row) => keys.includes(row.key));
    },
    upsert: async ({ where, create }: { where: { key: string }; create: { value: string } }) => { s.settings.set(where.key, create.value); return {}; },
  },
});

const tg = { id: 777, username: 'student', first_name: 'Ali' };
const gate = uz.telegramBot.channelGate;
const request = (body: unknown) => new NextRequest('http://localhost/api/telegram/webhook', { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': 'test-webhook' }, body: JSON.stringify(body) });
const command = (text: string, from = tg) => POST(request({ message: { text, chat: { id: from.id }, from } }));
const pressCheck = (data = 'check_subscription') => POST(request({ callback_query: { id: 'cb', from: tg, message: { chat: { id: tg.id }, message_id: 55 }, data } }));
type Button = { text: string; url?: string; callback_data?: string; web_app?: { url: string } };
type Sent = { chat_id: number; text: string; message_id?: number; reply_markup?: { inline_keyboard?: Button[][]; keyboard?: unknown } };
const calls = (method: string) => vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith(`/${method}`)).map(([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>);
const sent = (): Sent[] => calls('sendMessage') as unknown as Sent[];
const edits = (): Sent[] => calls('editMessageText') as unknown as Sent[];
const buttons = (msg?: Sent) => msg?.reply_markup?.inline_keyboard?.flat() ?? [];

// getChatMember: s.member.value holati; null — bot kanalda admin emas (xato javob).
function telegramReply(url: string) {
  if (!url.endsWith('/getChatMember')) return { ok: true, result: { message_id: 1 } };
  if (!s.member.value) return { ok: false, description: 'Bad Request: member list is inaccessible' };
  return { ok: true, result: { status: s.member.value, is_member: s.member.value === 'restricted' } };
}

beforeEach(() => {
  // CI'da TELEGRAM_WEBHOOK_SECRET o'rnatilgan — testlar muhitga bog'liq bo'lmasin.
  vi.stubEnv('TELEGRAM_WEBHOOK_SECRET', 'test-webhook');
  s.users.length = 0; s.settings.clear(); s.starts.length = 0; s.failStart.value = false; s.intent.mockClear(); s.link.mockClear();
  s.member.value = 'left'; s.botRows.length = 0; s.failSettings.value = false;
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ json: async () => telegramReply(String(url)) })));
});

describe('majburiy kanal: /start', () => {
  it('obunasiz — avval welcome (tugmalarsiz), keyin kanal so‘rovi', async () => {
    await command('/start');
    expect(calls('getChatMember')).toEqual([{ chat_id: REQUIRED_CHANNEL, user_id: 777 }]);
    const [welcome, prompt] = sent();
    expect(sent()).toHaveLength(2);
    expect(welcome.text).toContain('Ali');
    expect(welcome.text).not.toContain(uz.telegramBot.welcomeCta);
    expect(welcome.reply_markup).toBeUndefined();
    expect(prompt.text).toBe(promptFor());
    expect(buttons(prompt).find((b) => b.text === gate.join)?.url).toBe(REQUIRED_CHANNEL_LINK);
    expect(buttons(prompt).find((b) => b.text === gate.check)?.callback_data).toBe('check_subscription');
    expect(JSON.stringify(sent())).not.toContain('web_app');
    // Mini App menyu tugmasi ham obunagacha yashirin.
    expect(calls('setChatMenuButton')).toEqual([{ chat_id: 777, menu_button: { type: 'commands' } }]);
  });
  it('obunachi — odatdagi welcome, Mini App tugmalari va pastki menyu', async () => {
    s.member.value = 'member';
    await command('/start');
    const [welcome, menu] = sent();
    expect(welcome.text).toContain('Ali');
    expect(welcome.text).toContain(uz.telegramBot.welcomeCta);
    expect(buttons(welcome).find((b) => b.text === uz.telegramBot.buttons.channel)?.url).toBe('https://t.me/EduPrimeuz');
    expect(JSON.stringify(welcome.reply_markup)).toContain('web_app');
    expect(menu.reply_markup?.keyboard).toBeDefined();
    expect(sent().some((msg) => msg.text === promptFor())).toBe(false);
  });
  it('bot kanalda admin emas (getChatMember xatosi) — bot to‘xtamaydi', async () => {
    s.member.value = null;
    await command('/start');
    expect(sent()[0].text).toContain(uz.telegramBot.welcomeCta);
    expect(sent().some((msg) => msg.text === promptFor())).toBe(false);
  });
  it('admin tekshirilmaydi', async () => {
    await command('/start', { id: 456, username: 'admin', first_name: 'Admin' });
    expect(calls('getChatMember')).toHaveLength(0);
    expect(sent()[0].text).toContain(uz.telegramBot.welcomeCta);
  });
  it('/start ci_... — to‘lov kanalsiz darhol boshlanadi', async () => {
    await command('/start ci_abc123');
    expect(calls('getChatMember')).toHaveLength(0);
    expect(s.intent).toHaveBeenCalledWith(777, expect.objectContaining({ id: 777 }), 'ci_abc123', expect.anything());
  });
  it('/start login — kirish havolasi kanalsiz', async () => {
    await command('/start login');
    expect(calls('getChatMember')).toHaveLength(0);
    expect(s.settings.has('telegram_auth_777')).toBe(true);
    expect(sent()[0].reply_markup?.inline_keyboard?.[0][0].url).toContain('/api/auth/telegram-callback?telegramId=777');
    // Saytga kirish — yashil, Testlar/Dashboard — ko'k.
    expect(sent()[0].reply_markup?.inline_keyboard?.flat().map((b) => (b as { style?: string }).style)).toEqual(['success', 'primary', 'primary']);
  });
  it('/start ref_... obunasiz — taklif darhol bog‘lanadi, keyin kanal so‘rovi', async () => {
    await command('/start ref_ali-ab12cd');
    expect(s.link).toHaveBeenCalledWith('u1', 'ali-ab12cd');
    expect(sent()[0].text).toContain(uz.telegramBot.referredWelcome);
    expect(sent()[1].text).toBe(promptFor());
  });
  it('/start ad_test1 obunasiz — BotStart yoziladi, reklama matni, keyin kanal so‘rovi', async () => {
    await command('/start ad_test1');
    expect(s.starts).toEqual([{ telegramId: BigInt(777), source: 'ad_test1', isFirst: true }]);
    expect(sent()[0].text).toBe(AD_START_TEXT);
    expect(sent()[0].reply_markup).toBeUndefined();
    expect(buttons(sent()[1]).find((b) => b.text === gate.check)?.callback_data).toBe('check_subscription:ad_test1');
    s.member.value = 'member';
    await command('/start');
    expect(s.starts[1]).toEqual({ telegramId: BigInt(777), source: 'organic', isFirst: false });
  });
  it('/start ad_test1 obunachi — reklama xabari tugmalari bilan', async () => {
    s.member.value = 'member';
    await command('/start ad_test1');
    expect(sent()[0].text).toBe(AD_START_TEXT);
    expect(sent()[0].reply_markup?.inline_keyboard?.[0][0].text).toBe(AD_TEST_BUTTON);
    // Mini App to'g'ridan-to'g'ri reklama testining yechish sahifasiga.
    expect(JSON.stringify(sent()[0].reply_markup)).toContain(encodeURIComponent('/tests/ad-mock/solve'));
  });
  it('noto‘g‘ri ad_ kodi — oddiy welcome', async () => {
    s.member.value = 'member';
    await command('/start ad_BAD!');
    expect(s.starts[0]).toMatchObject({ source: 'other' });
    expect(sent()[0].text).not.toBe(AD_START_TEXT);
    expect(sent()[0].text).toContain('Ali');
  });
  it('BotStart yozish xatosi javobni to‘xtatmaydi', async () => {
    s.failStart.value = true;
    s.member.value = 'member';
    await command('/start ad_test1');
    expect(sent()[0].text).toBe(AD_START_TEXT);
  });
});

describe('majburiy kanal: «Obuna bo‘ldim»', () => {
  it('hali obuna bo‘lmagan — alert, xabar yuborilmaydi', async () => {
    const res = await pressCheck();
    expect(res.status).toBe(200);
    expect(calls('answerCallbackQuery')).toEqual([{ callback_query_id: 'cb', text: fill(gate.notSubscribed, { channel: REQUIRED_CHANNEL }), show_alert: true }]);
    expect(sent()).toHaveLength(0);
    expect(edits()).toHaveLength(0);
  });
  it('obuna bo‘lgan — so‘rov xabari menyuga aylanadi, pastki menyu va Mini App tugmasi qaytadi', async () => {
    s.member.value = 'member';
    await pressCheck();
    expect(calls('answerCallbackQuery')[0]).toMatchObject({ text: gate.confirmedToast });
    const [edit] = edits();
    expect(edit).toMatchObject({ chat_id: 777, message_id: 55 });
    expect(edit.text).toContain(gate.confirmed);
    expect(edit.text).toContain(uz.telegramBot.welcomeCta);
    expect(JSON.stringify(edit.reply_markup)).toContain('web_app');
    expect(sent()[0].reply_markup?.keyboard).toBeDefined();
    expect(JSON.stringify(calls('setChatMenuButton'))).toContain('web_app');
  });
  it('restricted, lekin a’zo — obunachi hisoblanadi', async () => {
    s.member.value = 'restricted';
    await pressCheck();
    expect(edits()).toHaveLength(1);
  });
  it('reklamadan kelgan — tasdiqdan keyin bepul test tugmasi', async () => {
    s.member.value = 'member';
    await pressCheck('check_subscription:ad_test1');
    const [edit] = edits();
    expect(edit.text).toContain(AD_START_TEXT);
    expect(JSON.stringify(edit.reply_markup)).toContain(encodeURIComponent('/tests/ad-mock/solve'));
  });
  it('eski check_subscription:ci_... tugmasi — to‘lov davom etadi', async () => {
    await pressCheck('check_subscription:ci_abc123');
    expect(s.intent).toHaveBeenCalledWith(777, expect.objectContaining({ id: 777 }), 'ci_abc123', expect.anything());
  });
});

describe('majburiy kanal: admin sozlamasi', () => {
  const setRows = (rows: Record<string, string>) => { s.botRows.push(...Object.entries(rows).map(([key, value]) => ({ key, value }))); };

  it('kanal va havola sozlamadan; matnda {channel} o‘rniga username', async () => {
    setRows({ required_channel_username: 'BoshqaKanal', required_channel_link: 't.me/+invite123' });
    await command('/start');
    expect(calls('getChatMember')).toEqual([{ chat_id: '@BoshqaKanal', user_id: 777 }]);
    const prompt = sent()[1];
    expect(prompt.text).toBe(promptFor('@BoshqaKanal'));
    expect(prompt.text).toContain('@BoshqaKanal');
    expect(prompt.text).not.toContain('{channel}');
    expect(buttons(prompt).find((b) => b.text === gate.join)?.url).toBe('https://t.me/+invite123');
  });
  it('«Obuna bo‘ldim» alertida ham sozlamadagi username', async () => {
    setRows({ required_channel_username: '@BoshqaKanal' });
    await pressCheck();
    const [answer] = calls('answerCallbackQuery');
    expect(answer.text).toContain('@BoshqaKanal');
    expect(answer.text).not.toContain('{channel}');
  });
  it('enabled=false — getChatMember chaqirilmaydi, menyu darhol', async () => {
    setRows({ required_channel_enabled: 'false' });
    await command('/start');
    expect(calls('getChatMember')).toHaveLength(0);
    expect(sent()[0].text).toContain(uz.telegramBot.welcomeCta);
    expect(JSON.stringify(sent()[0].reply_markup)).toContain('web_app');
    expect(sent()[1].reply_markup?.keyboard).toBeDefined();
    await command(uz.telegramBot.buttons.help);
    expect(calls('getChatMember')).toHaveLength(0);
  });
  it('menyudagi "Kanal" havolasi public_channel_link dan', async () => {
    s.member.value = 'member';
    setRows({ public_channel_link: 'https://t.me/YangiKanal' });
    await command('/start');
    expect(buttons(sent()[0]).find((b) => b.text === uz.telegramBot.buttons.channel)?.url).toBe('https://t.me/YangiKanal');
  });
  it('baza xatosi — standart kanal bilan ishlaydi', async () => {
    s.failSettings.value = true;
    await command('/start');
    expect(calls('getChatMember')).toEqual([{ chat_id: '@FizikaMSattestatsiya', user_id: 777 }]);
    expect(sent()[1].text).toBe(promptFor('@FizikaMSattestatsiya'));
  });
});

describe('majburiy kanal: pastki menyu', () => {
  it('obunasiz — bo‘lim o‘rniga kanal so‘rovi', async () => {
    await command(uz.telegramBot.buttons.help);
    expect(sent()).toHaveLength(1);
    expect(sent()[0].text).toBe(promptFor());
  });
  it('obunachi — bo‘lim ochiladi', async () => {
    s.member.value = 'member';
    await command(uz.telegramBot.buttons.help);
    expect(sent()[0].text).toContain(uz.telegramBot.helpText.slice(0, 20));
  });
});

describe('/admin', () => {
  it('birinchi /start soni (bugun, 7 kun)', async () => {
    await command('/start ad_test1');
    vi.mocked(fetch).mockClear();
    await POST(request({ message: { text: '/admin', chat: { id: 456 }, from: { id: 456, first_name: 'Admin' } } }));
    expect(sent()[0].text).toContain('Birinchi /start: bugun <b>1</b> · 7 kun <b>1</b>');
  });
});
