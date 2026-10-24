import { logger } from './logger';

export async function sendSubscriptionTelegram(telegramId: string, message: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: telegramId, text: message }),
    });
    if (!response.ok) logger.error('Subscription Telegram delivery failed', { status: response.status });
  } catch {
    // Yozilgan Notification yetkazish belgisi hamdir: tashqi xatoda qayta
    // yubormaymiz. Token bor URL yoki fetch xatosini logga chiqarmaymiz.
    logger.error('Subscription Telegram delivery failed');
  }
}
