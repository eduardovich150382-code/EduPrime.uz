import { z } from 'zod';
import { db } from '../db';
import { logger } from '../logger';
import { revalidateCampaigns } from '../cache-tags';
import type { BotSettings } from '../bot-settings';
import { entitiesToHtml, type TelegramEntity } from '../telegram-entities';
import { savePost, loadPost } from './post-store';
import { TYPE_CHANGED_ERROR, largestPhotoFileId, type PhotoSize } from './post-telegram';
import { postSampleVars } from './post-vars';
import { EDITABLE_POST_KINDS, POST_KIND_CONFIG, defaultPostText, validatePost, type EditablePostKind } from './posts';

// "Telegram'da yozib botga yuborish" (A4): admin panelda "📲 Telegram'dan
// olish" bosilganda SystemSetting'ga kalit yoziladi, keyingi shaxsiy xabari
// shu postga aylanadi. Emoji, spoiler va formatlashni Telegram'ning o'zida
// yozish eng oson. Bot javoblari faqat adminga — qattiq yozilgan (A3 admin UI kabi).

export const CAPTURE_KEY_PREFIX = 'campaign_capture:';
export const CAPTURE_TTL_MS = 10 * 60 * 1000;

export const captureKey = (telegramId: string | number) => `${CAPTURE_KEY_PREFIX}${telegramId}`;

/** Sozlamalar sahifasida ko'rinmasin va u PUT qilganda qayta yozilmasin. */
export function isCaptureKey(key: string): boolean {
  return key.startsWith(CAPTURE_KEY_PREFIX);
}

const captureValue = z.object({ campaignId: z.string(), kind: z.enum(EDITABLE_POST_KINDS), expiresAt: z.string().datetime() });
type CaptureValue = z.infer<typeof captureValue>;

export async function startCapture(telegramId: string, campaignId: string, kind: EditablePostKind, now: Date): Promise<Date> {
  const expiresAt = new Date(now.getTime() + CAPTURE_TTL_MS);
  const value = JSON.stringify({ campaignId, kind, expiresAt: expiresAt.toISOString() } satisfies CaptureValue);
  await db.systemSetting.upsert({ where: { key: captureKey(telegramId) }, update: { value }, create: { key: captureKey(telegramId), value } });
  return expiresAt;
}

export function captureStartText(kind: EditablePostKind): string {
  return `✍️ «${POST_KIND_CONFIG[kind].name}» uchun xabarni shu yerga yozing yoki forward qiling (10 daqiqa). Bekor qilish: /cancel`;
}

export const CAPTURE_TEXTS = {
  cancelled: 'Bekor qilindi',
  unsupported: "Faqat matn yoki bitta rasm (izohi bilan) qo'llanadi",
  campaignGone: "Aksiya topilmadi yoki yakunlangan — capture bekor qilindi",
} as const;

export type CaptureMessage = {
  chat?: { id: number; type?: string };
  from?: { id: number };
  text?: string;
  entities?: TelegramEntity[];
  caption?: string;
  caption_entities?: TelegramEntity[];
  photo?: PhotoSize[];
  media_group_id?: string;
  [other: string]: unknown;
};

export type CaptureDeps = {
  bot: BotSettings;
  isAdmin(telegramId: number): boolean;
  /** Pastki (reply) klaviatura tugmasi yoki menyu buyrug'i — capture qilinmaydi. */
  isMenuText(text: string): boolean;
  reply(chatId: number, text: string): Promise<unknown>;
  now?: () => Date;
};

const UNSUPPORTED_FIELDS = ['video', 'document', 'animation', 'audio', 'voice', 'video_note', 'sticker', 'poll', 'location', 'contact'];

/**
 * Faqat admin shaxsiy chatidagi buyruq bo'lmagan xabar uchun (/cancel
 * mustasno) bazaga BITTA so'rov — oddiy foydalanuvchilar uchun qo'shimcha
 * so'rov yo'q. `true` — xabar capture'ga tegishli, odatdagi ishlov kerak emas.
 */
