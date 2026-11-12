import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { normalizeChannelUsername } from '@/lib/bot-settings-defaults';

// Admin kanal sozlamasini SAQLASHDAN OLDIN tekshiradi: bot kanalda admin
// bo'lmasa getChatMember ishlamaydi (obuna tekshiruvi jimgina o'tkazib
// yuboriladi), post huquqi bo'lmasa aksiya postlari chiqmaydi. Tekshiruv
// faqat ogohlantiradi — saqlashni bloklamaydi.

type TelegramReply<T> = { ok: boolean; result?: T; description?: string };
type ChatMember = { status?: string; can_post_messages?: boolean; can_edit_messages?: boolean };

async function tg<T>(token: string, method: string, body: Record<string, unknown> = {}): Promise<TelegramReply<T>> {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await res.json()) as TelegramReply<T>;
}

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
    const me = await tg<{ id: number }>(token, 'getMe');
    if (!me.ok || !me.result) return NextResponse.json({ ok: false, error: me.description || "Bot ma'lumotini olib bo'lmadi" });

    // Faqat shu bosqich "kanal topilmadi" — qolganlari natijani to'xtatmaydi.
    const chat = await tg<{ title?: string }>(token, 'getChat', { chat_id: channel });
    if (!chat.ok) return NextResponse.json({ ok: false, error: `Kanal topilmadi: ${chat.description || channel}` });

    // Obunachilar soni — qo'shimcha ma'lumot; olinmasa ham tekshiruv davom etadi.
    const count = await tg<number>(token, 'getChatMemberCount', { chat_id: channel }).catch(() => null);
    const memberCount = count?.ok && typeof count.result === 'number' ? count.result : null;

    // Bot admin bo'lmasa Telegram ko'pincha "member list is inaccessible" qaytaradi —
    // bu xato emas, aynan shu holatni admin ko'rishi kerak.
    const member = await tg<ChatMember>(token, 'getChatMember', { chat_id: channel, user_id: me.result.id });
    const status = member.ok ? member.result?.status : undefined;
    const isCreator = status === 'creator';
    const isAdmin = isCreator || status === 'administrator';

    return NextResponse.json({
      ok: true,
      title: chat.result?.title ?? channel,
      memberCount,
      isAdmin,
      canPost: isCreator || (isAdmin && member.result?.can_post_messages === true),
      canEdit: isCreator || (isAdmin && member.result?.can_edit_messages === true),
    });
  } catch (err) {
    logger.error('POST /api/admin/settings/check-channel error:', { error: err });
    return NextResponse.json({ ok: false, error: "Telegram bilan aloqa o'rnatilmadi" }, { status: 502 });
  }
}
