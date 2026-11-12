import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { normalizeChannelUsername } from '@/lib/bot-settings-defaults';
import { checkChannel } from '@/lib/telegram-channel-check';

// Admin kanal sozlamasini SAQLASHDAN OLDIN tekshiradi (lib/telegram-channel-check.ts).
// Bu yerda tekshiruv faqat ogohlantiradi — saqlashni bloklamaydi.

/** POST /api/admin/settings/check-channel — { channel } (forma ichidagi, hali saqlanmagan qiymat). */
export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body: unknown = await request.json().catch(() => null);
  const input = typeof body === 'object' && body !== null ? (body as { channel?: unknown }).channel : undefined;
  const channel = typeof input === 'string' ? normalizeChannelUsername(input) : null;
  if (!channel) {
    return NextResponse.json({ ok: false, error: "Kanal nomi noto'g'ri: @ bilan boshlanib, 5–32 ta lotin harfi, raqam yoki _ bo'lsin" }, { status: 400 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ ok: false, error: 'TELEGRAM_BOT_TOKEN sozlanmagan' }, { status: 500 });

  try {
    return NextResponse.json(await checkChannel(token, channel));
  } catch (err) {
    logger.error('POST /api/admin/settings/check-channel error:', { error: err });
    return NextResponse.json({ ok: false, error: "Telegram bilan aloqa o'rnatilmadi" }, { status: 502 });
  }
}
