import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Campaign } from '@prisma/client';

const s = vi.hoisted(() => {
  process.env.TELEGRAM_BOT_TOKEN = 'test-token'; process.env.ADMIN_TELEGRAM_IDS = '456'; process.env.NEXT_PUBLIC_APP_URL = 'http://localhost';
  return {
    member: { value: 'left' as string }, campaign: null as Campaign | null, failCampaign: { value: false },
    participants: [] as Record<string, unknown>[], referrals: [] as Record<string, unknown>[], starts: [] as Record<string, unknown>[],
  };
});

// Aksiya webhook orqali: haqiqiy route + lib/campaign, baza xotirada.
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
import { fill } from '@/lib/telegram-bot-menu';
import { campaignFixture, participantFixture } from '@/lib/campaign/__tests__/fixtures';

type Where = Record<string, unknown> & {
  refCode?: string;
  campaignId_telegramId?: { campaignId: string; telegramId: bigint };
  campaignId_referredTelegramId?: { campaignId: string; referredTelegramId: bigint };
};
const campaignOrThrow = () => { if (s.failCampaign.value) throw new Error('relation "Campaign" does not exist'); return s.campaign; };
const withCampaign = (p: Record<string, unknown> | undefined) => (p ? { ...p, campaign: s.campaign } : null);

Object.assign(fake, {
  user: { findUnique: async () => null, findFirst: async () => null, create: async ({ data }: { data: object }) => ({ id: 'u1', ...data }) },
  botStart: { findFirst: async () => null, create: async ({ data }: { data: object }) => { s.starts.push(data as Record<string, unknown>); return data; } },
  systemSetting: { findMany: async () => [] },
  campaign: { findFirst: async () => campaignOrThrow() },
  campaignParticipant: {
    findUnique: async ({ where, include }: { where: Where; include?: { campaign?: boolean } }) => {
      campaignOrThrow();
      const p = where.refCode
        ? s.participants.find((x) => x.refCode === where.refCode)
        : s.participants.find((x) => x.campaignId === where.campaignId_telegramId?.campaignId && x.telegramId === where.campaignId_telegramId?.telegramId);
      return include?.campaign ? withCampaign(p) : p ?? null;
    },
    findMany: async () => s.participants,
    create: async ({ data }: { data: Record<string, unknown> }) => { const p = { id: `p${s.participants.length + 1}`, createdAt: new Date(), ...data }; s.participants.push(p); return p; },
  },
  campaignReferral: {
    findUnique: async ({ where }: { where: Where }) => {
      campaignOrThrow();
      const key = where.campaignId_referredTelegramId;
      const r = s.referrals.find((x) => x.campaignId === key?.campaignId && x.referredTelegramId === key?.referredTelegramId);
      return r ? { ...r, participant: s.participants.find((p) => p.id === r.participantId) } : null;
    },
    create: async ({ data }: { data: Record<string, unknown> }) => { const r = { id: `r${s.referrals.length + 1}`, status: 'PENDING', ...data }; s.referrals.push(r); return r; },
    updateMany: async ({ where, data }: { where: { id: string; status: string }; data: Record<string, unknown> }) => {
      const r = s.referrals.find((x) => x.id === where.id && x.status === where.status);
      if (!r) return { count: 0 };
      Object.assign(r, data);
      return { count: 1 };
    },
    groupBy: async () => {
      const counts = new Map<string, number>();
      for (const r of s.referrals) if (r.status === 'ACTIVE') counts.set(String(r.participantId), (counts.get(String(r.participantId)) ?? 0) + 1);
      return [...counts].map(([participantId, n]) => ({ participantId, _count: { _all: n }, _max: { confirmedAt: new Date() } }));
    },
  },
  campaignPost: { findFirst: async () => null },
});

const newbie = { id: 777, username: 'yangi', first_name: 'Ali' };
const request = (body: unknown) => new NextRequest('http://localhost/api/telegram/webhook', { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': 'test-webhook' }, body: JSON.stringify(body) });
const command = (text: string, from = newbie) => POST(request({ message: { text, chat: { id: from.id }, from } }));
const press = (data: string, from = newbie) => POST(request({ callback_query: { id: 'cb', from, message: { chat: { id: from.id }, message_id: 55 }, data } }));
type Button = { text: string; url?: string; callback_data?: string };
type Sent = { chat_id: number | string; text: string; reply_markup?: { inline_keyboard?: Button[][] } };
const calls = (method: string) => vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith(`/${method}`)).map(([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>);
const sent = (): Sent[] => calls('sendMessage') as unknown as Sent[];
const gatePrompt = fill(uz.telegramBot.channelGate.prompt, { channel: '@FizikaMSattestatsiya' });

beforeEach(() => {
  vi.stubEnv('TELEGRAM_WEBHOOK_SECRET', 'test-webhook');
  s.member.value = 'left'; s.failCampaign.value = false; s.starts.length = 0;
  s.campaign = campaignFixture({ startsAt: new Date(Date.now() - 86_400_000), endsAt: new Date(Date.now() + 5 * 86_400_000) });
  s.participants = [participantFixture({ id: 'p1', telegramId: BigInt(100), refCode: 'Ab12Cd34' })];
  s.referrals = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    json: async () => (String(url).endsWith('/getChatMember') ? { ok: true, result: { status: s.member.value } } : { ok: true, result: { message_id: 1 } }),
  })));
});

