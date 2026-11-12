import { unstable_cache } from 'next/cache';
import { db } from './db';
import { logger } from './logger';
import { CACHE_TAGS, PUBLIC_CACHE_REVALIDATE_SEC } from './cache-tags';
import {
  BOT_SETTING_DEFAULTS, BOT_SETTING_KEYS, normalizeChannelUsername, normalizeInfoLink, normalizePrice, normalizeTelegramLink,
  type BotSettingKey,
} from './bot-settings-defaults';

// Tez o'zgaradigan Telegram ma'lumotlari (majburiy kanal, havolalar, kurs)
// kodda emas, `SystemSetting` da — kanal almashsa deploy kerak bo'lmasin.

export { BOT_SETTING_DEFAULTS, BOT_SETTING_KEYS, normalizeChannelUsername, normalizeTelegramLink };

export type BotSettings = {
  requiredChannel: { enabled: boolean; username: string; link: string };
  publicChannelLink: string;
  course: { name: string; price: number | null; pricePublic: boolean; infoLink: string; managerUsername: string };
};

/**
 * Bazadagi qatorlar → bot sozlamalari. Bo'sh qiymat — standart. Noto'g'ri
 * qiymat (masalan, eski yoki qo'lda SQL bilan yozilgan) botni buzmasin:
 * standart olinadi va ogohlantirish yoziladi.
 */
export function parseBotSettings(rows: { key: string; value: string }[]): BotSettings {
  const raw = new Map(rows.map((row) => [row.key, row.value.trim()]));
  const value = (key: BotSettingKey) => raw.get(key) ?? '';

  function pick(key: BotSettingKey, normalize: (v: string) => string | null, fallback: string): string {
    const v = value(key);
    if (!v) return fallback;
    const normalized = normalize(v);
    if (normalized === null) {
      logger.warn('Invalid bot setting, using default', { key, value: v });
      return fallback;
    }
    return normalized;
  }

  return {
    requiredChannel: {
      // Faqat aniq 'false' o'chiradi — bo'sh/noma'lum qiymat obunani jimgina o'chirib qo'ymasin.
      enabled: value('required_channel_enabled') !== 'false',
      username: pick('required_channel_username', normalizeChannelUsername, BOT_SETTING_DEFAULTS.required_channel_username),
      link: pick('required_channel_link', normalizeTelegramLink, BOT_SETTING_DEFAULTS.required_channel_link),
    },
    publicChannelLink: pick('public_channel_link', normalizeTelegramLink, BOT_SETTING_DEFAULTS.public_channel_link),
    course: {
      name: value('course_name'),
      price: normalizePrice(value('course_price')),
      pricePublic: value('course_price_public') === 'true',
      infoLink: pick('course_info_link', normalizeInfoLink, ''),
      managerUsername: pick('course_manager_username', normalizeChannelUsername, ''),
    },
  };
}

async function queryBotSettings(): Promise<BotSettings> {
  const rows = await db.systemSetting.findMany({ where: { key: { in: BOT_SETTING_KEYS } }, select: { key: true, value: true } });
  return parseBotSettings(rows);
}

// Webhook Vercel'da bir nechta instansiyada ishlaydi: teg bilan tozalash
// (`revalidateSettings()`) hammasiga birdan ta'sir qiladi, xotira keshi esa
// har instansiyada alohida eskirardi. Kesh birinchi chaqiruvda yaratiladi
// (`ad-free-test.ts` dagi kabi) — modul importi kesh yaratmasin.
let cachedBotSettings: (() => Promise<BotSettings>) | null = null;

/**
 * Baza xatosida standartlar — bot ishlashda davom etadi. try/catch keshdan
 * TASHQARIDA: xato natijasi (standartlar) bir soatga keshlanib qolmasin.
 */
export async function getBotSettings(): Promise<BotSettings> {
  try {
    cachedBotSettings ??= unstable_cache(queryBotSettings, ['bot-settings'], {
      revalidate: PUBLIC_CACHE_REVALIDATE_SEC,
      tags: [CACHE_TAGS.settings],
    });
    return await cachedBotSettings();
  } catch (error) {
    logger.error('getBotSettings error:', { error });
    return parseBotSettings([]);
  }
}

/** Narx ommaviy matnlarda (A2 shablonlari) faqat admin ruxsat berganda ko'rinadi. */
export function publicCoursePrice(settings: BotSettings): number | null {
  return settings.course.pricePublic ? settings.course.price : null;
}
