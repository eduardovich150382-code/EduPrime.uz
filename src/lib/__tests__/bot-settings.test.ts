import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ findMany: vi.fn(), warn: vi.fn(), error: vi.fn(), cacheCalls: [] as { keys: string[]; options: { tags?: string[] } }[] }));
vi.mock('@/lib/db', () => ({ db: { systemSetting: { findMany: m.findMany } } }));
vi.mock('@/lib/logger', () => ({ logger: { warn: m.warn, error: m.error } }));
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: <T>(fn: T, keys: string[], options: { tags?: string[] }) => { m.cacheCalls.push({ keys, options }); return fn; },
}));
import { BOT_SETTING_KEYS, getBotSettings, parseBotSettings, publicCoursePrice } from '../bot-settings';
import { CACHE_TAGS } from '../cache-tags';

const rows = (values: Record<string, string>) => Object.entries(values).map(([key, value]) => ({ key, value }));

const DEFAULTS = {
  requiredChannel: { enabled: true, username: '@FizikaMSattestatsiya', link: 'https://t.me/FizikaMSattestatsiya' },
  publicChannelLink: 'https://t.me/EduPrimeuz',
  course: { name: '', price: null, pricePublic: false, infoLink: '', managerUsername: '' },
};

beforeEach(() => { vi.clearAllMocks(); });

describe('parseBotSettings', () => {
  it('bo‘sh ro‘yxat — standartlar', () => {
    expect(parseBotSettings([])).toEqual(DEFAULTS);
    expect(m.warn).not.toHaveBeenCalled();
  });
  it('@ siz username va t.me/x havola normalizatsiya qilinadi', () => {
    const s = parseBotSettings(rows({ required_channel_username: 'BoshqaKanal', required_channel_link: 't.me/BoshqaKanal', public_channel_link: 't.me/x_kanal' }));
    expect(s.requiredChannel).toEqual({ enabled: true, username: '@BoshqaKanal', link: 'https://t.me/BoshqaKanal' });
    expect(s.publicChannelLink).toBe('https://t.me/x_kanal');
  });
  it('noto‘g‘ri havola/username — standart va ogohlantirish', () => {
    const s = parseBotSettings(rows({ required_channel_link: 'https://example.com', required_channel_username: '@a b' }));
    expect(s.requiredChannel.link).toBe(DEFAULTS.requiredChannel.link);
    expect(s.requiredChannel.username).toBe(DEFAULTS.requiredChannel.username);
    expect(m.warn).toHaveBeenCalledTimes(2);
  });
  it('narx', () => {
    expect(parseBotSettings(rows({ course_price: '350 000' })).course.price).toBe(350000);
    for (const bad of ['abc', '-5', '0']) expect(parseBotSettings(rows({ course_price: bad })).course.price).toBeNull();
  });
  it("enabled: faqat 'false' o‘chiradi", () => {
    expect(parseBotSettings(rows({ required_channel_enabled: 'false' })).requiredChannel.enabled).toBe(false);
    expect(parseBotSettings(rows({ required_channel_enabled: '' })).requiredChannel.enabled).toBe(true);
    expect(parseBotSettings(rows({ required_channel_enabled: 'true' })).requiredChannel.enabled).toBe(true);
  });
  it('kurs maydonlari', () => {
    const s = parseBotSettings(rows({ course_name: ' Kurs ', course_price_public: 'true', course_info_link: 't.me/kurs/1', course_manager_username: 'menejer' }));
    expect(s.course).toEqual({ name: 'Kurs', price: null, pricePublic: true, infoLink: 'https://t.me/kurs/1', managerUsername: '@menejer' });
  });
});

describe('publicCoursePrice', () => {
  it('pricePublic o‘chiq — null', () => {
    expect(publicCoursePrice(parseBotSettings(rows({ course_price: '350000' })))).toBeNull();
    expect(publicCoursePrice(parseBotSettings(rows({ course_price: '350000', course_price_public: 'true' })))).toBe(350000);
  });
});

describe('getBotSettings', () => {
  it('faqat bot kalitlari so‘raladi, settings tegi bilan keshlanadi', async () => {
    m.findMany.mockResolvedValue(rows({ required_channel_username: '@BoshqaKanal' }));
    const s = await getBotSettings();
    expect(s.requiredChannel.username).toBe('@BoshqaKanal');
    expect(m.findMany).toHaveBeenCalledWith({ where: { key: { in: BOT_SETTING_KEYS } }, select: { key: true, value: true } });
    expect(m.cacheCalls[0]?.options.tags).toEqual([CACHE_TAGS.settings]);
  });
  it('baza xatosi — standartlar, bot to‘xtamaydi', async () => {
    m.findMany.mockRejectedValue(new Error('db down'));
    expect(await getBotSettings()).toEqual(DEFAULTS);
    expect(m.error).toHaveBeenCalled();
  });
});
