import type { CampaignReferralStatus, Prisma } from '@prisma/client';
import { db } from '../db';
import { logger } from '../logger';
import { membershipFromReply, type Membership } from '../telegram-channel-gate';
import { recheckTransition } from './finalize-rules';
import type { Campaign } from './store';
import type { TelegramResult } from './telegram';

// Aksiya tugagach har referalni kanalda qayta tekshirish (A5): qoidalarda
// "aksiya oxirida kanaldan chiqib ketganlar hisobdan olib tashlanadi". Bitta
// chaqiruv 45 s ishlaydi; admin sahifasi `remaining = 0` bo'lguncha qayta
// chaqiradi. Kursor yo'q — `checkedAt >= endsAt` ning o'zi "tekshirildi"
// belgisi, shuning uchun takror chaqirish (ikki oyna) xavfsiz: ba'zi yozuvlar
// ikki marta tekshiriladi, xolos.

const CHECK_INTERVAL_MS = 40; // ≤ 25 so'rov/s — Telegram chegarasidan pastda
const TIME_BUDGET_MS = 45_000; // maxDuration = 60 s
const BATCH = 100;

export const RECHECK_UNKNOWN_ERROR = 'Telegram javob bermadi yoki bot kanalda admin emas';

/** Tekshirilmagan referallar: INVALID — admin qarori, kanal holati unga ta'sir qilmaydi. */
export function uncheckedReferralWhere(campaign: Pick<Campaign, 'id' | 'endsAt'>): Prisma.CampaignReferralWhereInput {
  return {
    campaignId: campaign.id,
    status: { in: ['ACTIVE', 'LEFT', 'PENDING'] },
    OR: [{ checkedAt: null }, { checkedAt: { lt: campaign.endsAt } }],
  };
}

export function countUnchecked(campaign: Pick<Campaign, 'id' | 'endsAt'>): Promise<number> {
  return db.campaignReferral.count({ where: uncheckedReferralWhere(campaign) });
}

export type RecheckDeps = {
  /** getChatMember — xom javob: `checkChannelMembership` 429 ni `unknown` ga aylantirib, `retry_after` ni yashiradi. */
  getChatMember(userId: string): Promise<TelegramResult>;
  sleep(ms: number): Promise<void>;
  now(): Date;
};

export type RecheckResult = {
  checked: number; becameLeft: number; becameActive: number;
  /** O'chirilgan (yoki Telegram tanimaydigan) akkauntlar — kanalda yo'q, chiqib ketgan hisoblanadi. */
  deletedAccounts: number;
  remaining: number;
  error?: string;
};

// Foydalanuvchiga tegishli 400 xatolari: akkaunt o'chirilgan yoki ID yaroqsiz.
// Bunday odam kanalda yo'q — `unknown` deb to'xtash qolgan hamma referalni
// abadiy tekshirilmay qoldirardi (keyingi chaqiruv yana shu yozuvga uriladi).
// Kanal darajasidagi xatolar (403, "chat not found", huquq yo'q, 5xx, tarmoq)
// esa `unknown` qoladi: ular hamma referalga tegishli, tekshiruv to'xtashi kerak.
const DELETED_ACCOUNT_RE = /user not found|participant_id_invalid|user_id_invalid/i;

export function isDeletedAccountReply(reply: TelegramResult): boolean {
  return !reply.ok && reply.error_code === 400 && DELETED_ACCOUNT_RE.test(reply.description ?? '');
}

/**
 * 429 bo'lsa `retry_after` qadar kutib bir marta qayta; yana xato — `unknown`.
 * `membershipFromReply` ga tegilmaydi: majburiy kanal gate'i uni ishlatadi va
 * u yerda tushunarsiz javob "o'tkazib yuborish" degani.
 */
async function membershipOf(deps: RecheckDeps, userId: string): Promise<{ membership: Membership; deleted: boolean }> {
  let reply = await deps.getChatMember(userId);
  if (!reply.ok && reply.error_code === 429) {
    await deps.sleep((reply.parameters?.retry_after ?? 1) * 1000);
    reply = await deps.getChatMember(userId);
  }
  if (isDeletedAccountReply(reply)) return { membership: 'not_member', deleted: true };
  return { membership: membershipFromReply(reply), deleted: false };
}

export async function runRecheck(campaign: Campaign, deps: RecheckDeps): Promise<RecheckResult> {
  const startedAt = deps.now().getTime();
  const result: RecheckResult = { checked: 0, becameLeft: 0, becameActive: 0, deletedAccounts: 0, remaining: 0 };
  const where = uncheckedReferralWhere(campaign);
  let afterId: string | null = null;
  let first = true;

  outer: while (true) {
    const batch: { id: string; status: CampaignReferralStatus; referredTelegramId: bigint }[] = await db.campaignReferral.findMany({
      where: afterId ? { AND: [where, { id: { gt: afterId } }] } : where,
      orderBy: { id: 'asc' },
      take: BATCH,
      select: { id: true, status: true, referredTelegramId: true },
    });
    if (!batch.length) break;
    for (const ref of batch) {
      if (deps.now().getTime() - startedAt > TIME_BUDGET_MS) break outer;
      if (!first) await deps.sleep(CHECK_INTERVAL_MS);
      first = false;
      const { membership, deleted } = await membershipOf(deps, ref.referredTelegramId.toString());
      const change = recheckTransition(ref.status, membership, campaign.endsAt, deps.now());
      if (!change) {
        // Yozuv o'zgarmaydi — keyingi chaqiruv aynan shundan davom etadi.
        result.error = RECHECK_UNKNOWN_ERROR;
        break outer;
      }
      // Eski holat sharti: shu orada admin yaroqsiz qilgan bo'lsa ustidan yozilmaydi;
      // aksiya yakunlangan bo'lsa ham — promokodlar berilgan, referallar muzlaydi.
      const updated = await db.campaignReferral.updateMany({
        where: { id: ref.id, status: ref.status, campaign: { finalizedAt: null } },
        data: change,
      });
      result.checked++;
      if (deleted) result.deletedAccounts++;
      if (updated.count === 1) {
        if (ref.status === 'ACTIVE' && change.status === 'LEFT') result.becameLeft++;
        if (ref.status !== 'ACTIVE' && change.status === 'ACTIVE') result.becameActive++;
      }
    }
    afterId = batch[batch.length - 1].id;
  }

  result.remaining = await countUnchecked(campaign);
  logger.info('Campaign recheck batch', { campaignId: campaign.id, ...result });
  return result;
}
