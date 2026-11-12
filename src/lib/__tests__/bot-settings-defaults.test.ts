import { describe, expect, it } from 'vitest';
import {
  hasBotSettingKeys, normalizeChannelUsername, normalizeInfoLink, normalizePrice, normalizeTelegramLink, validateBotSettings,
} from '../bot-settings-defaults';

describe('normalizatsiya', () => {
  it('username: @ qo‘shiladi, Telegram qoidasi tekshiriladi', () => {
    expect(normalizeChannelUsername('FizikaMSattestatsiya')).toBe('@FizikaMSattestatsiya');
    expect(normalizeChannelUsername('  @Kanal_01 ')).toBe('@Kanal_01');
    expect(normalizeChannelUsername('@abc')).toBeNull(); // 5 belgidan qisqa
    expect(normalizeChannelUsername('@1kanal')).toBeNull(); // raqam bilan boshlanadi
    expect(normalizeChannelUsername('@kanal nomi')).toBeNull();
    expect(normalizeChannelUsername('https://t.me/kanal')).toBeNull();
    expect(normalizeChannelUsername('')).toBeNull();
  });
  it('t.me havolasi https://t.me/... ga keltiriladi', () => {
    expect(normalizeTelegramLink('t.me/EduPrimeuz')).toBe('https://t.me/EduPrimeuz');
    expect(normalizeTelegramLink('http://t.me/EduPrimeuz')).toBe('https://t.me/EduPrimeuz');
    expect(normalizeTelegramLink('https://t.me/+AbC-12_x')).toBe('https://t.me/+AbC-12_x');
    expect(normalizeTelegramLink('https://t.me/joinchat/AAAA')).toBe('https://t.me/joinchat/AAAA');
    expect(normalizeTelegramLink('https://example.com/x')).toBeNull();
    expect(normalizeTelegramLink('t.me/')).toBeNull();
  });
  it('kurs havolasi: t.me yoki https URL', () => {
    expect(normalizeInfoLink('t.me/kurs/12')).toBe('https://t.me/kurs/12');
    expect(normalizeInfoLink('https://eduprime.uz/kurs')).toBe('https://eduprime.uz/kurs');
    expect(normalizeInfoLink('http://eduprime.uz/kurs')).toBeNull();
    expect(normalizeInfoLink('javascript:alert(1)')).toBeNull();
  });
  it('narx: probel/nuqta olib tashlanadi, musbat butun son', () => {
    expect(normalizePrice('350 000')).toBe(350000);
    expect(normalizePrice('350.000')).toBe(350000);
    expect(normalizePrice('350 000')).toBe(350000);
    for (const bad of ['abc', '-5', '0', '', '12,5']) expect(normalizePrice(bad)).toBeNull();
  });
});

describe('validateBotSettings', () => {
  it('bot kalitlari bo‘lmasa — tekshirilmaydi', () => {
    expect(hasBotSettingKeys({ site_announcement: 'x' })).toBe(false);
    expect(hasBotSettingKeys({ course_price: '' })).toBe(true);
  });
  it('normalizatsiya qilingan qiymatlar qaytadi', () => {
    const result = validateBotSettings({
      required_channel_enabled: 'false',
      required_channel_username: 'FizikaMSattestatsiya',
      required_channel_link: 't.me/x_kanal',
      public_channel_link: 'https://t.me/EduPrimeuz',
      course_name: '  Kurs  ',
      course_price: '350 000',
      course_price_public: 'true',
      course_info_link: 't.me/kurs/5',
      course_manager_username: 'menejer_1',
      site_announcement: 'tegilmaydi',
    });
    expect(result).toEqual({
      ok: true,
      values: {
        required_channel_enabled: 'false',
        required_channel_username: '@FizikaMSattestatsiya',
        required_channel_link: 'https://t.me/x_kanal',
        public_channel_link: 'https://t.me/EduPrimeuz',
        course_name: 'Kurs',
        course_price: '350000',
        course_price_public: 'true',
        course_info_link: 'https://t.me/kurs/5',
        course_manager_username: '@menejer_1',
      },
    });
  });
  it('bo‘sh qiymatlar ruxsat', () => {
    expect(validateBotSettings({ required_channel_username: '  ', course_price: '', course_info_link: '' }))
      .toEqual({ ok: true, values: { required_channel_username: '', course_price: '', course_info_link: '' } });
  });
  it('noto‘g‘ri qiymat — aniq o‘zbekcha xato', () => {
    const error = (input: Record<string, string>) => {
      const r = validateBotSettings(input);
      return r.ok ? null : r.error;
    };
    expect(error({ required_channel_username: '@ab' })).toBe("Kanal nomi noto'g'ri: @ bilan boshlanib, 5–32 ta lotin harfi, raqam yoki _ bo'lsin");
    expect(error({ required_channel_link: 'https://example.com' })).toContain('Obuna havolasi');
    expect(error({ public_channel_link: 'kanal' })).toContain('Menyu kanali havolasi');
    expect(error({ course_info_link: 'ftp://x' })).toContain('Kurs havolasi');
    expect(error({ course_price: '-5' })).toContain('Kurs narxi');
    expect(error({ course_price: 'abc' })).toContain('Kurs narxi');
    expect(error({ course_manager_username: 'bad name' })).toContain('Menejer username');
    expect(error({ required_channel_enabled: 'yes' })).toContain('Majburiy obuna');
    expect(error({ course_price_public: '1' })).toContain("Narxni ko'rsatish");
  });
});
