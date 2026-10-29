import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  testResult: { findMany: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn() },
  referral: { count: vi.fn() },
}));
vi.mock('@/lib/db', () => ({ db }));

import uz from '@/messages/uz.json';
import { fill, handleMenuAction, mainKeyboard, menuActionFor, sendWelcome } from '../telegram-bot-menu';
import { botReferralLink, miniAppStartTarget, miniAppUrl, parseAdStart, parseReferralStart } from '../telegram-bot-links';

type Sent = { chatId: number | string; text: string; options?: { reply_markup?: unknown } };

function transport() {
  const sent: Sent[] = [];
  return { sent, send: async (chatId: number | string, text: string, options?: Sent['options']) => { sent.push({ chatId, text, options }); } };
}

const ctx = { chatId: 10, telegramId: 777, username: 'ali', firstName: 'Ali' };

beforeEach(() => { vi.clearAllMocks(); });

describe('menuActionFor', () => {
  it('pastki menyu tugmalari va buyruqlarni taniydi', () => {
    expect(menuActionFor(uz.telegramBot.buttons.results)).toBe('results');
    expect(menuActionFor(uz.telegramBot.buttons.referral)).toBe('referral');
    expect(menuActionFor('/natijalar')).toBe('results');
    expect(menuActionFor('/reyting@EduPrimeuzbot')).toBe('rating');
    expect(menuActionFor('/help')).toBe('help');
  });

  it('boshqa matnga javob bermaydi', () => {
    expect(menuActionFor('salom')).toBeNull();
    expect(menuActionFor('/admin')).toBeNull();
  });

  it('klaviaturadagi har bir tugma biror bo\'limga olib boradi', () => {
    const markup = mainKeyboard();
    if (!('keyboard' in markup)) throw new Error('reply keyboard kutilgan');
    for (const row of markup.keyboard) for (const button of row) expect(menuActionFor(button.text)).not.toBeNull();
  });
});

describe('fill', () => {
  it('qiymatlarni HTML uchun xavfsizlantiradi', () => {
    expect(fill('Salom, {name}!', { name: '<b>Ali</b> & co' })).toBe('Salom, &lt;b&gt;Ali&lt;/b&gt; &amp; co!');
    expect(fill('{a} {missing}', { a: 1 })).toBe('1 {missing}');
  });
});

describe('havolalar', () => {
  it('Mini App manzili /tg kirish sahifasi orqali', () => {
    expect(miniAppUrl('https://eduprime.uz/', '/')).toBe('https://eduprime.uz/tg');
    expect(miniAppUrl('https://eduprime.uz', '/results/abc')).toBe('https://eduprime.uz/tg?to=%2Fresults%2Fabc');
  });

  it('startapp kalitlari faqat ro\'yxatdagilar', () => {
    expect(miniAppStartTarget('tests')).toBe('/tests');
    expect(miniAppStartTarget('https://evil.com')).toBeNull();
    expect(miniAppStartTarget(null)).toBeNull();
  });

  it('taklif start parametri', () => {
    expect(parseReferralStart('ref_ali-ab12cd')).toBe('ali-ab12cd');
    expect(parseReferralStart('ref_')).toBeNull();
    expect(parseReferralStart('ref_A<script>')).toBeNull();
    expect(botReferralLink('ali-ab12cd')).toBe('https://t.me/EduPrimeuzbot?start=ref_ali-ab12cd');
  });

  it('reklama start parametri', () => {
    expect(parseAdStart('ad_fizika1')).toBe('fizika1');
    expect(parseAdStart('ad_a_b-c')).toBe('a_b-c');
    expect(parseAdStart(`ad_${'x'.repeat(32)}`)).toBe('x'.repeat(32));
    // Bo'sh, juda uzun va ruxsatsiz belgilar.
    expect(parseAdStart('ad_')).toBeNull();
    expect(parseAdStart(`ad_${'x'.repeat(33)}`)).toBeNull();
    expect(parseAdStart('ad_Fizika')).toBeNull();
    expect(parseAdStart('ad_fizika!')).toBeNull();
    expect(parseAdStart('ad_<script>')).toBeNull();
    expect(parseAdStart('ref_fizika1')).toBeNull();
  });
});

