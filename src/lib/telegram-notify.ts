import { escapeHtml } from './html-escape';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SITE_URL = process.env.NEXTAUTH_URL || 'https://eduprime.uz';

/**
 * Send a Telegram message to a user (fire-and-forget)
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: { parseMode?: 'HTML' | 'Markdown'; disableWebPreview?: boolean }
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !chatId) return false;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: options?.parseMode || 'HTML',
          disable_web_page_preview: options?.disableWebPreview ?? true,
        }),
      }
    );

    if (!response.ok) {
      console.error('[Telegram] Send failed:', await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Telegram] Send error:', error);
    return false;
  }
}

// Sarlavha va matn oddiy matn deb qabul qilinadi: ularni admin/ustoz erkin
// yozadi, `<` yoki `&` qolsa Telegram HTML rejimida butun xabarni rad etadi.
// Havola esa chaqiruvchida tekshiriladi — u `href` ichiga tushadi.
function formatNotificationText(title: string, message: string, link?: string | null): string {
  const fullLink = link
    ? link.startsWith('http')
      ? link
      : `${SITE_URL}${link}`
    : SITE_URL;

  return `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(message)}\n\n<a href="${fullLink}">Saytga kirish</a>`;
}

/**
 * Notify a user via Telegram about a new notification
 */
export async function notifyViaTelegram(
  telegramId: string | null | undefined,
  title: string,
  message: string,
  link?: string | null
): Promise<void> {
  if (!telegramId) return;

  // Fire and forget
  sendTelegramMessage(telegramId, formatNotificationText(title, message, link)).catch(() => {});
}

/**
 * `notifyViaTelegram` bilan bir xil xabar, lekin natijani qaytaradi.
 * Bitta foydalanuvchiga yuborishda await qilinadi: Vercel javobdan keyin
 * funksiyani to'xtatadi, fire-and-forget so'rov esa yo'qolib ketishi mumkin.
 */
export async function sendUserTelegramNotification(
  telegramId: string,
  title: string,
  message: string,
  link?: string | null
): Promise<boolean> {
  return sendTelegramMessage(telegramId, formatNotificationText(title, message, link));
}

/**
 * Send motivational message for inactive users
 */
export async function sendInactivityReminder(
  telegramId: string,
  userName: string,
  inactiveDays: number,
  newTestsCount: number
): Promise<void> {
  const greeting = userName ? `Salom, ${userName}!` : 'Salom!';

  let text = `<b>${greeting}</b>\n\n`;
  text += `Siz ${inactiveDays} kundan beri EduPrime.uz ga kirmadingiz.\n\n`;

  if (newTestsCount > 0) {
    text += `Bu vaqt ichida <b>${newTestsCount} ta yangi test</b> qo'shildi!\n\n`;
  }

  text += `Bilimingizni oshirishni davom ettiring - har bir kun muhim!\n\n`;
  text += `<a href="${SITE_URL}/dashboard">Saytga kirish</a>`;

  sendTelegramMessage(telegramId, text).catch(() => {});
}

/**
 * Send subscription expiry warning
 */
export async function sendPremiumExpiryWarning(
  telegramId: string,
  userName: string,
  daysLeft: number,
  subscription: string
): Promise<void> {
  const greeting = userName ? `Salom, ${userName}!` : 'Salom!';
  // Mahsulot nomini admin yozadi; HTML rejimida "<" yoki "&" xabarni Telegram rad etadigan qilmasin.
  const name = escapeHtml(subscription);

  let text = `<b>${greeting}</b>\n\n`;
  text += `Sizning <b>${name}</b> obunangiz tugashiga <b>${daysLeft} kun</b> qoldi.\n\n`;
  text += `Obunani uzaytiring va testlarga cheksiz kirish imkoniyatidan foydalanishni davom ettiring.\n\n`;
  text += `<a href="${SITE_URL}/pricing">Obunani uzaytirish</a>`;

  sendTelegramMessage(telegramId, text).catch(() => {});
}
