import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.hoisted(() => {
  process.env.TELEGRAM_BOT_TOKEN = 'test-token'; process.env.ADMIN_TELEGRAM_IDS = '456'; process.env.NEXT_PUBLIC_APP_URL = 'http://localhost';
});

// Botda `/promo KOD` (lib/campaign/promo-bot.ts) haqiqiy webhook orqali; baza
// xotirada — "ishlatildi" belgisining shartli yozuvi shu yerda baholanadi.
vi.mock('@/lib/db', async () => ({ db: (await import('@/app/api/admin/campaigns/[id]/__tests__/fake-db')).fake.client }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: vi.fn() }));
vi.mock('@/lib/purchases', () => ({ recordPurchase: vi.fn() }));
vi.mock('@/lib/subscription-payments', () => ({ processLegacySubscription: vi.fn() }));
vi.mock('@/lib/telegram-intent-checkout', () => ({ startIntentCheckout: vi.fn() }));
vi.mock('@/lib/ad-free-test', () => ({ getAdFreeTestId: async () => 'ad-mock' }));
vi.mock('@/lib/referral-code', () => ({ linkReferral: vi.fn(), ensureReferralCode: vi.fn() }));
import { POST } from '../route';
import { PROMO_TEXTS } from '@/lib/campaign/promo-bot';
import { campaignFixture } from '@/lib/campaign/__tests__/fixtures';
import { fake, type Row } from '@/app/api/admin/campaigns/[id]/__tests__/fake-db';

const ADMIN = { id: 456, username: 'admin', first_name: 'Admin' };
const MANAGER = { id: 900, username: 'Kurs_Admin', first_name: 'Kurs' };
const USER = { id: 777, username: 'student', first_name: 'Ali' };

const request = (body: unknown) => new NextRequest('http://localhost/api/telegram/webhook', {
  method: 'POST', headers: { 'x-telegram-bot-api-secret-token': 'test-webhook' }, body: JSON.stringify(body),
});
const command = (text: string, from = ADMIN) => POST(request({ message: { message_id: 1, text, chat: { id: from.id, type: 'private' }, from } }));
const press = (data: string, from = MANAGER) => POST(request({
  callback_query: { id: 'cb1', from, data, message: { message_id: 55, chat: { id: from.id } } },
}));
const calls = (method: string) => vi.mocked(fetch).mock.calls
  .filter(([url]) => String(url).endsWith(`/${method}`))
  .map(([, init]) => JSON.parse(String(init?.body)) as { chat_id?: number; text: string; show_alert?: boolean; reply_markup?: { inline_keyboard: { text: string; callback_data: string }[][] } });
const promo = () => fake.tables().promoCode.find((p) => p.id === 'pc1') as Row;

beforeEach(() => {
  vi.clearAllMocks();
  // CI'da TELEGRAM_WEBHOOK_SECRET o'rnatilgan — testlar muhitga bog'liq bo'lmasin.
  vi.stubEnv('TELEGRAM_WEBHOOK_SECRET', 'test-webhook');
  fake.reset();
  fake.insert('campaign', campaignFixture({ finalizedAt: new Date('2026-11-27T10:00:00Z') }) as unknown as Row);
  fake.insert('systemSetting', { id: 's1', key: 'course_manager_username', value: '@kurs_admin' });
  fake.insert('campaignParticipant', { id: 'p1', campaignId: 'cmp1', telegramId: BigInt(1001), username: 'dilnoza', firstName: 'Dilnoza', refCode: 'RC1', createdAt: new Date() });
  fake.insert('promoCode', {
    id: 'pc1', code: 'ABCD2345', campaignId: 'cmp1', telegramId: BigInt(1001), percent: 70,
    validUntil: new Date('2099-01-01T18:59:59Z'), usedAt: null, usedNote: null, createdAt: new Date(),
  });
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({ ok: true, result: { message_id: 1 } }) })));
});

describe('/promo KOD', () => {
  it('admin: kod (bo‘shliq/chiziqcha/kichik harf bilan) → ma’lumot va "Ishlatildi" tugmasi', async () => {
    await command('/promo abcd-2345');
    const [reply] = calls('sendMessage');
    expect(reply.text.split('\n')).toEqual([
      '🎟 ABCD2345 · 70%',
      'Egasi: Dilnoza (@dilnoza) · ID 1001',
      'Aksiya: Noyabr aksiyasi',
      'Amal qiladi: 1-yanvar, 23:59 gacha — ✅ faol',
      'Holat: ishlatilmagan',
      '⚠️ Kodni egasining Telegram akkaunti bilan solishtiring.',
    ]);
    expect(reply.reply_markup?.inline_keyboard[0][0]).toEqual({ text: PROMO_TEXTS.markButton, callback_data: 'promo:use:pc1' });
  });

  it('kurs admini (username katta-kichik harf farqsiz) ishlata oladi', async () => {
    await command('/promo ABCD2345', MANAGER);
    expect(calls('sendMessage')[0].text).toContain('🎟 ABCD2345');
  });

  it('boshqalar uchun buyruq oshkor qilinmaydi — oddiy noma’lum matn', async () => {
    await command('/promo ABCD2345', USER);
    expect(calls('sendMessage')).toHaveLength(0);
    expect(promo().usedAt).toBeNull();
  });

  it('topilmadi; muddati o‘tgan', async () => {
    await command('/promo ZZZZ9999');
    expect(calls('sendMessage')[0].text).toBe(PROMO_TEXTS.notFound);
    promo().validUntil = new Date('2020-01-01T00:00:00Z');
    await command('/promo ABCD2345');
    expect(calls('sendMessage')[1].text).toContain("⌛ muddati o'tgan");
  });
});

describe('promo:use callback', () => {
  it('atomar belgilaydi, xabar tahrirlanadi; ikkinchi bosish — "Allaqachon ishlatilgan"', async () => {
    await press('promo:use:pc1');
    expect(promo().usedNote).toBe('bot: @Kurs_Admin');
    expect(promo().usedAt).toBeInstanceOf(Date);
    expect(calls('answerCallbackQuery')[0].text).toBe(PROMO_TEXTS.marked);
    const [edit] = calls('editMessageText');
    expect(edit.text).toContain('Holat: ishlatilgan (');
    expect(edit.text).toContain('bot: @Kurs_Admin');
    expect(edit.text.endsWith(PROMO_TEXTS.marked)).toBe(true);
    expect(edit.reply_markup).toBeUndefined();

    const usedAt = promo().usedAt;
    await press('promo:use:pc1', ADMIN);
    expect(calls('answerCallbackQuery')[1]).toMatchObject({ text: PROMO_TEXTS.alreadyUsed, show_alert: true });
    expect(promo()).toMatchObject({ usedAt, usedNote: 'bot: @Kurs_Admin' });
  });

  it('huquq har bosishda qayta tekshiriladi — boshqa odam belgilay olmaydi', async () => {
    await press('promo:use:pc1', USER);
    expect(promo().usedAt).toBeNull();
    expect(calls('editMessageText')).toHaveLength(0);
  });
});
