import { db } from '../db';
import { defaultPostText, isDefaultPostText, keepsPostRecord, type PostKind } from './posts';
import type { Campaign, CampaignPost } from './store';

// Kanal postlarining db qatlami (A4). Admin route'lari uchun — xato yutilmaydi
// (route 500 qaytarsin). Cron chaqirganda xatoni o'zi ushlaydi.

/**
 * Har tur uchun bitta yozuv kutiladi; parallel saqlashda ikkita paydo bo'lsa
 * ham eng so'nggisi olinadi — bot (`loadSharePost`) ham aynan shunday tanlaydi.
 */
export function loadPost(campaignId: string, kind: PostKind): Promise<CampaignPost | null> {
  return db.campaignPost.findFirst({ where: { campaignId, kind }, orderBy: { updatedAt: 'desc' } });
}

export async function loadPosts(campaignId: string): Promise<Map<PostKind, CampaignPost>> {
  const rows = await db.campaignPost.findMany({ where: { campaignId }, orderBy: { updatedAt: 'desc' } });
  const byKind = new Map<PostKind, CampaignPost>();
  for (const row of rows) if (!byKind.has(row.kind)) byKind.set(row.kind, row);
  return byKind;
}

export type PostChanges = { text?: string; imageUrl?: string | null; buttonText?: string | null; buttonUrl?: string | null };

/**
 * Upsert. Standart matnli va boshqa hech narsasi yo'q yozuv o'chiriladi —
 * post "Standart" holatiga qaytadi (LAST_DAY bundan mustasno, posts.ts).
 * Qaytadi: saqlangan yozuv yoki `null` (yozuv yo'q).
 */
export async function savePost(
  campaign: Pick<Campaign, 'id' | 'texts'>, kind: PostKind, existing: CampaignPost | null, changes: PostChanges,
): Promise<CampaignPost | null> {
  const rawText = changes.text ?? existing?.text ?? '';
  const textIsDefault = isDefaultPostText(kind, campaign, rawText);
  const data = {
    text: textIsDefault ? defaultPostText(kind, campaign) : rawText.trim(),
    imageUrl: changes.imageUrl !== undefined ? changes.imageUrl : existing?.imageUrl ?? null,
    buttonText: changes.buttonText !== undefined ? changes.buttonText : existing?.buttonText ?? null,
    buttonUrl: changes.buttonUrl !== undefined ? changes.buttonUrl : existing?.buttonUrl ?? null,
  };
  const keep = keepsPostRecord(kind, {
    textIsDefault, imageUrl: data.imageUrl, buttonText: data.buttonText,
    channelMessageId: existing?.channelMessageId ?? null, publishedAt: existing?.publishedAt ?? null,
  });
  if (!keep) {
    if (existing) await db.campaignPost.deleteMany({ where: { id: existing.id } });
    return null;
  }
  if (existing) return db.campaignPost.update({ where: { id: existing.id }, data });
  return db.campaignPost.create({ data: { campaignId: campaign.id, kind, ...data } });
}

/** Standart postni kanalga chiqarish: qulf uchun yozuv (id + updatedAt) kerak — standart matn bilan yaratiladi. */
export function createDefaultPost(campaign: Pick<Campaign, 'id' | 'texts'>, kind: PostKind): Promise<CampaignPost> {
  return db.campaignPost.create({ data: { campaignId: campaign.id, kind, text: defaultPostText(kind, campaign) } });
}

export async function deletePostRecord(id: string): Promise<void> {
  await db.campaignPost.deleteMany({ where: { id } });
}

/** LAST_DAY "avtomatik chiqarishni bekor qilish": faqat kanalga chiqmagan yozuv o'chadi. */
export async function deleteUnpublishedPost(id: string): Promise<boolean> {
  const deleted = await db.campaignPost.deleteMany({ where: { id, publishedAt: null, channelMessageId: null } });
  return deleted.count === 1;
}

/**
 * Optimistik qulf: post boshqa oynada o'zgarmagan bo'lsa `publishedAt` band
 * qilinadi. Ikki oynadan bir vaqtda "Chiqarish" bosilsa faqat bittasi o'tadi
 * (yozuv `updatedAt` ni yangilaydi — ikkinchisining kutgani endi eski).
 */
export async function claimPublish(id: string, expectedUpdatedAt: Date, now: Date): Promise<boolean> {
  const updated = await db.campaignPost.updateMany({ where: { id, updatedAt: expectedUpdatedAt }, data: { publishedAt: now } });
  return updated.count === 1;
}

/** Cron (LAST_DAY): hali chiqmagan bo'lsa band qilinadi — cron ikki marta chaqirilsa ham bir marta chiqadi. */
export async function claimAutoPublish(id: string, now: Date): Promise<boolean> {
  const updated = await db.campaignPost.updateMany({ where: { id, publishedAt: null }, data: { publishedAt: now } });
  return updated.count === 1;
}

/** Telegram rad etdi — band qilingan `publishedAt` eski qiymatiga qaytadi. */
export async function revertPublish(id: string, previous: Date | null): Promise<void> {
  await db.campaignPost.updateMany({ where: { id }, data: { publishedAt: previous } });
}

export function setChannelMessage(id: string, channelMessageId: number): Promise<CampaignPost> {
  return db.campaignPost.update({ where: { id }, data: { channelMessageId } });
}

/** Kanaldagi xabar yo'q (o'chirilgan yoki topilmadi). `messageId` — shu orada boshqa xabar yozilgan bo'lsa tegmaslik uchun. */
export async function clearChannelMessage(id: string, messageId: number, alsoPublishedAt: boolean): Promise<void> {
  await db.campaignPost.updateMany({
    where: { id, channelMessageId: messageId },
    data: alsoPublishedAt ? { channelMessageId: null, publishedAt: null } : { channelMessageId: null },
  });
}
