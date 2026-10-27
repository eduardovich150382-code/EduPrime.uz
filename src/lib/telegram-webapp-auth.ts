import { createHmac, timingSafeEqual } from 'crypto';

// Telegram Mini App ichida ochilgan sayt foydalanuvchini parolsiz kiritadi:
// Telegram sahifaga `initData` qatorini beradi, uni bot tokeni bilan
// imzolangan deb tekshiramiz. Imzo to'g'ri bo'lsa — bu foydalanuvchi haqiqatan
// shu Telegram akkaunti egasi. Tekshiruv faqat serverda (token maxfiy).
// Algoritm: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app

// initData'ni o'g'irlab keyinroq qayta ishlatish (replay) oynasi. Telegram
// Mini App har ochilganda yangi initData beradi, kirgach esa 24 soatlik
// sessiya ishlaydi — shuning uchun qisqa oyna foydalanuvchiga xalal bermaydi.
export const INIT_DATA_MAX_AGE_SEC = 60 * 60;

// Telegram'ning soati biznikidan biroz oldinda bo'lishi mumkin — kelajakdagi
// auth_date'ga shuncha bag'rikenglik.
const CLOCK_SKEW_SEC = 5 * 60;

export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface VerifiedInitData {
  user: TelegramWebAppUser;
  authDate: number;
  startParam: string | null;
}

function isWebAppUser(value: unknown): value is TelegramWebAppUser {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return Number.isSafeInteger(record.id) && (record.id as number) > 0 && typeof record.first_name === 'string';
}

/**
 * `initData` imzosini tekshiradi. Har qanday nomuvofiqlikda `null` —
 * chaqiruvchi sababini bilishi shart emas (hujumchiga ham ma'lumot bermaymiz).
 */
export function verifyWebAppInitData(
  initData: string,
  botToken: string,
  options: { now?: number; maxAgeSec?: number } = {},
): VerifiedInitData | null {
  if (!botToken || !initData || initData.length > 4096) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) return null;

  // Bir kalit ikki marta kelsa data-check-string noaniq bo'ladi — rad etamiz.
  const keys = [...params.keys()];
  if (new Set(keys).size !== keys.length) return null;

  // data-check-string: `hash`dan boshqa barcha maydonlar, kalit bo'yicha
  // alifbo tartibida, `key=value`, orasida \n. (`signature` ham kiradi.)
  const dataCheckString = keys
    .filter((key) => key !== 'hash')
    .sort()
    .map((key) => `${key}=${params.get(key)}`)
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secretKey).update(dataCheckString).digest();
  const received = Buffer.from(hash, 'hex');
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

  const authDate = Number(params.get('auth_date'));
  if (!Number.isSafeInteger(authDate) || authDate <= 0) return null;
  const nowSec = Math.floor((options.now ?? Date.now()) / 1000);
  const maxAge = options.maxAgeSec ?? INIT_DATA_MAX_AGE_SEC;
  if (nowSec - authDate > maxAge || authDate - nowSec > CLOCK_SKEW_SEC) return null;

  let user: unknown;
  try {
    user = JSON.parse(params.get('user') ?? '');
  } catch {
    return null;
  }
  if (!isWebAppUser(user)) return null;

  return { user, authDate, startParam: params.get('start_param') };
}

/** Saytdagi ism: Telegram'dagi to'liq ism, bo'lmasa username. */
export function webAppDisplayName(user: TelegramWebAppUser): string {
  const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return full || user.username || 'Telegram User';
}