describe('sendWelcome', () => {
  it('Mini App tugmasi va pastki menyu bilan ikki xabar yuboradi', async () => {
    const t = transport();
    await sendWelcome(10, { firstName: 'Ali', referred: true }, t);
    expect(t.sent).toHaveLength(2);
    expect(t.sent[0].text).toContain('Ali');
    expect(t.sent[0].text).toContain(uz.telegramBot.referredWelcome);
    expect(JSON.stringify(t.sent[0].options)).toContain('web_app');
    expect(JSON.stringify(t.sent[1].options)).toContain('is_persistent');
  });
});

describe('handleMenuAction', () => {
  it("natija yo'q foydalanuvchiga birinchi testni taklif qiladi", async () => {
    db.user.findUnique.mockResolvedValue(null);
    const t = transport();
    await handleMenuAction('results', ctx, t, async () => {});
    expect(t.sent[0].text).toBe(uz.telegramBot.resultsEmpty);
  });

  it('oxirgi natijalarni foiz va sana bilan ko\'rsatadi', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'u1' });
    db.testResult.findMany.mockResolvedValue([
      { id: 'r1', score: 28, maxScore: 35, percentage: 80, completedAt: new Date('2026-10-26T20:00:00Z'), test: { titleUz: 'Mock 1' }, session: null },
    ]);
    db.testResult.aggregate.mockResolvedValue({ _count: { id: 3 }, _avg: { percentage: 72.4 } });
    const t = transport();
    await handleMenuAction('results', ctx, t, async () => {});
    expect(t.sent[0].text).toContain('Mock 1');
    expect(t.sent[0].text).toContain('28/35');
    expect(t.sent[0].text).toContain('72%');
    // 20:00 UTC = Toshkentda ertasi kun 01:00.
    expect(t.sent[0].text).toContain('27.10');
    expect(JSON.stringify(t.sent[0].options)).toContain(encodeURIComponent('/results/r1'));
  });

  it('reytingda foydalanuvchining o\'rnini hisoblaydi', async () => {
    db.testResult.groupBy
      .mockResolvedValueOnce([{ userId: 'a', _sum: { score: 90 } }, { userId: 'b', _sum: { score: 50 } }])
      .mockResolvedValueOnce([{ userId: 'a', _sum: { score: 90 } }]);
    db.user.findMany.mockResolvedValue([{ id: 'a', name: 'Aziz' }, { id: 'b', name: 'Bek' }]);
    db.user.findUnique.mockResolvedValue({ id: 'b' });
    db.testResult.aggregate.mockResolvedValue({ _sum: { score: 50 } });
    const t = transport();
    await handleMenuAction('rating', ctx, t, async () => {});
    expect(t.sent[0].text).toContain('🥇 Aziz');
    expect(t.sent[0].text).toContain('<b>2</b>');
  });

  it("taklif: kodi yo'q foydalanuvchiga kod yaratib bot havolasini beradi", async () => {
    db.user.findUnique.mockResolvedValueOnce({ id: 'u1', name: 'ali', referralCode: null }).mockResolvedValueOnce(null);
    db.user.update.mockResolvedValue({});
    db.referral.count.mockResolvedValue(2);
    const t = transport();
    await handleMenuAction('referral', ctx, t, async () => {});
    expect(db.user.update).toHaveBeenCalledOnce();
    expect(t.sent[0].text).toMatch(/https:\/\/t\.me\/EduPrimeuzbot\?start=ref_ali-[a-z0-9]+/);
    expect(t.sent[0].text).toContain('<b>2</b>');
  });

  it('obuna tugmasi mavjud to\'lov oqimini chaqiradi', async () => {
    const onSubscribe = vi.fn(async () => {});
    await handleMenuAction('subscribe', ctx, transport(), onSubscribe);
    expect(onSubscribe).toHaveBeenCalledOnce();
  });
});

describe('setupReport', () => {
  it('xatoni Telegram sababi bilan ko\'rsatadi', async () => {
    const { setupReport } = await import('../telegram-bot-menu');
    const text = setupReport({ menuButton: { ok: true }, commands: { ok: false, description: 'Bad Request: <x>' } }, 'https://eduprime.uz');
    expect(text).toContain('✅ menuButton');
    expect(text).toContain('❌ commands: Bad Request: &lt;x&gt;');
    expect(text).toContain('https://eduprime.uz/tg?to=%2Fattestation');
  });
});
