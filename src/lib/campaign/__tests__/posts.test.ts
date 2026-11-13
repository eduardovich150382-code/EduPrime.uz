import { describe, expect, it } from 'vitest';
import {
  DEFAULT_POST_TEXTS, POST_VARIABLES_BY_KIND, WORST_CASE_TOP10, buildPostMessage, defaultPostText, formatRewardsSummary,
  formatTop10ForChannel, keepsPostRecord, validatePost, type PostInput,
} from '../posts';
import { DEFAULT_BASE_REWARD, DEFAULT_REWARD_TIERS } from '../rewards';
import { DEFAULT_CAMPAIGN_TEXTS, renderTemplate } from '../texts';
import { validateTelegramHtml } from '@/lib/telegram-html';

const input = (overrides: Partial<PostInput>): PostInput => ({ text: 'Salom', hasImage: false, buttonText: null, buttonUrl: null, ...overrides });
const messages = (...args: Parameters<typeof validatePost>) => validatePost(...args).map((i) => i.message);

describe('validatePost — turga xos o‘zgaruvchilar', () => {
  it('ANNOUNCE da {ism} va {havola} rad etiladi — kanal postida shaxsiy qiymat yo‘q', () => {
    const issues = validatePost('ANNOUNCE', input({ text: 'Salom {ism}\n{havola}' }), {});
    expect(issues).toEqual(expect.arrayContaining([
      { line: 1, message: "Noma'lum o'zgaruvchi {ism}" },
      { line: 2, message: "Noma'lum o'zgaruvchi {havola}" },
    ]));
  });
  it('SHARE da {havola} o‘tadi, kanal postlarida {qatnashish_havolasi}', () => {
    expect(validatePost('SHARE', input({ text: '{kanal}: {havola}' }), {})).toEqual([]);
    expect(validatePost('LEADERBOARD', input({ text: '{top10}\n{qatnashish_havolasi}' }), {})).toEqual([]);
  });
  it('href="{ism}" rad etiladi, href="{qatnashish_havolasi}" o‘tadi', () => {
    expect(messages('ANNOUNCE', input({ text: '<a href="{ism}">x</a>' }), {}).some((m) => m.includes('havola emas'))).toBe(true);
    expect(validatePost('ANNOUNCE', input({ text: '<a href="{qatnashish_havolasi}">Qatnashish</a>' }), {})).toEqual([]);
  });
  it('har tur standart matni o‘z ro‘yxatidan o‘tadi', () => {
    for (const kind of ['SHARE', 'ANNOUNCE', 'LEADERBOARD', 'LAST_DAY'] as const) {
      expect(validatePost(kind, input({ text: defaultPostText(kind, { texts: {} }) }), {})).toEqual([]);
    }
    expect(DEFAULT_POST_TEXTS.SHARE).toBe(DEFAULT_CAMPAIGN_TEXTS.share_post);
    expect(POST_VARIABLES_BY_KIND.ANNOUNCE.every((v) => v.hint.length > 0)).toBe(true);
  });
});

describe('validatePost — uzunlik', () => {
  it('rasm bilan 1025 belgi rad etiladi, 1024 o‘tadi; rasmsiz 4096 gacha', () => {
    expect(messages('ANNOUNCE', input({ text: 'a'.repeat(1025), hasImage: true }), {})).toEqual(['Matn juda uzun: 1025 / 1024 belgi (rasm izohi)']);
    expect(validatePost('ANNOUNCE', input({ text: 'a'.repeat(1024), hasImage: true }), {})).toEqual([]);
    expect(validatePost('ANNOUNCE', input({ text: 'a'.repeat(1025) }), {})).toEqual([]);
  });
  it('top10 eng uzun holatda sanaladi: 10 qator, 20 belgili ism', () => {
    expect(WORST_CASE_TOP10.split('\n')).toHaveLength(10);
    const text = `${'a'.repeat(1024 - WORST_CASE_TOP10.length)}{top10}`;
    expect(validatePost('LEADERBOARD', input({ text, hasImage: true }), { top10: 'qisqa' })).toEqual([]);
    expect(validatePost('LEADERBOARD', input({ text: `a${text}`, hasImage: true }), { top10: 'qisqa' })).toHaveLength(1);
  });
});

describe('validatePost — tugma', () => {
  it('yarim to‘ldirilgan tugma rad etiladi', () => {
    expect(messages('ANNOUNCE', input({ buttonText: 'Qatnashish' }), {})[0]).toContain("birga to'ldiring");
    expect(messages('ANNOUNCE', input({ buttonUrl: 'https://t.me/x' }), {})[0]).toContain("birga to'ldiring");
  });
  it('javascript: URL rad etiladi; {qatnashish_havolasi}, {kurs_havola}, https:// va tg:// o‘tadi', () => {
    expect(messages('ANNOUNCE', input({ buttonText: 'X', buttonUrl: 'javascript:alert(1)' }), {})[0]).toContain('Tugma havolasi');
    for (const url of ['{qatnashish_havolasi}', '{kurs_havola}', 'https://t.me/x', 'tg://resolve?domain=x']) {
      expect(validatePost('ANNOUNCE', input({ buttonText: 'X', buttonUrl: url }), {})).toEqual([]);
    }
    expect(messages('ANNOUNCE', input({ buttonText: 'X', buttonUrl: '{havola}' }), {})[0]).toContain('Tugma havolasi');
  });
  it('tugma matni ≤ 40 belgi; SHARE da tugma yo‘q', () => {
    expect(messages('ANNOUNCE', input({ buttonText: 'x'.repeat(41), buttonUrl: 'https://t.me/x' }), {})[0]).toContain('40');
    expect(messages('SHARE', input({ buttonText: 'X', buttonUrl: 'https://t.me/x' }), {})[0]).toContain("tugma bo'lmaydi");
  });
});

