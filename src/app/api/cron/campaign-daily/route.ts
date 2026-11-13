import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getBotSettings } from '@/lib/bot-settings';
import { runCampaignDaily } from '@/lib/campaign/daily';
import { telegramApi } from '@/lib/campaign/telegram';

// Referral aksiyaning kunlik natija xabari — vercel.json: har kuni 15:00 UTC
// (20:00 Toshkent). Mantiq lib/campaign/daily.ts da.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = process.env.TELEGRAM_BOT_TOKEN || '';
    const result = await runCampaignDaily({
      bot: await getBotSettings(),
      send: (chatId, text) => telegramApi(token, 'sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
      api: (method, body) => telegramApi(token, method, body),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      now: () => new Date(),
    });
    return NextResponse.json({ success: true, ...result, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Cron campaign-daily error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
