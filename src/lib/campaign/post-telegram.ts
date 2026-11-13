import { logger } from '../logger';
import { explainTelegramError } from './admin-api';
import type { PostMessage } from './posts';
import type { TelegramResult } from './telegram';

// Kanal postlarining Telegram chaqiruvlari. `api` parametr bo'lib keladi
// (route: telegramApi + token, cron: deps) — testda Telegram'siz mock qilinadi.
// Bot tokeni faqat shu yerda va telegram.ts da URL'ga qo'yiladi; brauzerga
// ketadigan javobda hech qachon bo'lmaydi.

export type TelegramApi = (method: string, body: Record<string, unknown>) => Promise<TelegramResult>;

const HTML = 'HTML';
const NO_PREVIEW = { is_disabled: true };

function messageIdOf(result: TelegramResult): number | null {
  const id = (result.result as { message_id?: unknown } | undefined)?.message_id;
  return typeof id === 'number' ? id : null;
}

/** Yangi xabar: rasm bo'lsa `sendPhoto` (caption), bo'lmasa `sendMessage` (havola ko'rinishi o'chiq). */
export async function sendPost(api: TelegramApi, chatId: string | number, msg: PostMessage): Promise<{ result: TelegramResult; messageId: number | null }> {
  const markup = msg.reply_markup ? { reply_markup: msg.reply_markup } : {};
  const result = msg.photo
    ? await api('sendPhoto', { chat_id: chatId, photo: msg.photo, caption: msg.text, parse_mode: HTML, ...markup })
    : await api('sendMessage', { chat_id: chatId, text: msg.text, parse_mode: HTML, link_preview_options: NO_PREVIEW, ...markup });
  return { result, messageId: result.ok ? messageIdOf(result) : null };
}

/**
 * Kanaldagi xabarni tahrirlash — bitta chaqiruv. Rasmli post doim
 * `editMessageMedia` bilan (rasm, caption va tugma birga): kanaldagi rasmning
 * file_id si saqlanmaydi, shuning uchun "rasm almashdimi" ni bilib bo'lmaydi;
 * hech narsa o'zgarmagan bo'lsa Telegram "not modified" qaytaradi.
 */
export function editPost(api: TelegramApi, chatId: string | number, messageId: number, msg: PostMessage): Promise<TelegramResult> {
  // reply_markup bo'lmasa bo'sh klaviatura — tugma olib tashlangan bo'lsa kanalda ham yo'qolsin.
  const reply_markup = msg.reply_markup ?? { inline_keyboard: [] };
  if (msg.photo) {
    return api('editMessageMedia', {
      chat_id: chatId, message_id: messageId, media: { type: 'photo', media: msg.photo, caption: msg.text, parse_mode: HTML }, reply_markup,
    });
  }
  return api('editMessageText', { chat_id: chatId, message_id: messageId, text: msg.text, parse_mode: HTML, link_preview_options: NO_PREVIEW, reply_markup });
}

export function deleteChannelPost(api: TelegramApi, chatId: string, messageId: number): Promise<TelegramResult> {
  return api('deleteMessage', { chat_id: chatId, message_id: messageId });
}

export function pinPost(api: TelegramApi, chatId: string, messageId: number): Promise<TelegramResult> {
  return api('pinChatMessage', { chat_id: chatId, message_id: messageId, disable_notification: true });
}

export type EditOutcome = 'ok' | 'not_modified' | 'not_found' | 'type_changed' | 'error';

