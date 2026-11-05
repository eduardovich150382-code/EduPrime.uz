// Admin → bitta foydalanuvchi xabarining server va dialog o'rtasidagi umumiy
// shartlari. Bog'liqliksiz — klient komponentidan ham import qilinadi.

export const ADMIN_MESSAGE_TITLE_MAX = 120;
export const ADMIN_MESSAGE_TEXT_MAX = 2000;
export const ADMIN_MESSAGE_LINK_MAX = 500;

export type TelegramDelivery = 'sent' | 'failed' | 'not_linked' | 'skipped';

export interface AdminMessageResult {
  success: true;
  site: boolean;
  telegram: TelegramDelivery;
}

// Havola Telegram xabarida `href="..."` ichiga to'g'ridan-to'g'ri tushadi,
// shuning uchun qo'shtirnoq, `<>` va bo'shliq taqiqlanadi. `//host` ko'rinishi
// "ichki yo'l" bo'lib ko'rinsa ham brauzer uni boshqa saytga ochadi.
const UNSAFE_LINK_CHARS = /[\s"<>\\]/;

export function isAllowedAdminMessageLink(link: string): boolean {
  if (UNSAFE_LINK_CHARS.test(link)) return false;
  if (link.startsWith('/')) return !link.startsWith('//');
  try {
    return new URL(link).protocol === 'https:';
  } catch {
    return false;
  }
}
