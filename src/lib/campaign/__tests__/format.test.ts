import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ db: {} }));
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));
import { campaignVars, formatCampaignDate, formatSom } from '../format';
import { parseBotSettings, type BotSettings } from '@/lib/bot-settings';

const campaign = { channelUsername: '@FizikaMSattestatsiya', endsAt: new Date('2026-11-26T18:59:00Z') };
function settings(rows: Record<string, string> = {}): BotSettings {
  return parseBotSettings(Object.entries(rows).map(([key, value]) => ({ key, value })));
}

describe('formatlash', () => {
  it('sana Toshkent vaqtida (UTC+5), o‘zbekcha oy', () => {
    expect(formatCampaignDate(new Date('2026-11-26T18:59:00Z'))).toBe('26-noyabr, 23:59');
    // UTC bo'yicha hali 25-noyabr, Toshkentda esa 26-noyabr tongi.
    expect(formatCampaignDate(new Date('2026-11-25T19:05:00Z'))).toBe('26-noyabr, 00:05');
  });
  it('narx', () => {
    expect(formatSom(350000)).toBe("350 000 so'm");
    expect(formatSom(1250000)).toBe("1 250 000 so'm");
    expect(formatSom(990)).toBe("990 so'm");
  });
});

describe('campaignVars', () => {
  it('ism bo‘sh → "do‘stim"; havola bot username bilan', () => {
    const vars = campaignVars({ campaign, bot: settings(), firstName: '  ', refCode: 'Ab12Cd34' });
    expect(vars.ism).toBe("do'stim");
    expect(vars.havola).toBe('https://t.me/EduPrimeuzbot?start=c_Ab12Cd34');
    expect(vars.tugash_vaqti).toBe('26-noyabr, 23:59');
    expect(vars.kanal).toBe('@FizikaMSattestatsiya');
  });
  it('narx yashirin yoki kiritilmagan → null (qator chiqmaydi)', () => {
    const standing = { activeCount: 12, rank: 1, percent: 50, next: null };
    expect(campaignVars({ campaign, bot: settings({ course_price: '350000' }), standing }).kurs_narxi).toBeNull();
    expect(campaignVars({ campaign, bot: settings({ course_price_public: 'true' }), standing }).kurs_narxi).toBeNull();
    const shown = campaignVars({ campaign, bot: settings({ course_price: '350000', course_price_public: 'true' }), standing });
    expect(shown.kurs_narxi).toBe("350 000 so'm");
    expect(shown.chegirmali_narx).toBe("175 000 so'm");
  });
  it('foiz 0 va keyingi maqsad yo‘q → null', () => {
    const vars = campaignVars({ campaign, bot: settings(), standing: { activeCount: 0, rank: 4, percent: 0, next: null } });
    expect(vars).toMatchObject({ ball: '0', orin: '4', foiz: null, keyingi_pogona: null, qolgan: null, chegirmali_narx: null });
    expect(campaignVars({ campaign, bot: settings(), standing: { activeCount: 3, rank: 1, percent: 20, next: { percent: 50, needed: 3 } } }))
      .toMatchObject({ foiz: '20%', keyingi_pogona: '50%', qolgan: '3' });
  });
});
