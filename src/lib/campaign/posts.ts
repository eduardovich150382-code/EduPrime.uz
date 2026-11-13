import type { CampaignPostKind } from '@prisma/client';
import { telegramVisibleLength, validateTelegramHtml, type HtmlIssue } from '../telegram-html';
import { btn, type InlineButton } from '../telegram-buttons';
import { lineOf, rangeLabel } from './admin-rules';
import type { CampaignPhase } from './phase';
import type { BaseReward, RewardTier } from './rewards';
import { DEFAULT_CAMPAIGN_TEXTS, campaignText, renderTemplate, renderUrl, unknownVariables, type TemplateVars } from './texts';

// Kanal postlari (A4) — sof qoidalar. Route, cron, webhook capture va admin
// formasi shularni ishlatadi, shuning uchun "nima mumkin" bitta joyda. ATAYLAB
// db, format.ts va bot-settings yo'q: client komponent ham import qiladi.

export const POST_KINDS = ['SHARE', 'ANNOUNCE', 'LEADERBOARD', 'LAST_DAY', 'WINNERS'] as const satisfies readonly CampaignPostKind[];
export type PostKind = (typeof POST_KINDS)[number];

/** Admin panelida tahrirlanadigan turlar. */
export const EDITABLE_POST_KINDS = ['SHARE', 'ANNOUNCE', 'LEADERBOARD', 'LAST_DAY', 'WINNERS'] as const satisfies readonly PostKind[];
export type EditablePostKind = (typeof EDITABLE_POST_KINDS)[number];

export type PostKindConfig = {
  name: string;
  /** Kartochkadagi "qayerga va qachon" izohi. */
  where: string;
  /** Kanalga chiqarish (yangi yoki yangilash) mumkin bo'lgan bosqichlar; bo'sh — kanalga chiqmaydi. */
  publishPhases: CampaignPhase[];
  hasButton: boolean;
};

export const POST_KIND_CONFIG: Record<PostKind, PostKindConfig> = {
  SHARE: {
    name: 'Ulashiladigan post',
    where: "Kanalga chiqmaydi: bot har bir ishtirokchiga yuboradi, ular forward qiladi. {havola} — ishtirokchining shaxsiy havolasi.",
    publishPhases: [],
    hasButton: false,
  },
  ANNOUNCE: {
    name: "E'lon posti",
    where: "Kanal · aksiya e'lon qilingach: boshlanishidan oldin yoki faol paytda",
    publishPhases: ['UPCOMING', 'ACTIVE'],
    hasButton: true,
  },
  LEADERBOARD: {
    name: 'Reyting posti',
    where: "Kanal · kanalga chiqarilgandan keyin har kuni ~20:00 da o'zi yangilanadi.",
    publishPhases: ['ACTIVE', 'PAUSED', 'FINISHING'],
    hasButton: true,
  },
  LAST_DAY: {
    name: 'Oxirgi kun posti',
    where: "Kanal · saqlangan bo'lsa, tugashdan oldingi kechada cron uni kanalga o'zi chiqaradi.",
    publishPhases: ['ACTIVE'],
    hasButton: true,
  },
  // FINISHED faqat e'lon qilingan aksiyada — yakunlangan qoralamaning g'oliblari (adminlar) kanalga chiqmaydi.
  // Matn yakunlashdan oldin ham tahrirlanadi va «O'zimga sinov» bilan tekshiriladi.
  WINNERS: { name: "G'oliblar posti", where: 'Kanal · aksiya yakunlangandan keyin', publishPhases: ['FINISHED'], hasButton: true },
};

export type PostVariable = { name: string; hint: string };

