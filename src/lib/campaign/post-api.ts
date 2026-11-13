import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '../db';
import type { BotSettings } from '../bot-settings';
import { campaignIdSchema, jsonError } from './admin-api';
import { campaignPhase } from './phase';
import { EDITABLE_POST_KINDS, POST_KIND_CONFIG, channelPostUrl, defaultPostText, type EditablePostKind } from './posts';
import { postSampleVars } from './post-vars';
import { loadPost } from './post-store';
import type { TelegramApi } from './post-telegram';
import { telegramApi } from './telegram';
import type { Campaign, CampaignPost } from './store';

// /api/admin/campaigns/[id]/posts/* route'larining umumiy qismi.

export const postKindSchema = z.enum(EDITABLE_POST_KINDS);

const buttonField = z.string().max(500).nullable().optional();

export const postDraftSchema = z.object({
  text: z.string().max(20_000).optional(),
  buttonText: buttonField,
  buttonUrl: buttonField,
});

export const publishSchema = z.object({
  mode: z.enum(['new', 'update']),
  pin: z.boolean().optional(),
  // `null` — yozuv hali yo'q (standart post): chiqarishda yaratiladi.
  expectedUpdatedAt: z.string().datetime().nullable(),
});

/** Bo'sh tugma maydoni — "standart tugma" (`null`). */
export function blankToNull(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  return value?.trim() ? value.trim() : null;
}

export type PostRouteContext = { params: Promise<{ id: string; kind: string }> };
export type PostTarget = { campaign: Campaign; kind: EditablePostKind; post: CampaignPost | null };

/** Aksiya + tur + joriy yozuv; topilmasa tayyor 404 javobi. */
export async function loadPostTarget(context: PostRouteContext): Promise<PostTarget | NextResponse> {
  const params = await context.params;
  const id = campaignIdSchema.safeParse(params.id);
  const kind = postKindSchema.safeParse(params.kind);
  if (!id.success || !kind.success) return jsonError(404, 'Post topilmadi');
  const campaign = await db.campaign.findUnique({ where: { id: id.data } });
  if (!campaign) return jsonError(404, 'Aksiya topilmadi');
  return { campaign, kind: kind.data, post: await loadPost(campaign.id, kind.data) };
}

export const FINALIZED_ERROR = "Aksiya yakunlangan — postni o'zgartirib bo'lmaydi";

/**
 * Yakunlangan aksiyada postlar muzlaydi — G'oliblar postidan tashqari: u
 * aynan yakunlangandan keyin tahrirlanadi va kanalga chiqariladi. `null` — mumkin.
 */
export function postLockedError(campaign: Pick<Campaign, 'finalizedAt'>, kind: EditablePostKind): string | null {
  return campaign.finalizedAt && kind !== 'WINNERS' ? FINALIZED_ERROR : null;
}
export const CONFLICT_ERROR = "Post boshqa oynada o'zgargan, sahifani yangilang";

export function botToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN || null;
}

export function routeApi(token: string): TelegramApi {
  return (method, body) => telegramApi(token, method, body);
}

export async function adminTelegram(userId: string): Promise<{ telegramId: string | null; name: string | null } | null> {
  return db.user.findUnique({ where: { id: userId }, select: { telegramId: true, name: true } });
}

export function postView(campaign: Campaign, kind: EditablePostKind, post: CampaignPost | null) {
  const defaultText = defaultPostText(kind, campaign);
  return {
    kind,
    name: POST_KIND_CONFIG[kind].name,
    text: post?.text ?? defaultText,
    isDefault: post === null,
    defaultText,
    hasImage: Boolean(post?.imageUrl),
    buttonText: post?.buttonText ?? null,
    buttonUrl: post?.buttonUrl ?? null,
    publishedAt: post?.publishedAt?.toISOString() ?? null,
    channelMessageId: post?.channelMessageId ?? null,
    channelUrl: post?.channelMessageId ? channelPostUrl(campaign.channelUsername, post.channelMessageId) : null,
    updatedAt: post?.updatedAt.toISOString() ?? null,
  };
}

export type PostView = ReturnType<typeof postView>;

/** GET .../posts javobi — kartochkalar, muharrir va oldindan ko'rish uchun. */
export function postsDetail(campaign: Campaign, posts: Map<string, CampaignPost>, bot: BotSettings, adminName: string | null | undefined, now: Date) {
  return {
    phase: campaignPhase(campaign, now),
    channelUsername: campaign.channelUsername,
    posts: EDITABLE_POST_KINDS.map((kind) => postView(campaign, kind, posts.get(kind) ?? null)),
    sampleVars: postSampleVars(campaign, bot, adminName),
  };
}

export type PostsDetail = ReturnType<typeof postsDetail>;
