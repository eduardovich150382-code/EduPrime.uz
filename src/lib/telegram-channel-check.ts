// Bot kanalda admin ekanini tekshirish. Sozlamalar sahifasidagi "Botni
// tekshirish" (faqat ogohlantiradi) va aksiyani e'lon qilish (bot admin
// bo'lmasa to'xtatadi) — ikkalasi shuni chaqiradi. Bot admin bo'lmasa
// getChatMember ishlamaydi va obuna tekshiruvi jimgina o'tkazib yuboriladi,
// post huquqi bo'lmasa aksiya postlari chiqmaydi.

type TelegramReply<T> = { ok: boolean; result?: T; description?: string };
type ChatMember = { status?: string; can_post_messages?: boolean; can_edit_messages?: boolean };

export type ChannelCheck =
  | { ok: true; title: string; memberCount: number | null; isAdmin: boolean; canPost: boolean; canEdit: boolean }
  | { ok: false; error: string };

async function tg<T>(token: string, method: string, body: Record<string, unknown> = {}): Promise<TelegramReply<T>> {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await res.json()) as TelegramReply<T>;
}

/**
 * `channel` — normalizatsiya qilingan `@username`. Telegram javob bermasa
 * (tarmoq) THROW qiladi: chaqiruvchi "kanal topilmadi" va "aloqa yo'q" ni
 * ajrata olsin (e'lon qilishda 400 emas, 502).
 */
export async function checkChannel(token: string, channel: string): Promise<ChannelCheck> {
  const me = await tg<{ id: number }>(token, 'getMe');
  if (!me.ok || !me.result) return { ok: false, error: me.description || "Bot ma'lumotini olib bo'lmadi" };

  // Faqat shu bosqich "kanal topilmadi" — qolganlari natijani to'xtatmaydi.
  const chat = await tg<{ title?: string }>(token, 'getChat', { chat_id: channel });
  if (!chat.ok) return { ok: false, error: `Kanal topilmadi: ${chat.description || channel}` };

  // Obunachilar soni — qo'shimcha ma'lumot; olinmasa ham tekshiruv davom etadi.
  const count = await tg<number>(token, 'getChatMemberCount', { chat_id: channel }).catch(() => null);
  const memberCount = count?.ok && typeof count.result === 'number' ? count.result : null;

  // Bot admin bo'lmasa Telegram ko'pincha "member list is inaccessible" qaytaradi —
  // bu xato emas, aynan shu holatni admin ko'rishi kerak.
  const member = await tg<ChatMember>(token, 'getChatMember', { chat_id: channel, user_id: me.result.id });
  const status = member.ok ? member.result?.status : undefined;
  const isCreator = status === 'creator';
  const isAdmin = isCreator || status === 'administrator';

  return {
    ok: true,
    title: chat.result?.title ?? channel,
    memberCount,
    isAdmin,
    canPost: isCreator || (isAdmin && member.result?.can_post_messages === true),
    canEdit: isCreator || (isAdmin && member.result?.can_edit_messages === true),
  };
}
