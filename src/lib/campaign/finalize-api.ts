import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '../db';
import { campaignIdSchema, jsonError } from './admin-api';
import { FINALIZED_ERROR, NOT_ENDED_ERROR, hasEnded } from './finalize-rules';
import { USED_NOTE_MAX } from './promo-admin';
import type { Campaign } from './store';

// A5 route'larining umumiy qismi: parametrlar, kirish sxemalari va holat tekshiruvlari.

export type IdContext = { params: Promise<{ id: string }> };

/** `[id]` dagi aksiya; topilmasa tayyor 404. */
export async function loadCampaignParam(context: { params: Promise<{ id: string }> }): Promise<Campaign | NextResponse> {
  const id = campaignIdSchema.safeParse((await context.params).id);
  const campaign = id.success ? await db.campaign.findUnique({ where: { id: id.data } }) : null;
  return campaign ?? jsonError(404, 'Aksiya topilmadi');
}

/** Qo'shimcha parametr (`pid`, `rid`, `codeId`) — `campaignIdSchema` bilan bir xil shakl. */
export function paramId(value: string | undefined): string | null {
  const parsed = campaignIdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Yakunlangan aksiyada referallar muzlaydi — promokodlar ular bo'yicha berilgan. */
export function frozenError(campaign: Campaign): NextResponse | null {
  return campaign.finalizedAt ? jsonError(409, FINALIZED_ERROR) : null;
}

/** Qayta tekshiruv va yakunlash: faqat tugagan va yakunlanmagan aksiyada. */
export function endedError(campaign: Campaign, now: Date): NextResponse | null {
  if (campaign.finalizedAt) return jsonError(409, FINALIZED_ERROR);
  return hasEnded(campaign, now) ? null : jsonError(400, NOT_ENDED_ERROR);
}

export const referralPatchSchema = z.object({ status: z.enum(['INVALID', 'RESTORE']) });
export const finalizeSchema = z.object({ skipRecheck: z.boolean().optional() });
export const promoPatchSchema = z.object({ used: z.boolean(), note: z.string().trim().max(USED_NOTE_MAX).optional() });
