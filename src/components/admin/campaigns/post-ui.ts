import type { PostView } from '@/lib/campaign/post-api';
import type { EditablePostKind } from '@/lib/campaign/posts';
import { utcToTashkentLocal } from '@/lib/date';
import { formatLocal } from './labels';

// "Postlar" tabi komponentlarining umumiy kichik yordamchilari.

/** Admin rasm proxy'si; `v` — keshni yozuv o'zgarganda yangilash uchun. */
export function postImageUrl(campaignId: string, kind: EditablePostKind, version: string | null): string {
  return `/api/admin/campaigns/${campaignId}/posts/${kind}/image?v=${encodeURIComponent(version ?? '')}`;
}

export function formatPublished(iso: string): string {
  return formatLocal(utcToTashkentLocal(new Date(iso)));
}

/** LAST_DAY: yozuv borligi — cron uchun rozilik. */
export function autoPublishLabel(post: PostView): string | null {
  if (post.kind !== 'LAST_DAY' || post.publishedAt) return null;
  return post.isDefault ? 'Avtomatik chiqmaydi (saqlanmagan)' : 'Avtomatik chiqadi';
}

export type PostApiResult = { post?: PostView; warning?: string };
