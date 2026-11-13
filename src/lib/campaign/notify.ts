import type { Prisma, PromoCode } from '@prisma/client';
import { db } from '../db';
import { logger } from '../logger';
import { hasPrismaCode } from '../admin-products-api';
import type { BotSettings } from '../bot-settings';
import { sendWithRetry } from './daily';
import { campaignVars, formatCampaignDate } from './format';
import { notifyKey } from './internal-keys';
import { INITIAL_NOTIFY_CURSOR, parseNotifyCursor, type NotifyCursor } from './notify-cursor';
import { campaignRewardRules, standingOf, type Standing } from './rewards';
import { campaignText, renderTemplate } from './texts';
import { loadRanking, type Campaign, type CampaignParticipant } from './store';
import type { TelegramResult } from './telegram';

// Yakunlangandan keyin har ishtirokchiga shaxsiy xabar (A5): promokodi
// bo'lsa `winner`, bo'lmasa `no_prize`. Bitta chaqiruv 45 s; admin sahifasi
// `remaining = 0` bo'lguncha qayta chaqiradi. Kursor har yuborishdan OLDIN
// shartli (CAS) suriladi: ikki oyna bir vaqtda yubormaydi (ikkinchisi 409),
// yiqilish ko'pi bilan bitta xabarni yo'qotadi, hech kimga ikki marta ketmaydi.

const SEND_INTERVAL_MS = 40;
const TIME_BUDGET_MS = 45_000;
const PAGE = 1500; // 45 s / 40 ms ≈ 1100 — bitta chaqiruvga yetadi

export const NOTIFY_BUSY_ERROR = 'Xabarlar boshqa oynada yuborilmoqda';

type PromoLike = Pick<PromoCode, 'code' | 'percent' | 'validUntil'>;

/** `winner` matni — yakuniy yuborish va "Qayta yuborish" bir xil. Foiz promokoddan (u yozilgan qiymat). */
export function winnerText(campaign: Campaign, bot: BotSettings, participant: Pick<CampaignParticipant, 'firstName'>, promo: PromoLike, standing: Standing | null): string {
  const final: Standing = { ...(standing ?? { activeCount: 0, rank: 0, next: null }), percent: promo.percent };
  return renderTemplate(campaignText(campaign, 'winner'), {
    ...campaignVars({ campaign, bot, firstName: participant.firstName, standing: final }),
    promokod: promo.code,
    muddat: formatCampaignDate(promo.validUntil),
  });
}

export function noPrizeText(campaign: Campaign, bot: BotSettings, participant: Pick<CampaignParticipant, 'firstName'>, standing: Standing | null): string {
  return renderTemplate(campaignText(campaign, 'no_prize'), campaignVars({ campaign, bot, firstName: participant.firstName, standing }));
}

const afterWhere = (campaignId: string, lastId: string | null): Prisma.CampaignParticipantWhereInput => (
  lastId ? { campaignId, id: { gt: lastId } } : { campaignId }
);

/** Kursor yozuvi: yo'q bo'lsa boshlang'ich holat bilan yaratiladi (parallel yaratish — P2002, qayta o'qiladi). */
async function loadCursorRow(campaignId: string): Promise<string> {
  const key = notifyKey(campaignId);
  const row = await db.systemSetting.findUnique({ where: { key } });
  if (row) return row.value;
  const value = JSON.stringify(INITIAL_NOTIFY_CURSOR);
  try {
    await db.systemSetting.create({ data: { key, value } });
    return value;
  } catch (error) {
    if (!hasPrismaCode(error, 'P2002')) throw error;
    const again = await db.systemSetting.findUnique({ where: { key } });
    return again?.value ?? value;
  }
}

export type NotifyStatus = { started: boolean; sent: number; failed: number; done: boolean; remaining: number };