const HINTS: Record<string, string> = {
  kanal: 'aksiya kanali',
  havola: 'ishtirokchining shaxsiy havolasi',
  tugash_vaqti: 'aksiya tugash vaqti',
  boshlanish_vaqti: 'aksiya boshlanish vaqti',
  kurs_nomi: 'kurs nomi (Sozlamalar)',
  kurs_narxi: "kurs narxi (yashirin bo'lsa qator o'chadi)",
  qatnashish_havolasi: 'botda aksiyaga qatnashish havolasi',
  mukofotlar: "mukofot pog'onalari ro'yxati",
  top10: "reytingning birinchi o'ntaligi (faqat ism)",
  ishtirokchilar_soni: "ishtirokchilar soni (0 bo'lsa qator o'chadi)",
  jami_referal: "jami yangi obunachilar (0 bo'lsa qator o'chadi)",
  goliblar: "mukofot olganlar ro'yxati (faqat ism)",
  kurs_admin: "kurs bo'yicha admin (Sozlamalar)",
  kurs_havola: 'kurs haqida havola (Sozlamalar)',
};

const vars = (...names: string[]): PostVariable[] => names.map((name) => ({ name, hint: HINTS[name] }));

/** Har tur o'z ro'yxati bilan: kanal postida shaxsiy qiymat (`{ism}`, `{havola}`) yo'q. */
export const POST_VARIABLES_BY_KIND: Record<PostKind, PostVariable[]> = {
  SHARE: vars('kanal', 'havola', 'tugash_vaqti', 'kurs_nomi', 'kurs_narxi'),
  ANNOUNCE: vars('kanal', 'qatnashish_havolasi', 'boshlanish_vaqti', 'tugash_vaqti', 'mukofotlar', 'kurs_nomi', 'kurs_narxi'),
  LEADERBOARD: vars('kanal', 'top10', 'ishtirokchilar_soni', 'jami_referal', 'tugash_vaqti', 'qatnashish_havolasi'),
  LAST_DAY: vars('kanal', 'top10', 'tugash_vaqti', 'mukofotlar', 'qatnashish_havolasi'),
  WINNERS: vars('kanal', 'goliblar', 'ishtirokchilar_soni', 'jami_referal', 'kurs_nomi', 'kurs_admin', 'kurs_havola'),
};

export const DEFAULT_POST_TEXTS: Record<PostKind, string> = {
  SHARE: DEFAULT_CAMPAIGN_TEXTS.share_post,

  ANNOUNCE: `🎁 <b>Aksiya: hamkasblaringizni taklif qiling — kursga chegirma yutib oling!</b>

{kanal} kanaliga hamkasblaringiz va do'stlaringizni taklif qiling. Shaxsiy havolangiz orqali obuna bo'lgan har bir yangi odam — <b>1 ball</b>.

🏆 <b>Mukofotlar — kursga chegirma:</b>
{mukofotlar}

📘 Kurs: {kurs_nomi}
💰 Kurs narxi: {kurs_narxi}
⏳ Aksiya: {boshlanish_vaqti} — {tugash_vaqti}

👇 Tugmani bosing va shaxsiy havolangizni oling.`,

  LEADERBOARD: `📊 <b>Aksiya reytingi</b>

{top10}

👥 Ishtirokchilar: {ishtirokchilar_soni}
➕ Yangi obunachilar: {jami_referal}
⏳ Tugash: {tugash_vaqti}

Hali ham qo'shilish mumkin 👇`,

  LAST_DAY: `⏰ <b>Aksiya tugashiga oz qoldi!</b>
Tugash: {tugash_vaqti}

Hozirgi peshqadamlar:
{top10}

Yana bir necha kishini taklif qilsangiz, o'rningiz o'zgarishi mumkin 👇`,

  WINNERS: `🏆 <b>Aksiya yakunlandi — g'oliblar!</b>

{goliblar}

👥 Ishtirokchilar: {ishtirokchilar_soni}
➕ Yangi obunachilar: {jami_referal}

🎟 G'oliblarga promokodlar botda yuborildi.
📘 Kursni olish uchun: {kurs_admin}

Qatnashgan hammaga rahmat! 🙌`,
};

export type PostButton = { text: string; url: string };

const PARTICIPATE_BUTTON: PostButton = { text: '🎁 Aksiyada qatnashish', url: '{qatnashish_havolasi}' };

/**
 * Tugma bo'sh qoldirilsa — turga qarab standart. Aksiya tugagach "qatnashish"
 * ma'nosiz, shuning uchun g'oliblar postida kurs haqidagi havola.
 */
