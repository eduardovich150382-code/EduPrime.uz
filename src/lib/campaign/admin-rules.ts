import { z } from 'zod';
import { validateTelegramHtml, telegramVisibleLength, type HtmlIssue } from '../telegram-html';
import type { PhaseInput } from './phase';
import type { BaseReward, RewardTier } from './rewards';
import {
  CAMPAIGN_TEXT_KEYS, DEFAULT_CAMPAIGN_TEXTS, renderTemplate, unknownVariables, type CampaignTextKey, type TemplateVars,
} from './texts';

// Admin paneli qoidalari (A3) — sof funksiyalar: route ham, forma ham shularni
// ishlatadi, shuning uchun "nima mumkin" bitta joyda. ATAYLAB db/logger yo'q
// (rewards.ts dan faqat tur olinadi) — client komponent ham import qila oladi.

export type RuleResult = { ok: true } | { ok: false; error: string };
type CampaignState = PhaseInput;
export type CampaignRulesInput = CampaignState & {
  rewardTiers: unknown;
  baseRewardMin: number | null;
  baseRewardPct: number | null;
  texts: unknown;
};

const ok: RuleResult = { ok: true };
const fail = (error: string): RuleResult => ({ ok: false, error });

// Bot `getCurrentCampaign()` bilan eng so'nggi yakunlanmagan aksiyani oladi —
// ikkitasi bo'lsa qaysi biri "joriy" ekani chalkashadi.
export const CREATE_CONFLICT_ERROR = "Avvalgi aksiyani yakunlang yoki o'chiring";

export function canCreate(unfinalizedCount: number): RuleResult {
  return unfinalizedCount > 0 ? fail(CREATE_CONFLICT_ERROR) : ok;
}

/** Faqat hech qachon e'lon qilinmagan aksiya — cascade sinov ishtirokchilari va referallarini ham o'chiradi. */
export function canDelete(c: Pick<CampaignState, 'isPublished'>): RuleResult {
  return c.isPublished ? fail("Faqat qoralama aksiyani o'chirish mumkin. E'lon qilingan aksiyani pauza qiling.") : ok;
}

/** Referallar kanalga bog'langan: e'londan keyin kanal almashsa eski obunalar boshqa kanalniki bo'lib qolardi. */
export function canEditChannel(c: Pick<CampaignState, 'isPublished'>): RuleResult {
  return c.isPublished ? fail("Kanalni faqat qoralamada o'zgartirish mumkin: referallar shu kanalga bog'langan") : ok;
}

export function validateDates(startsAt: Date, endsAt: Date): RuleResult {
  return endsAt.getTime() > startsAt.getTime() ? ok : fail("Tugash vaqti boshlanishdan keyin bo'lishi kerak");
}

export const STARTS_AT_LOCKED_ERROR = "Aksiya boshlangan: faqat tugash sanasini o'zgartirish mumkin";

/** Boshlangan aksiyada ishtirokchilar e'lon qilingan boshlanishni ko'rgan — uni surish reytingni chalkashtiradi. */
export function isStartLocked(c: Pick<CampaignState, 'isPublished' | 'startsAt'>, now: Date): boolean {
  return c.isPublished && now.getTime() >= c.startsAt.getTime();
}

/**
 * Sana o'zgarishi. `endsInPast` — xato emas: admin aksiyani ataylab darhol
 * tugatishi mumkin, forma buni alohida tasdiqlatadi.
 */
export function validateDateChange(
  c: Pick<CampaignState, 'isPublished' | 'startsAt'>,
  next: { startsAt: Date; endsAt: Date },
  now: Date,
): { error: string | null; endsInPast: boolean } {
  const endsInPast = next.endsAt.getTime() <= now.getTime();
  if (isStartLocked(c, now) && next.startsAt.getTime() !== c.startsAt.getTime()) return { error: STARTS_AT_LOCKED_ERROR, endsInPast };
  const dates = validateDates(next.startsAt, next.endsAt);
  return { error: dates.ok ? null : dates.error, endsInPast };
}

// ── Mukofotlar ──────────────────────────────────────────────────────────

export const MAX_REWARD_TIERS = 10;

const isInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n);