export async function handleCampaignCapture(msg: CaptureMessage, deps: CaptureDeps): Promise<boolean> {
  const chatId = msg.chat?.id;
  const fromId = msg.from?.id;
  if (msg.chat?.type !== 'private' || chatId === undefined || fromId === undefined || !deps.isAdmin(fromId)) return false;
  const text = msg.text;
  const isCancel = text !== undefined && text.trim().replace(/@\w+$/, '') === '/cancel';
  if (text !== undefined && !isCancel && (text.startsWith('/') || deps.isMenuText(text))) return false;

  const key = captureKey(fromId);
  let capture: CaptureValue;
  try {
    const row = await db.systemSetting.findUnique({ where: { key } });
    if (!row) return false;
    const parsed = captureValue.safeParse(JSON.parse(row.value));
    const now = deps.now?.() ?? new Date();
    if (!parsed.success || new Date(parsed.data.expiresAt).getTime() <= now.getTime()) {
      await db.systemSetting.deleteMany({ where: { key } });
      return false;
    }
    capture = parsed.data;
  } catch (error) {
    logger.error('Campaign capture lookup failed', { error });
    return false;
  }

  try {
    if (isCancel) {
      await db.systemSetting.deleteMany({ where: { key } });
      await deps.reply(chatId, CAPTURE_TEXTS.cancelled);
      return true;
    }
    if (msg.media_group_id || UNSUPPORTED_FIELDS.some((f) => msg[f] !== undefined) || (text === undefined && !msg.photo)) {
      await deps.reply(chatId, CAPTURE_TEXTS.unsupported);
      return true;
    }
    await savePostFromMessage(msg, chatId, key, capture, deps);
    return true;
  } catch (error) {
    logger.error('Campaign capture failed', { error });
    return true;
  }
}

async function savePostFromMessage(msg: CaptureMessage, chatId: number, key: string, capture: CaptureValue, deps: CaptureDeps): Promise<void> {
  const campaign = await db.campaign.findUnique({ where: { id: capture.campaignId } });
  if (!campaign || campaign.finalizedAt) {
    await db.systemSetting.deleteMany({ where: { key } });
    await deps.reply(chatId, CAPTURE_TEXTS.campaignGone);
    return;
  }
  const { kind } = capture;
  const post = await loadPost(campaign.id, kind);
  const fileId = largestPhotoFileId(msg.photo);
  // Rasm izohsiz kelsa — faqat rasm yangilanadi, matn joyida qoladi.
  const html = msg.photo
    ? (msg.caption?.trim() ? entitiesToHtml(msg.caption, msg.caption_entities) : null)
    : entitiesToHtml(msg.text ?? '', msg.entities);

  if (fileId && post?.channelMessageId && !post.imageUrl) {
    await deps.reply(chatId, TYPE_CHANGED_ERROR);
    return;
  }
  const input = {
    text: html ?? post?.text ?? defaultPostText(kind, campaign),
    hasImage: Boolean(fileId || post?.imageUrl),
    buttonText: post?.buttonText ?? null,
    buttonUrl: post?.buttonUrl ?? null,
  };
  const issues = validatePost(kind, input, postSampleVars(campaign, deps.bot, null));
  if (issues.length) {
    const lines = issues.map((i) => `• ${i.line > 0 ? `${i.line}-qator: ` : ''}${i.message}`);
    await deps.reply(chatId, `❌ Saqlanmadi:\n${lines.join('\n')}\n\nTuzatib qayta yuboring yoki /cancel`);
    return;
  }

  await savePost(campaign, kind, post, { text: html ?? undefined, imageUrl: fileId ?? undefined });
  await db.systemSetting.deleteMany({ where: { key } });
  revalidateCampaigns();
  const notes = [`✅ Saqlandi: «${POST_KIND_CONFIG[kind].name}». Admin panelda «Yangilash» ni bosing.`];
  if (fileId) notes.push('🖼 Rasm yangilandi.');
  else if (post?.imageUrl) notes.push("🖼 Xabarda rasm yo'q — avvalgi rasm o'zgarmadi.");
  if (html === null) notes.push("📝 Rasm izohsiz keldi — matn o'zgarmadi.");
  await deps.reply(chatId, notes.join('\n'));
}