export const DEFAULT_POST_BUTTONS: Record<PostKind, PostButton> = {
  SHARE: PARTICIPATE_BUTTON,
  ANNOUNCE: PARTICIPATE_BUTTON,
  LEADERBOARD: PARTICIPATE_BUTTON,
  LAST_DAY: PARTICIPATE_BUTTON,
  WINNERS: { text: '📘 Kurs haqida', url: '{kurs_havola}' },
};

/** Tugma havolasi o'rnida yoziladigan o'zgaruvchilar (render'dan keyin haqiqiy URL bo'ladi). */
export const BUTTON_URL_VARIABLES = ['{qatnashish_havolasi}', '{kurs_havola}'] as const;

/**
 * Yozuv bo'lmaganda ishlatiladigan matn. SHARE uchun — bot yozuvsiz aynan
 * yuboradigan `share_post` (Matnlar tabida o'zgartirilgan bo'lsa, o'shanisi).
 */
export function defaultPostText(kind: PostKind, campaign: { texts: unknown }): string {
  return kind === 'SHARE' ? campaignText(campaign, 'share_post') : DEFAULT_POST_TEXTS[kind];
}

/** Bo'sh yoki standartga teng matn — "standart". */
export function isDefaultPostText(kind: PostKind, campaign: { texts: unknown }, text: string): boolean {
  const trimmed = text.trim();
  return !trimmed || trimmed === defaultPostText(kind, campaign).trim();
}

/**
 * Yozuv saqlanadimi. Standart matnli yozuv odatda kerak emas, lekin rasm,
 * tugma yoki kanaldagi xabar bo'lsa o'chirilsa ular yo'qolardi. LAST_DAY
 * yozuvi esa "avtomatik chiqarishga rozilik" — standart matn bilan ham qoladi.
 */
export function keepsPostRecord(
  kind: PostKind,
  post: { textIsDefault: boolean; imageUrl: string | null; buttonText: string | null; channelMessageId: number | null; publishedAt: Date | null },
): boolean {
  if (kind === 'LAST_DAY') return true;
  return !post.textIsDefault || post.imageUrl !== null || post.buttonText !== null || post.channelMessageId !== null || post.publishedAt !== null;
}

export const CAPTION_LIMIT = 1024;
export const MESSAGE_LIMIT = 4096;

export function postLimit(hasImage: boolean): number {
  return hasImage ? CAPTION_LIMIT : MESSAGE_LIMIT;
}

// ── Formatlovchilar ─────────────────────────────────────────────────────

function tierMedal(t: RewardTier): string {
  if (t.fromRank === 1) return '🥇';
  return t.fromRank <= 3 ? '🥈' : '🏅';
}

/**
 * `{mukofotlar}` — har pog'ona alohida qatorda. Xom matn: escape
 * `renderTemplate` da (bu yerda qilinsa ikki marta escape bo'lardi).
 */
export function formatRewardsSummary(tiers: RewardTier[], base: BaseReward): string | null {
  const lines = [...tiers]
    .sort((a, b) => a.fromRank - b.fromRank)
    .map((t) => `${tierMedal(t)} ${rangeLabel(t)} — ${t.percent}%${t.minReferrals > 0 ? ` (kamida ${t.minReferrals} ta)` : ''}`);
  if (base.min !== null && base.pct !== null) lines.push(`✅ Kamida ${base.min} ta odam taklif qilgan har kim — ${base.pct}%`);
  return lines.length ? lines.join('\n') : null;
}

export type ChannelTopRow = { name: string | null; score: number };

const NAME_MAX = 20;
const MEDALS = ['🥇', '🥈', '🥉'];