/** Xatolar ro'yxati (bo'sh — to'g'ri). Pog'ona raqami 1 dan, admin jadvalidagi qator tartibida. */
export function validateRewards(tiers: RewardTier[], base: BaseReward): string[] {
  const errors: string[] = [];
  if (tiers.length > MAX_REWARD_TIERS) errors.push(`Ko'pi bilan ${MAX_REWARD_TIERS} ta pog'ona`);
  tiers.forEach((t, index) => {
    const row = `${index + 1}-pog'ona`;
    if (!isInt(t.fromRank) || t.fromRank < 1) errors.push(`${row}: "O'rindan" 1 yoki katta butun son bo'lsin`);
    if (!isInt(t.toRank) || t.toRank < t.fromRank) errors.push(`${row}: "O'ringacha" "O'rindan" dan kichik bo'lmasin`);
    if (!isInt(t.percent) || t.percent < 1 || t.percent > 100) errors.push(`${row}: chegirma 1–100% bo'lsin`);
    if (!isInt(t.minReferrals) || t.minReferrals < 0) errors.push(`${row}: "Kamida referal" 0 yoki katta butun son bo'lsin`);
  });
  const sorted = [...tiers].sort((a, b) => a.fromRank - b.fromRank);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (cur.fromRank <= prev.toRank) errors.push(`O'rinlar kesishadi: ${rangeLabel(prev)} va ${rangeLabel(cur)}`);
  }
  const hasMin = base.min !== null;
  const hasPct = base.pct !== null;
  if (hasMin !== hasPct) {
    errors.push("O'rindan qat'i nazar mukofot: ikkala maydonni ham to'ldiring yoki ikkalasini ham bo'sh qoldiring");
  } else if (hasMin && hasPct) {
    if (!isInt(base.min) || (base.min as number) < 1) errors.push("O'rindan qat'i nazar: kamida 1 ta referal bo'lsin");
    if (!isInt(base.pct) || (base.pct as number) < 1 || (base.pct as number) > 100) errors.push("O'rindan qat'i nazar: chegirma 1–100% bo'lsin");
  }
  return errors;
}

const tierShape = z.object({ fromRank: z.number(), toRank: z.number(), percent: z.number(), minReferrals: z.number() });

/** Bazadagi Json → pog'onalar (shakli noto'g'ri bo'lsa `null`). parseRewardTiers'dan farqi: jim `[]` emas — e'lon qilishni to'xtatadi. */
export function readRewardTiers(json: unknown): RewardTier[] | null {
  const parsed = z.array(tierShape).safeParse(json);
  return parsed.success ? parsed.data : null;
}

export function rangeLabel(t: Pick<RewardTier, 'fromRank' | 'toRank'>): string {
  return t.fromRank === t.toRank ? `${t.fromRank}-o'rin` : `${t.fromRank}–${t.toRank}-o'rin`;
}

/** "1-o'rin: 100% (kamida 10 ta) · 2–3-o'rin: 70% …" — formadagi jonli xulosa va e'lon oynasi. */
export function rewardSummary(tiers: RewardTier[], base: BaseReward): string {
  const parts = [...tiers]
    .sort((a, b) => a.fromRank - b.fromRank)
    .map((t) => `${rangeLabel(t)}: ${t.percent}%${t.minReferrals > 0 ? ` (kamida ${t.minReferrals} ta)` : ''}`);
  if (base.min !== null && base.pct !== null) parts.push(`o'rindan qat'i nazar: kamida ${base.min} ta → ${base.pct}%`);
  return parts.length ? parts.join(' · ') : "Mukofot yo'q";
}

/** Pog'onalar bo'yicha eng ko'p chegirma summasi (base ishtirokchilar soniga bog'liq — alohida izoh). */
export function maxDiscountSum(tiers: RewardTier[], price: number): number {
  return tiers.reduce((sum, t) => sum + (t.toRank - t.fromRank + 1) * price * t.percent / 100, 0);
}

// ── Matnlar ─────────────────────────────────────────────────────────────

/**
 * Telegram chegaralari: oddiy xabar 4096; `share_post` rasm caption'i bo'lib
 * chiqishi mumkin (1024); `not_subscribed_alert` — answerCallbackQuery
 * alerti, HTML'siz va 200 belgidan oshsa rad etiladi.
 */
export function textLimit(key: CampaignTextKey): { max: number; plain: boolean } {
  if (key === 'share_post') return { max: 1024, plain: false };
  if (key === 'not_subscribed_alert') return { max: 200, plain: true };
  return { max: 4096, plain: false };
}

export type TextCheck = { issues: HtmlIssue[]; length: number; max: number };

export function lineOf(text: string, needle: string): number {
  const at = text.indexOf(needle);
  return at === -1 ? 0 : text.slice(0, at).split('\n').length;
}

