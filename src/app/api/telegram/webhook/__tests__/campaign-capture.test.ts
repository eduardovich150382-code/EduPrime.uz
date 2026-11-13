import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Campaign } from '@prisma/client';

const s = vi.hoisted(() => {
  process.env.TELEGRAM_BOT_TOKEN = 'test-token'; process.env.ADMIN_TELEGRAM_IDS = '456'; process.env.NEXT_PUBLIC_APP_URL = 'http://localhost';
  return { settings: new Map<string, string>(), posts: [] as Record<string, unknown>[], campaign: null as Campaign | null };
});

// Capture webhook orqali: haqiqiy route + lib/campaign/capture, baza xotirada.
const fake = vi.hoisted(() => ({} as Record<string, unknown>));
vi.mock('@/lib/db', () => ({ db: fake }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: vi.fn() }));
vi.mock('@/lib/purchases', () => ({ recordPurchase: vi.fn() }));
vi.mock('@/lib/subscription-payments', () => ({ processLegacySubscription: vi.fn() }));
vi.mock('@/lib/telegram-intent-checkout', () => ({ startIntentCheckout: vi.fn() }));
vi.mock('@/lib/ad-free-test', () => ({ getAdFreeTestId: async () => 'ad-mock' }));
vi.mock('@/lib/referral-code', () => ({ linkReferral: vi.fn(), ensureReferralCode: vi.fn() }));
import { POST } from '../route';
import uz from '@/messages/uz.json';
import { CAPTURE_TEXTS, captureKey } from '@/lib/campaign/capture';
import { campaignFixture } from '@/lib/campaign/__tests__/fixtures';

const findUnique = vi.fn(async ({ where }: { where: { key: string } }) => {
  const value = s.settings.get(where.key);
  return value === undefined ? null : { id: 'set1', key: where.key, value };
});
Object.assign(fake, {
  user: { findUnique: async () => null, findFirst: async () => null },
  botStart: { findFirst: async () => null, create: async ({ data }: { data: object }) => data },
  systemSetting: {
    findMany: async () => [],
    findUnique,
    deleteMany: vi.fn(async ({ where }: { where: { key: string } }) => ({ count: s.settings.delete(where.key) ? 1 : 0 })),
  },
  campaign: { findUnique: async () => s.campaign, findFirst: async () => null },
  campaignPost: {
    findFirst: async () => s.posts.at(-1) ?? null,
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { const p = { id: 'post1', updatedAt: new Date(), ...data }; s.posts.push(p); return p; }),
    update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => Object.assign(s.posts[0], data)),
    deleteMany: async () => ({ count: 0 }),
  },
});

const ADMIN = { id: 456, username: 'admin', first_name: 'Admin' };
const USER = { id: 777, username: 'yangi', first_name: 'Ali' };
const request = (body: unknown) => new NextRequest('http://localhost/api/telegram/webhook', {
  method: 'POST', headers: { 'x-telegram-bot-api-secret-token': 'test-webhook' }, body: JSON.stringify(body),
});
const message = (msg: Record<string, unknown>, from = ADMIN) => POST(request({ message: { message_id: 1, chat: { id: from.id, type: 'private' }, from, ...msg } }));
const replies = () => vi.mocked(fetch).mock.calls
  .filter(([url]) => String(url).endsWith('/sendMessage'))
  .map(([, init]) => (JSON.parse(String(init?.body)) as { text: string }).text);

const KEY = captureKey(456);
function arm(kind = 'ANNOUNCE', expiresInMs = 5 * 60_000) {
  s.settings.set(KEY, JSON.stringify({ campaignId: 'cmp1', kind, expiresAt: new Date(Date.now() + expiresInMs).toISOString() }));
}

beforeEach(() => {
  vi.clearAllMocks();
  // CI'da TELEGRAM_WEBHOOK_SECRET o'rnatilgan — testlar muhitga bog'liq bo'lmasin.
  vi.stubEnv('TELEGRAM_WEBHOOK_SECRET', 'test-webhook');
  s.settings.clear();
  s.posts = [];
  s.campaign = campaignFixture();
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({ ok: true, result: { message_id: 1 } }) })));
});

