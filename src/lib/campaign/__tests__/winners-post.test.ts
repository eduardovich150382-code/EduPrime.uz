import { describe, expect, it } from 'vitest';
import { parseBotSettings } from '@/lib/bot-settings';
import { DEFAULT_POST_TEXTS, WORST_CASE_WINNERS, buildPostMessage, formatWinnersForChannel, validatePost, type WinnerRow } from '../posts';
import { postSampleVars, postVars } from '../post-vars';
import { rankParticipants } from '../rewards';
import { campaignFixture, participantFixture } from './fixtures';

const row = (rank: number, overrides: Partial<WinnerRow> = {}): WinnerRow => ({ rank, name: `Ism${rank}`, score: 20 - rank, percent: 50, byTier: true, ...overrides });

describe('formatWinnersForChannel', () => {
  it('medallar, o‘rin raqami, base qatori', () => {
    const text = formatWinnersForChannel([
      row(1, { name: 'Dilnoza', score: 15, percent: 100 }), row(2, { name: 'Jasur', percent: 70 }), row(3, { percent: 70 }), row(4, { name: 'Ali', score: 9 }),
      row(5, { byTier: false, percent: 20 }), row(6, { byTier: false, percent: 20 }),
    ]);
    expect(text?.split('\n')).toEqual([
      '🥇 Dilnoza — 15 ball · 100%', '🥈 Jasur — 18 ball · 70%', '🥉 Ism3 — 17 ball · 70%', '4. Ali — 9 ball · 50%', '✅ Yana 2 kishi — 20% chegirma',
    ]);
  });
  it('30 qator chegarasi va qolganlar soni', () => {
    const lines = (formatWinnersForChannel(Array.from({ length: 35 }, (_, i) => row(i + 1))) as string).split('\n');
    expect(lines).toHaveLength(31);
    expect(lines[29]).toMatch(/^30\. /);
    expect(lines[30]).toBe('… va yana 5 kishi');
  });
  it('faqat base — "Yana" siz; hech kim — null', () => {
    expect(formatWinnersForChannel([row(1, { byTier: false, percent: 20 })])).toBe('✅ 1 kishi — 20% chegirma');
    expect(formatWinnersForChannel([row(1, { percent: 0 })])).toBeNull();
    expect(formatWinnersForChannel([])).toBeNull();
  });
  it('eng uzun holat 30 qator + base', () => {
    expect(WORST_CASE_WINNERS.split('\n')).toHaveLength(31);
  });
});

describe('WINNERS posti', () => {
  const campaign = campaignFixture();
  const bot = parseBotSettings([
    { key: 'course_name', value: 'Fizika' }, { key: 'course_manager_username', value: '@kurs_admin' },
    { key: 'course_info_link', value: 'https://t.me/kurs' },
  ]);
  it('standart matn validatsiyadan o‘tadi', () => {
    expect(validatePost('WINNERS', { text: DEFAULT_POST_TEXTS.WINNERS, hasImage: false, buttonText: null, buttonUrl: null }, postSampleVars(campaign, bot, 'Admin'))).toEqual([]);
  });
  it('haqiqiy qiymatlar: g‘oliblar, kurs admini va "Kurs haqida" tugmasi', () => {
    const p1 = participantFixture({ id: 'p1', firstName: 'Dilnoza' });
    const p2 = participantFixture({ id: 'p2', firstName: 'Jasur', telegramId: BigInt(200) });
    const ranking = rankParticipants([
      { participantId: 'p1', activeCount: 12, lastActiveAt: new Date('2026-11-20T00:00:00Z'), joinedAt: p1.createdAt },
      { participantId: 'p2', activeCount: 6, lastActiveAt: new Date('2026-11-21T00:00:00Z'), joinedAt: p2.createdAt },
    ]);
    const vars = postVars('WINNERS', { campaign, bot, ranking: { ranking, participants: new Map([['p1', p1], ['p2', p2]]) } });
    const message = buildPostMessage('WINNERS', { text: DEFAULT_POST_TEXTS.WINNERS, imageUrl: null, buttonText: null, buttonUrl: null }, vars);
    expect(message.text).toContain('🥇 Dilnoza — 12 ball · 100%');
    expect(message.text).toContain('✅ Yana 1 kishi — 20% chegirma');
    expect(message.text).toContain('@kurs_admin');
    expect(message.reply_markup?.inline_keyboard[0][0]).toMatchObject({ text: '📘 Kurs haqida', url: 'https://t.me/kurs' });
  });
  it('kurs havolasi bo‘sh — tugma chiqmaydi', () => {
    const message = buildPostMessage('WINNERS', { text: 'x', imageUrl: null, buttonText: null, buttonUrl: null }, postVars('WINNERS', { campaign, bot: parseBotSettings([]), ranking: null }));
    expect(message.reply_markup).toBeUndefined();
  });
});