export async function notifyStatus(campaign: Campaign): Promise<NotifyStatus> {
  const row = await db.systemSetting.findUnique({ where: { key: notifyKey(campaign.id) } });
  const cursor = (row && parseNotifyCursor(row.value)) || INITIAL_NOTIFY_CURSOR;
  const remaining = cursor.done ? 0 : await db.campaignParticipant.count({ where: afterWhere(campaign.id, cursor.lastParticipantId) });
  return { started: cursor.lastParticipantId !== null, sent: cursor.sent, failed: cursor.failed, done: cursor.done, remaining };
}

export type NotifyDeps = {
  bot: BotSettings;
  send(chatId: string, text: string): Promise<TelegramResult>;
  sleep(ms: number): Promise<void>;
  now(): Date;
};

export type NotifyResult = { ok: true; sent: number; failed: number; remaining: number } | { ok: false; status: 409; error: string };

async function casCursor(campaignId: string, from: string, to: NotifyCursor): Promise<string | null> {
  const value = JSON.stringify(to);
  const updated = await db.systemSetting.updateMany({ where: { key: notifyKey(campaignId), value: from }, data: { value } });
  return updated.count === 1 ? value : null;
}

export async function runFinalizeNotify(campaign: Campaign, deps: NotifyDeps): Promise<NotifyResult> {
  const startedAt = deps.now().getTime();
  let raw = await loadCursorRow(campaign.id);
  let cursor = parseNotifyCursor(raw) ?? INITIAL_NOTIFY_CURSOR;
  if (cursor.done) return { ok: true, sent: cursor.sent, failed: cursor.failed, remaining: 0 };

  const [loaded, promos, participants] = await Promise.all([
    loadRanking(campaign.id),
    db.promoCode.findMany({ where: { campaignId: campaign.id } }),
    db.campaignParticipant.findMany({ where: afterWhere(campaign.id, cursor.lastParticipantId), orderBy: { id: 'asc' }, take: PAGE }),
  ]);
  if (!loaded) throw new Error('Campaign ranking failed to load');
  const rules = campaignRewardRules(campaign);
  const promoByTelegram = new Map(promos.map((p) => [p.telegramId.toString(), p]));

  let claimed = false;
  for (const participant of participants) {
    if (deps.now().getTime() - startedAt > TIME_BUDGET_MS) break;
    const next = await casCursor(campaign.id, raw, { ...cursor, lastParticipantId: participant.id });
    if (next === null) {
      if (!claimed) return { ok: false, status: 409, error: NOTIFY_BUSY_ERROR };
      break; // boshqa oyna davom ettirmoqda
    }
    if (claimed) await deps.sleep(SEND_INTERVAL_MS);
    claimed = true;
    raw = next;
    cursor = { ...cursor, lastParticipantId: participant.id };

    const standing = standingOf(loaded.ranking, participant.id, rules);
    const promo = promoByTelegram.get(participant.telegramId.toString());
    const text = promo ? winnerText(campaign, deps.bot, participant, promo, standing) : noPrizeText(campaign, deps.bot, participant, standing);
    // 403 (botni bloklagan) va boshqa xatolar — `failed`, keyingisiga o'tiladi.
    if (await sendWithRetry(deps, participant.telegramId.toString(), text)) cursor = { ...cursor, sent: cursor.sent + 1 };
    else cursor = { ...cursor, failed: cursor.failed + 1 };
  }

  const remaining = await db.campaignParticipant.count({ where: afterWhere(campaign.id, cursor.lastParticipantId) });
  const final = { ...cursor, done: remaining === 0 };
  if (claimed || final.done) {
    // Shu orada boshqa oyna kursorni olgan bo'lsa — uning yozuvi ustun (hisoblagichlar uniki).
    await casCursor(campaign.id, raw, final);
  }
  logger.info('Campaign finalize notify batch', { campaignId: campaign.id, sent: final.sent, failed: final.failed, remaining });
  return { ok: true, sent: final.sent, failed: final.failed, remaining };
}