describe('webhook: capture', () => {
  it('oddiy foydalanuvchi — capture uchun bazaga so‘rov yo‘q', async () => {
    arm();
    await message({ text: 'Salom' }, USER);
    await message({ text: 'Salom', chat: { id: -100, type: 'group' } });
    expect(findUnique).not.toHaveBeenCalled();
    expect(s.posts).toHaveLength(0);
    // Nazorat: so'rovlar webhook secret tekshiruvidan o'tib capture kodigacha yetadi —
    // xuddi shu sozlamada admin xabari kalitni o'qiydi.
    await message({ text: 'Salom' });
    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it('reply klaviatura tugmasi matni va buyruqlar capture qilinmaydi', async () => {
    arm();
    await message({ text: uz.telegramBot.buttons.help });
    await message({ text: '/users' });
    expect(findUnique).not.toHaveBeenCalled();
    expect(s.settings.has(KEY)).toBe(true);
  });

  it('matn + entity’lar → HTML, post saqlanadi, kalit o‘chadi', async () => {
    arm();
    await message({ text: '🎁 Aksiya {kanal}', entities: [{ type: 'bold', offset: 3, length: 6 }] });
    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(s.posts[0]).toMatchObject({ kind: 'ANNOUNCE', text: '🎁 <b>Aksiya</b> {kanal}' });
    expect(s.settings.has(KEY)).toBe(false);
    expect(replies().at(-1)).toContain("✅ Saqlandi: «E'lon posti»");
  });

  it('muddati o‘tgan capture — kalit o‘chadi, xabar odatdagidek ishlanadi', async () => {
    arm('ANNOUNCE', -1000);
    await message({ text: 'Salom' });
    expect(s.settings.has(KEY)).toBe(false);
    expect(s.posts).toHaveLength(0);
    expect(replies()).toHaveLength(0);
  });

  it('rasm + caption → eng katta file_id saqlanadi', async () => {
    arm('SHARE');
    await message({
      photo: [{ file_id: 'small', width: 90, height: 90 }, { file_id: 'large', width: 1280, height: 720 }, { file_id: 'mid', width: 320, height: 180 }],
      caption: 'Obuna: {havola}', caption_entities: [{ type: 'italic', offset: 0, length: 5 }],
    });
    expect(s.posts[0]).toMatchObject({ kind: 'SHARE', imageUrl: 'large', text: '<i>Obuna</i>: {havola}' });
    expect(replies().at(-1)).toContain('Rasm yangilandi');
  });

  it('albom rad etiladi, capture faol qoladi', async () => {
    arm();
    await message({ photo: [{ file_id: 'a', width: 1, height: 1 }], caption: 'x', media_group_id: 'g1' });
    expect(replies()).toEqual([CAPTURE_TEXTS.unsupported]);
    expect(s.posts).toHaveLength(0);
    expect(s.settings.has(KEY)).toBe(true);
  });

  it('/cancel kalitni o‘chiradi', async () => {
    arm();
    await message({ text: '/cancel' });
    expect(s.settings.has(KEY)).toBe(false);
    expect(replies()).toEqual([CAPTURE_TEXTS.cancelled]);
  });

  it('validatsiya xatosida capture saqlanib qoladi va xato qator raqami bilan', async () => {
    arm();
    await message({ text: 'Salom\n{ism} uchun' });
    expect(s.posts).toHaveLength(0);
    expect(s.settings.has(KEY)).toBe(true);
    expect(replies()[0]).toContain("2-qator: Noma'lum o'zgaruvchi {ism}");
  });

  it('rasm bo‘lmasa mavjud rasm o‘zgarmaydi', async () => {
    s.posts = [{ id: 'post1', campaignId: 'cmp1', kind: 'ANNOUNCE', text: 'eski', imageUrl: 'old-file', buttonText: null, buttonUrl: null, channelMessageId: null, publishedAt: null, updatedAt: new Date() }];
    arm();
    await message({ text: 'yangi matn' });
    expect(s.posts[0]).toMatchObject({ text: 'yangi matn', imageUrl: 'old-file' });
    expect(replies().at(-1)).toContain("avvalgi rasm o'zgarmadi");
  });
});

describe('webhook: capture — yakunlangan aksiya (A5)', () => {
  it('G‘oliblar posti saqlanadi, boshqa tur — capture bekor qilinadi', async () => {
    s.campaign = campaignFixture({ finalizedAt: new Date('2026-11-27T10:00:00Z') });
    arm('WINNERS');
    await message({ text: '🏆 G‘oliblar {goliblar}' });
    expect(s.posts[0]).toMatchObject({ kind: 'WINNERS', text: '🏆 G‘oliblar {goliblar}' });
    expect(replies().at(-1)).toContain("✅ Saqlandi: «G'oliblar posti»");

    s.posts = [];
    arm('ANNOUNCE');
    await message({ text: 'Yangi e’lon' });
    expect(s.posts).toHaveLength(0);
    expect(replies().at(-1)).toBe(CAPTURE_TEXTS.campaignGone);
    expect(s.settings.has(KEY)).toBe(false);
  });
});