/** Telegram javobi → holat. Matnlar Bot API'ning barqaror xato tavsiflaridan. */
export function editOutcome(result: TelegramResult): EditOutcome {
  if (result.ok) return 'ok';
  const d = result.description ?? '';
  if (/message is not modified/i.test(d)) return 'not_modified';
  if (/message to (?:edit|delete) not found|message_id_invalid|message not found/i.test(d)) return 'not_found';
  if (/there is no (?:text|media|caption) in the message|message_edit_type|can't edit message media/i.test(d)) return 'type_changed';
  return 'error';
}

export const TYPE_CHANGED_ERROR = "Kanaldagi postning turi o'zgaradi: avval kanaldan o'chiring, keyin qayta chiqaring";

/** Admin uchun izoh — A3 dagi `explainTelegramError` ustiga rasm va kanal xatolari. */
export function explainPostError(result: TelegramResult): string {
  const d = result.description ?? '';
  if (result.error_code === undefined) return "Telegram bilan aloqa o'rnatilmadi";
  if (/wrong file identifier|wrong remote file|file reference/i.test(d)) return 'Rasm Telegram\'da topilmadi — rasmni qayta yuklang';
  if (/message caption is too long/i.test(d)) return "Rasm izohi juda uzun: Telegram 1024 belgidan ko'pini qabul qilmaydi";
  if (/not enough rights|need administrator rights|have no rights/i.test(d)) return "Botda kanalda yetarli huquq yo'q (post yozish/tahrirlash)";
  if (/message can't be deleted/i.test(d)) return "Telegram bu postni o'chirishga ruxsat bermadi (eski post bo'lishi mumkin): kanalda qo'lda o'chiring, keyin qayta bosing";
  return explainTelegramError(d);
}

export type PhotoSize = { file_id: string; width?: number; height?: number; file_size?: number };

/** Telegram bitta rasmni bir necha o'lchamda beradi — eng kattasi saqlanadi. */
export function largestPhotoFileId(sizes: PhotoSize[] | undefined): string | null {
  if (!sizes?.length) return null;
  const area = (p: PhotoSize) => (p.width ?? 0) * (p.height ?? 0) || (p.file_size ?? 0);
  return [...sizes].sort((a, b) => area(b) - area(a))[0].file_id;
}

/**
 * Rasmni adminning o'z chatiga yuborib file_id olish (fayl xotirasi yo'q:
 * Telegram o'zi saqlaydi, sendPhoto file_id ni to'g'ridan-to'g'ri qabul qiladi).
 */
export async function uploadPhotoToChat(
  token: string, chatId: string, photo: Blob, filename: string, caption: string,
): Promise<{ ok: true; fileId: string } | { ok: false; result: TelegramResult }> {
  try {
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', caption);
    form.append('photo', photo, filename);
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: form });
    const data = (await res.json()) as { ok?: boolean; error_code?: number; description?: string; result?: { photo?: PhotoSize[] } };
    const fileId = data.ok ? largestPhotoFileId(data.result?.photo) : null;
    if (fileId) return { ok: true, fileId };
    return { ok: false, result: { ok: false, error_code: data.error_code ?? 400, description: data.description ?? 'no photo in response' } };
  } catch (error) {
    logger.error('Campaign post photo upload error:', { error });
    return { ok: false, result: { ok: false, description: 'network error' } };
  }
}

/**
 * Rasmni Telegram'dan olib oqim sifatida qaytaradi (admin preview proxy'si).
 * Faylning to'liq URL'i (ichida token) faqat server ichida qoladi; tashqariga
 * faqat tana va Content-Type chiqadi.
 */
export async function fetchTelegramFile(token: string, fileId: string): Promise<{ body: ReadableStream<Uint8Array>; contentType: string } | null> {
  try {
    const info = await fetch(`https://api.telegram.org/bot${token}/getFile`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file_id: fileId }),
    });
    const data = (await info.json()) as { ok?: boolean; result?: { file_path?: string } };
    const path = data.ok ? data.result?.file_path : undefined;
    if (!path) return null;
    const file = await fetch(`https://api.telegram.org/file/bot${token}/${path}`);
    if (!file.ok || !file.body) return null;
    const type = file.headers.get('content-type') ?? '';
    return { body: file.body, contentType: type.startsWith('image/') ? type : 'image/jpeg' };
  } catch (error) {
    logger.error('Campaign post image proxy error:', { error });
    return null;
  }
}