describe('aksiya: /start c_<kod>', () => {
  it('obunasiz — gate’dan oldin: PENDING + taklif so‘rovi, kanal gate so‘rovi yo‘q', async () => {
    await command('/start c_Ab12Cd34');
    expect(s.starts[0]).toMatchObject({ source: 'campaign' });
    expect(s.referrals).toEqual([expect.objectContaining({ participantId: 'p1', referredTelegramId: BigInt(777), status: 'PENDING' })]);
    expect(sent()).toHaveLength(1);
    expect(sent()[0].reply_markup?.inline_keyboard?.flat().map((b) => b.callback_data ?? b.url)).toEqual(['https://t.me/FizikaMSattestatsiya', 'cmp:ok']);
    expect(sent().some((m) => m.text === gatePrompt)).toBe(false);
  });
  it('c_ → PENDING → majburiy gate «Obuna bo‘ldim» → ACTIVE + taklif qilganga point_added', async () => {
    await command('/start c_Ab12Cd34');
    // ✅ o'rniga oddiy /start bosdi — gate so'rovi.
    await command('/start');
    expect(sent().at(-1)?.text).toBe(gatePrompt);
    s.member.value = 'member';
    vi.mocked(fetch).mockClear();
    await press('check_subscription');
    expect(s.referrals[0].status).toBe('ACTIVE');
    const toReferrer = sent().find((m) => String(m.chat_id) === '100');
    expect(toReferrer?.text).toContain('+1 ball!');
    // Gate oqimi o'z yo'lida davom etadi.
    expect(calls('editMessageText')[0]?.text).toContain(uz.telegramBot.channelGate.confirmed);
  });
  it('cmp:ok — ACTIVE, point_added va oddiy /start (welcome)', async () => {
    await command('/start c_Ab12Cd34');
    s.member.value = 'member';
    vi.mocked(fetch).mockClear();
    await press('cmp:ok');
    expect(s.referrals[0].status).toBe('ACTIVE');
    expect(sent().map((m) => String(m.chat_id))).toContain('100');
    expect(sent().some((m) => m.text.includes(uz.telegramBot.welcomeCta))).toBe(true);
  });
  it('qoralama (taklif qilgan admin emas) — gate tasdiqlamaydi', async () => {
    s.referrals = [{ id: 'r1', campaignId: 'cmp1', participantId: 'p1', referredTelegramId: BigInt(777), status: 'PENDING' }];
    s.campaign = { ...(s.campaign as Campaign), isPublished: false };
    s.member.value = 'member';
    await press('check_subscription');
    expect(s.referrals[0].status).toBe('PENDING');
    expect(sent().some((m) => String(m.chat_id) === '100')).toBe(false);
  });
  it('baza xatosi — /start va gate odatdagidek ishlaydi', async () => {
    s.failCampaign.value = true;
    s.member.value = 'member';
    await command('/start c_Ab12Cd34');
    expect(sent().some((m) => m.text.includes(uz.telegramBot.welcomeCta))).toBe(true);
    vi.mocked(fetch).mockClear();
    await press('check_subscription');
    expect(calls('editMessageText')).toHaveLength(1);
  });
});

describe('aksiya: qatnashish', () => {
  it('welcome’da 🎁 tugma — faol aksiyada', async () => {
    s.member.value = 'member';
    await command('/start');
    expect(sent()[0].reply_markup?.inline_keyboard?.flat().some((b) => b.callback_data === 'cmp:join')).toBe(true);
    s.campaign = null;
    vi.mocked(fetch).mockClear();
    await command('/start');
    expect(sent()[0].reply_markup?.inline_keyboard?.flat().some((b) => b.callback_data === 'cmp:join')).toBe(false);
  });
  it('/aksiya obunasiz — gate (aksiya saqlanadi), «Obuna bo‘ldim» dan keyin qatnashish davom etadi', async () => {
    await command('/aksiya');
    expect(sent()[0].text).toBe(gatePrompt);
    expect(sent()[0].reply_markup?.inline_keyboard?.flat().find((b) => b.callback_data)?.callback_data).toBe('check_subscription:aksiya');
    s.member.value = 'member';
    vi.mocked(fetch).mockClear();
    await press('check_subscription:aksiya');
    expect(s.participants).toHaveLength(2);
    expect(sent().some((m) => m.text.includes('aksiyasiga xush kelibsiz, Ali!'))).toBe(true);
  });
  it('cmp:join obunasiz — gate so‘rovi; /start aksiya obunachi — darhol qatnashadi', async () => {
    await press('cmp:join');
    expect(sent().at(-1)?.text).toBe(gatePrompt);
    expect(s.participants).toHaveLength(1);
    s.member.value = 'member';
    await command('/start aksiya');
    expect(s.participants).toHaveLength(2);
  });
});