/** Ism belgi bo'yicha qisqartiriladi (emoji yarmidan kesilmasin), qator buzilmasin deb bo'shliqlar bitta. */
function channelName(name: string | null): string {
  const clean = (name ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return 'Ishtirokchi';
  const chars = Array.from(clean);
  return chars.length > NAME_MAX ? `${chars.slice(0, NAME_MAX - 1).join('')}…` : clean;
}

function top10Lines(rows: ChannelTopRow[]): string[] {
  return rows.slice(0, 10).map((r, i) => `${MEDALS[i] ?? `${i + 1}.`} ${channelName(r.name)} — ${r.score}`);
}

/**
 * Kanal uchun `{top10}`: faqat ism, `@username` yo'q — ommaviy kanalda
 * username spam va maxfiylik muammosi. 0 balli ishtirokchilar chiqmaydi.
 * Xom matn (escape `renderTemplate` da). Bot matnlaridagi `top10` alohida.
 */
export function formatTop10ForChannel(rows: ChannelTopRow[]): string | null {
  const lines = top10Lines(rows.filter((r) => r.score > 0));
  return lines.length ? lines.join('\n') : null;
}

/** Uzunlik tekshiruvi uchun eng uzun holat: 10 qator, har birida 20 belgili ism. */
export const WORST_CASE_TOP10 = top10Lines(Array.from({ length: 10 }, () => ({ name: 'Ш'.repeat(NAME_MAX), score: 999 }))).join('\n');

/** `byTier` — o'rin pog'onasi bo'yicha mukofot; `false` — faqat "kamida N ta" (base) orqali. */
export type WinnerRow = { rank: number; name: string | null; score: number; percent: number; byTier: boolean };

export const WINNERS_MAX_LINES = 30;

/**
 * `{goliblar}`: o'rin pog'onasi bo'yicha yutganlar o'rni bilan (faqat ism,
 * `{top10}` kabi), ko'pi bilan 30 qator; faqat base orqali yutganlar bitta
 * umumiy qator — ular yuzlab bo'lishi mumkin, kanal postini ro'yxat bosmasin.
 * Xom matn (escape `renderTemplate` da). Hech kim yutmagan bo'lsa `null`.
 */
export function formatWinnersForChannel(rows: WinnerRow[]): string | null {
  const tier = rows.filter((r) => r.byTier && r.percent > 0).sort((a, b) => a.rank - b.rank);
  const base = rows.filter((r) => !r.byTier && r.percent > 0);
  const lines = tier.slice(0, WINNERS_MAX_LINES)
    .map((r) => `${MEDALS[r.rank - 1] ?? `${r.rank}.`} ${channelName(r.name)} — ${r.score} ball · ${r.percent}%`);
  if (tier.length > WINNERS_MAX_LINES) lines.push(`… va yana ${tier.length - WINNERS_MAX_LINES} kishi`);
  if (base.length) {
    const pct = Math.max(...base.map((r) => r.percent));
    lines.push(`✅ ${tier.length ? 'Yana ' : ''}${base.length} kishi — ${pct}% chegirma`);
  }
  return lines.length ? lines.join('\n') : null;
}

/** Uzunlik tekshiruvi uchun eng uzun holat: 30 qator × 20 belgili ism + base qatori. */
export const WORST_CASE_WINNERS = formatWinnersForChannel([
  ...Array.from({ length: WINNERS_MAX_LINES }, (_, i) => ({ rank: i + 1, name: 'Ш'.repeat(NAME_MAX), score: 999, percent: 100, byTier: true })),
  { rank: 999, name: null, score: 99, percent: 100, byTier: false },
]) as string;

// ── Validatsiya ─────────────────────────────────────────────────────────

export type PostInput = { text: string; hasImage: boolean; buttonText: string | null; buttonUrl: string | null };

const BUTTON_TEXT_MAX = 40;
const BUTTON_URL_RE = /^(?:https?|tg):\/\/\S+$/i;

export function buttonIssues(kind: PostKind, buttonText: string | null, buttonUrl: string | null): string[] {
  const text = buttonText?.trim() ?? '';
  const url = buttonUrl?.trim() ?? '';
  if (!text && !url) return [];
  if (!POST_KIND_CONFIG[kind].hasButton) return ["Bu postda tugma bo'lmaydi"];
  if (!text || !url) return ["Tugma: matn va havolani birga to'ldiring yoki ikkalasini ham bo'sh qoldiring"];
  const issues: string[] = [];
  if (Array.from(text).length > BUTTON_TEXT_MAX) issues.push(`Tugma matni ${BUTTON_TEXT_MAX} belgidan oshmasin`);
  if (!BUTTON_URL_RE.test(url) && !(BUTTON_URL_VARIABLES as readonly string[]).includes(url)) {
    issues.push(`Tugma havolasi https://, http://, tg:// bilan boshlansin yoki aynan ${BUTTON_URL_VARIABLES.join(' yoki ')} bo'lsin`);
  }
  return issues;
}

/**
 * Post tekshiruvi: turga xos o'zgaruvchilar, Telegram HTML, uzunlik va tugma.
 * Uzunlik A3 hisoblagichi bilan bir xil — render qilingan, teglarsiz matn;
 * `top10` va `goliblar` eng uzun holatda olinadi (reyting kun sayin o'sadi, cron tahriri
 * Telegram chegarasiga urilmasin). `line: 0` — qatorga bog'lanmagan xato.
 */
export function validatePost(kind: PostKind, input: PostInput, sampleVars: TemplateVars): HtmlIssue[] {
  const allowed = POST_VARIABLES_BY_KIND[kind].map((v) => v.name);
  const issues: HtmlIssue[] = [
    ...unknownVariables(input.text, allowed).map((name) => ({ line: lineOf(input.text, `{${name}}`), message: `Noma'lum o'zgaruvchi {${name}}` })),
    ...validateTelegramHtml(input.text),
  ].sort((a, b) => a.line - b.line);
  if (!input.text.trim() && !input.hasImage) issues.push({ line: 0, message: "Matn bo'sh" });
  const max = postLimit(input.hasImage);
  const length = telegramVisibleLength(renderTemplate(input.text, { ...sampleVars, top10: WORST_CASE_TOP10, goliblar: WORST_CASE_WINNERS }));
  if (length > max) {
    issues.push({ line: 0, message: `Matn juda uzun: ${length} / ${max} belgi${input.hasImage ? ' (rasm izohi)' : ''}` });
  }
  issues.push(...buttonIssues(kind, input.buttonText, input.buttonUrl).map((message) => ({ line: 0, message })));
  return issues;
}

// ── Xabar ───────────────────────────────────────────────────────────────

export type PostRecordLike = { text: string; imageUrl: string | null; buttonText: string | null; buttonUrl: string | null };
export type PostMessage = { text: string; photo: string | null; reply_markup?: { inline_keyboard: InlineButton[][] } };

/**
 * Telegram'ga ketadigan xabar. Tugma bo'sh bo'lsa standart tugma. Havola
 * render'dan keyin yaroqsiz chiqsa (masalan, bo'sh) tugmasiz — aks holda
 * Telegram butun xabarni rad etardi (bot-join.ts dagi qoida).
 */
export function buildPostMessage(kind: PostKind, post: PostRecordLike, vars: TemplateVars): PostMessage {
  const text = renderTemplate(post.text, vars);
  const message: PostMessage = { text, photo: post.imageUrl };
  if (!POST_KIND_CONFIG[kind].hasButton) return message;
  const custom = Boolean(post.buttonText?.trim() && post.buttonUrl?.trim());
  const fallback = DEFAULT_POST_BUTTONS[kind];
  const label = custom ? (post.buttonText as string).trim() : fallback.text;
  const url = renderUrl(custom ? (post.buttonUrl as string) : fallback.url, vars);
  if (BUTTON_URL_RE.test(url)) message.reply_markup = { inline_keyboard: [[btn.success(label, { url })]] };
  return message;
}

export function canPublishInPhase(kind: PostKind, phase: CampaignPhase): boolean {
  return POST_KIND_CONFIG[kind].publishPhases.includes(phase);
}

/** `https://t.me/<kanal>/<id>` — admin "Kanalda ochish" havolasi. */
export function channelPostUrl(channelUsername: string, messageId: number): string {
  return `https://t.me/${channelUsername.replace(/^@/, '')}/${messageId}`;
}