/**
 * Shablon tekshiruvi: noma'lum o'zgaruvchi, Telegram HTML va uzunlik.
 * HTML shablonning o'zida tekshiriladi (o'zgaruvchi qiymati render'da escape
 * bo'ladi); uzunlik — namunaviy qiymatlar bilan render qilingan, teglarsiz
 * matn bo'yicha. `line: 0` — qatorga bog'lanmagan xato.
 */
export function checkCampaignText(key: CampaignTextKey, text: string, sampleVars: TemplateVars): TextCheck {
  const issues: HtmlIssue[] = [
    ...unknownVariables(text).map((name) => ({ line: lineOf(text, `{${name}}`), message: `Noma'lum o'zgaruvchi {${name}}` })),
    ...validateTelegramHtml(text),
  ].sort((a, b) => a.line - b.line);
  const { max } = textLimit(key);
  const length = telegramVisibleLength(renderTemplate(text, sampleVars));
  if (length > max) issues.push({ line: 0, message: `Matn juda uzun: ${length} / ${max} belgi` });
  return { issues, length, max };
}

/** Bo'sh yoki standartga teng matn saqlanmaydi (`null` — kalit `texts` dan olib tashlanadi). */
export function normalizeTextOverride(key: CampaignTextKey, text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed === DEFAULT_CAMPAIGN_TEXTS[key].trim()) return null;
  return trimmed;
}

/** `Campaign.texts` dagi faqat ma'lum kalitli satrlar. */
export function storedTextOverrides(texts: unknown): Partial<Record<CampaignTextKey, string>> {
  const out: Partial<Record<CampaignTextKey, string>> = {};
  if (typeof texts !== 'object' || texts === null || Array.isArray(texts)) return out;
  for (const key of CAMPAIGN_TEXT_KEYS) {
    const value = (texts as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim()) out[key] = value;
  }
  return out;
}

// ── Holat o'tishlari ────────────────────────────────────────────────────

export type StatusAction = 'publish' | 'unpublish' | 'pause' | 'resume';
export const STATUS_ACTIONS: StatusAction[] = ['publish', 'unpublish', 'pause', 'resume'];

/** Faqat holat sharti (kanal, matn va mukofot tekshiruvi — `publishProblems` da). */
export function statusTransition(c: CampaignState, action: StatusAction, now: Date): RuleResult {
  if (c.finalizedAt) return fail('Aksiya yakunlangan');
  switch (action) {
    case 'publish':
      return c.isPublished ? fail("Aksiya allaqachon e'lon qilingan") : ok;
    case 'unpublish':
      if (!c.isPublished) return fail('Aksiya allaqachon qoralama');
      // Boshlangan aksiyada real ishtirokchilar bor — qoralamaga qaytsa ularning havolalari ishlamay qoladi.
      return now.getTime() < c.startsAt.getTime() ? ok : fail("Aksiya boshlangan: qoralamaga qaytarib bo'lmaydi, pauza qiling");
    case 'pause':
      if (!c.isPublished) return fail("Qoralamani pauza qilib bo'lmaydi");
      if (c.isPaused) return fail('Aksiya allaqachon pauzada');
      return now.getTime() < c.endsAt.getTime() ? ok : fail('Aksiya muddati tugagan');
    case 'resume':
      return c.isPaused ? ok : fail('Aksiya pauzada emas');
  }
}

/** E'lon qilishdan oldingi to'liq tekshiruv (kanaldagi bot huquqidan tashqari — u tarmoq so'rovi). */
export function publishProblems(c: CampaignRulesInput, now: Date, sampleVars: TemplateVars): string[] {
  const problems: string[] = [];
  const transition = statusTransition(c, 'publish', now);
  if (!transition.ok) return [transition.error];
  const dates = validateDates(c.startsAt, c.endsAt);
  if (!dates.ok) problems.push(dates.error);
  if (c.endsAt.getTime() <= now.getTime()) problems.push("Tugash vaqti o'tib ketgan");
  const tiers = readRewardTiers(c.rewardTiers);
  if (!tiers) problems.push("Mukofot pog'onalari buzilgan — Mukofotlar bo'limida qayta saqlang");
  else problems.push(...validateRewards(tiers, { min: c.baseRewardMin, pct: c.baseRewardPct }));
  for (const [key, text] of Object.entries(storedTextOverrides(c.texts)) as [CampaignTextKey, string][]) {
    if (checkCampaignText(key, text, sampleVars).issues.length) problems.push(`Matn xato: ${key}`);
  }
  return problems;
}