describe('formatRewardsSummary', () => {
  it('standart pog‘onalar va base', () => {
    expect(formatRewardsSummary(DEFAULT_REWARD_TIERS, DEFAULT_BASE_REWARD)).toBe([
      "🥇 1-o'rin — 100% (kamida 10 ta)",
      "🥈 2–3-o'rin — 70% (kamida 10 ta)",
      "🏅 4–10-o'rin — 50% (kamida 10 ta)",
      "🏅 11–20-o'rin — 30% (kamida 10 ta)",
      '✅ Kamida 5 ta odam taklif qilgan har kim — 20%',
    ].join('\n'));
  });
  it('minReferrals = 0 — qavs yo‘q; base yo‘q — oxirgi qator yo‘q', () => {
    expect(formatRewardsSummary([{ fromRank: 1, toRank: 1, percent: 100, minReferrals: 0 }], { min: null, pct: null })).toBe("🥇 1-o'rin — 100%");
  });
  it('hech narsa yo‘q — null (qator o‘chadi)', () => {
    expect(formatRewardsSummary([], { min: null, pct: null })).toBeNull();
  });
});

describe('formatTop10ForChannel', () => {
  it('medallar, keyin raqam; 0 balli chiqmaydi', () => {
    const rows = [{ name: 'Ali', score: 12 }, { name: 'Vali', score: 9 }, { name: 'Gani', score: 8 }, { name: 'Soli', score: 7 }, { name: 'Nol', score: 0 }];
    expect(formatTop10ForChannel(rows)).toBe('🥇 Ali — 12\n🥈 Vali — 9\n🥉 Gani — 8\n4. Soli — 7');
  });
  it('faqat 10 ta', () => {
    const rows = Array.from({ length: 15 }, (_, i) => ({ name: `U${i}`, score: 20 - i }));
    expect(formatTop10ForChannel(rows)?.split('\n')).toHaveLength(10);
  });
  it('ism 20 belgigacha qisqaradi, render’da escape qilinadi (ikki marta emas)', () => {
    const top = formatTop10ForChannel([{ name: '<b>Juda uzun ism familiya</b>', score: 3 }]) as string;
    expect(top).toBe('🥇 <b>Juda uzun ism fa… — 3');
    expect(renderTemplate('{top10}', { top10: top })).toBe('🥇 &lt;b&gt;Juda uzun ism fa… — 3');
    expect(validateTelegramHtml(renderTemplate('{top10}', { top10: top }))).toEqual([]);
  });
  it('username chiqmaydi — faqat ism; ism yo‘q bo‘lsa "Ishtirokchi"', () => {
    expect(formatTop10ForChannel([{ name: null, score: 2 }, { name: '  ', score: 1 }])).toBe('🥇 Ishtirokchi — 2\n🥈 Ishtirokchi — 1');
  });
  it('bo‘sh → null', () => {
    expect(formatTop10ForChannel([])).toBeNull();
    expect(formatTop10ForChannel([{ name: 'A', score: 0 }])).toBeNull();
  });
});

describe('buildPostMessage', () => {
  const vars = { qatnashish_havolasi: 'https://t.me/EduPrimeuzbot?start=aksiya', top10: null, kanal: '@k' };
  it('tugma bo‘sh — standart tugma; rasm — photo', () => {
    const msg = buildPostMessage('ANNOUNCE', { text: '{kanal}\n{top10}', imageUrl: 'AgACfile', buttonText: null, buttonUrl: null }, vars);
    expect(msg).toEqual({
      text: '@k', photo: 'AgACfile',
      reply_markup: { inline_keyboard: [[{ text: '🎁 Aksiyada qatnashish', url: 'https://t.me/EduPrimeuzbot?start=aksiya', style: 'success' }]] },
    });
  });
  it('SHARE — tugmasiz', () => {
    expect(buildPostMessage('SHARE', { text: 'x', imageUrl: null, buttonText: null, buttonUrl: null }, vars).reply_markup).toBeUndefined();
  });
});

describe('keepsPostRecord', () => {
  const base = { textIsDefault: true, imageUrl: null, buttonText: null, channelMessageId: null, publishedAt: null };
  it('standart matn va boshqa hech narsa — yozuv o‘chadi; LAST_DAY esa qoladi (avtomatik chiqarishga rozilik)', () => {
    expect(keepsPostRecord('ANNOUNCE', base)).toBe(false);
    expect(keepsPostRecord('LAST_DAY', base)).toBe(true);
  });
  it('rasm, tugma yoki kanaldagi xabar bo‘lsa — qoladi', () => {
    expect(keepsPostRecord('ANNOUNCE', { ...base, imageUrl: 'f' })).toBe(true);
    expect(keepsPostRecord('ANNOUNCE', { ...base, channelMessageId: 5 })).toBe(true);
  });
});
