// Bot sozlamalarining (majburiy kanal, havolalar, kurs) standartlari va sof
// normalizatsiyasi. Bu fayl ATAYLAB db/logger/next-cache'siz: uni admin
// sahifasi (client), sozlamalar route'i va `bot-settings.ts` birga ishlatadi —
// standart qiymat va "to'g'ri username" qoidasi uch joyda alohida yozilib,
// vaqt o'tib bir-biridan ajralib ketmasin.

export const BOT_SETTING_DEFAULTS = {
  required_channel_enabled: 'true',
  required_channel_username: '@FizikaMSattestatsiya',
  // Yopiq kanal bo'lsa — invite link (https://t.me/+...).
  required_channel_link: 'https://t.me/FizikaMSattestatsiya',
  // Bot menyusidagi ixtiyoriy "Kanal" tugmasi — majburiy kanal bilan aralashmasin.
  public_channel_link: 'https://t.me/EduPrimeuz',
  course_name: '',
  course_price: '',
  course_price_public: 'false',
  course_info_link: '',
  course_manager_username: '',
} as const;

export type BotSettingKey = keyof typeof BOT_SETTING_DEFAULTS;

export const BOT_SETTING_KEYS = Object.keys(BOT_SETTING_DEFAULTS) as BotSettingKey[];

// Telegram qoidasi: 5–32 belgi, harf bilan boshlanadi, faqat lotin harfi, raqam va _.
const USERNAME_RE = /^@[A-Za-z][A-Za-z0-9_]{4,31}$/;
// t.me/<username>, t.me/+<invite>, t.me/joinchat/<invite> — boshqa yo'llar ham t.me ichida qoladi.
const TME_RE = /^(?:https?:\/\/)?t\.me\/([A-Za-z0-9_+\-/]+)$/i;

/** `FizikaMS...` yoki `@FizikaMS...` → `@FizikaMS...`; noto'g'ri — `null`. */
export function normalizeChannelUsername(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withAt = trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
  return USERNAME_RE.test(withAt) ? withAt : null;
}

/** `t.me/x`, `http(s)://t.me/x` → `https://t.me/x`; boshqa domen — `null`. */
export function normalizeTelegramLink(value: string): string | null {
  const match = TME_RE.exec(value.trim());
  return match ? `https://t.me/${match[1]}` : null;
}

/** Kurs posti saytda ham bo'lishi mumkin: t.me (normalizatsiya bilan) yoki istalgan https URL. */
export function normalizeInfoLink(value: string): string | null {
  const trimmed = value.trim();
  const tme = normalizeTelegramLink(trimmed);
  if (tme) return tme;
  try {
    return new URL(trimmed).protocol === 'https:' ? trimmed : null;
  } catch {
    return null;
  }
}

/** "350 000" / "350.000" → 350000; musbat butun son bo'lmasa — `null`. */
export function normalizePrice(value: string): number | null {
  const digits = value.replace(/[\s  .]/g, '');
  if (!/^\d+$/.test(digits)) return null;
  const price = Number(digits);
  return Number.isSafeInteger(price) && price > 0 ? price : null;
}

export function hasBotSettingKeys(input: Record<string, unknown>): boolean {
  return BOT_SETTING_KEYS.some((key) => key in input);
}

export type BotSettingsValidation =
  | { ok: true; values: Partial<Record<BotSettingKey, string>> }
  | { ok: false; error: string };

const USERNAME_ERROR = "@ bilan boshlanib, 5–32 ta lotin harfi, raqam yoki _ bo'lsin";
const TME_ERROR = "https://t.me/... ko'rinishida bo'lsin";

type Rule = { normalize: (value: string) => string | null; error: string };

const RULES: Record<BotSettingKey, Rule> = {
  required_channel_enabled: { normalize: toggle, error: "Majburiy obuna qiymati 'true' yoki 'false' bo'lishi kerak" },
  required_channel_username: { normalize: normalizeChannelUsername, error: `Kanal nomi noto'g'ri: ${USERNAME_ERROR}` },
  required_channel_link: { normalize: normalizeTelegramLink, error: `Obuna havolasi noto'g'ri: ${TME_ERROR}` },
  public_channel_link: { normalize: normalizeTelegramLink, error: `Menyu kanali havolasi noto'g'ri: ${TME_ERROR}` },
  course_name: { normalize: (v) => v.trim(), error: '' },
  course_price: { normalize: (v) => normalizePrice(v)?.toString() ?? null, error: "Kurs narxi musbat butun son bo'lsin (so'mda, masalan: 350000)" },
  course_price_public: { normalize: toggle, error: "Narxni ko'rsatish qiymati 'true' yoki 'false' bo'lishi kerak" },
  course_info_link: { normalize: normalizeInfoLink, error: "Kurs havolasi noto'g'ri: https://t.me/... yoki https://... ko'rinishida bo'lsin" },
  course_manager_username: { normalize: normalizeChannelUsername, error: `Menejer username noto'g'ri: ${USERNAME_ERROR}` },
};

function toggle(value: string): string | null {
  const v = value.trim();
  return v === 'true' || v === 'false' ? v : null;
}

/**
 * Admin saqlashidan OLDIN: kelgan bot kalitlari tekshiriladi va
 * normalizatsiya qilingan ko'rinishga keltiriladi. Bo'sh qiymat ruxsat —
 * bot uni standart (yoki "yo'q") deb o'qiydi. Xato bo'lsa hech narsa
 * saqlanmasligi uchun natija yozishdan oldin qaytariladi.
 */
export function validateBotSettings(input: Record<string, unknown>): BotSettingsValidation {
  const values: Partial<Record<BotSettingKey, string>> = {};
  for (const key of BOT_SETTING_KEYS) {
    if (!(key in input)) continue;
    const raw = input[key];
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed) {
      values[key] = '';
      continue;
    }
    const normalized = RULES[key].normalize(trimmed);
    if (normalized === null) return { ok: false, error: RULES[key].error };
    values[key] = normalized;
  }
  return { ok: true, values };
}
