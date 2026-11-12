import { escapeHtml } from '../html-escape';

// Aksiya matnlari: admin `Campaign.texts` da kalit bo'yicha o'z matnini
// yozadi (A3), yozilmagan kalit uchun shu standartlar. Matn — Telegram HTML,
// uni admin yozadi, shuning uchun shablonning o'zi escape qilinmaydi; faqat
// o'zgaruvchi qiymatlari (masalan, foydalanuvchi ismi) escape qilinadi.

export const CAMPAIGN_TEXT_KEYS = [
  'join_welcome', 'share_post', 'rules', 'already_member', 'referral_prompt', 'not_subscribed_alert',
  'invite_new', 'point_added', 'my_result', 'daily_result', 'last_day', 'not_active', 'winner', 'no_prize',
] as const;

export type CampaignTextKey = (typeof CAMPAIGN_TEXT_KEYS)[number];

export const CAMPAIGN_VARIABLES = [
  'ism', 'havola', 'ball', 'orin', 'foiz', 'keyingi_pogona', 'qolgan', 'promokod', 'muddat', 'tugash_vaqti',
  'kanal', 'kurs_nomi', 'kurs_narxi', 'chegirmali_narx', 'kurs_admin', 'kurs_havola', 'top10',
] as const;

export type CampaignVariable = (typeof CAMPAIGN_VARIABLES)[number];
export type CampaignVars = Partial<Record<CampaignVariable, string | null>>;
/** `undefined` — noma'lum (o'zgarmaydi), `null` — qator o'chadi. */
export type TemplateVars = Record<string, string | null | undefined>;

export const DEFAULT_CAMPAIGN_TEXTS: Record<CampaignTextKey, string> = {
  join_welcome: `🎁 <b>{kanal} aksiyasiga xush kelibsiz, {ism}!</b>

Sizning shaxsiy havolangiz:
{havola}

Havolani hamkasblaringiz va do'stlaringizga yuboring. Kanalga shu havola orqali obuna bo'lgan har bir yangi odam sizga <b>1 ball</b> beradi.

🏆 Eng ko'p ball to'plaganlar {kurs_nomi} kursiga <b>100% gacha</b> chegirma oladi.
⏳ Aksiya tugashi: {tugash_vaqti}`,

  share_post: `📚 <b>Fizika o'qituvchilari, attestatsiyaga tayyorlanyapsizmi?</b>

{kanal} — attestatsiya testlari, batafsil yechimlar va foydali maslahatlar bir joyda.

👉 Obuna bo'lish: {havola}`,

  rules: `📋 <b>Aksiya qoidalari</b>

1. Faqat havolangiz orqali kanalga <b>yangi</b> obuna bo'lganlar hisoblanadi.
2. Har bir odam faqat bir marta hisoblanadi.
3. Aksiya oxirida kanaldan chiqib ketganlar hisobdan olib tashlanadi.
4. Soxta akkauntlar orqali to'plangan ballar bekor qilinadi.
5. Begona guruhlarga ommaviy spam qilmang — Telegram akkauntingizni cheklashi mumkin.

⏳ Aksiya tugashi: {tugash_vaqti}`,

  already_member: `ℹ️ Siz {kanal} kanaliga allaqachon obuna bo'lgansiz, shuning uchun bu havola ball bermaydi.

O'zingiz ham aksiyada qatnashib, kursga chegirma yutib olishingiz mumkin 👇`,

  referral_prompt: `👋 Assalomu alaykum, {ism}!

Sizni {kanal} kanaliga taklif qilishdi — fizika o'qituvchilari uchun attestatsiyaga tayyorlov kanali.

1️⃣ Kanalga obuna bo'ling
2️⃣ «✅ Obuna bo'ldim» tugmasini bosing 👇`,

  not_subscribed_alert: `❗ Siz hali {kanal} kanaliga obuna bo'lmagansiz. Avval obuna bo'ling, so'ng tugmani qayta bosing.`,

  invite_new: `✅ Obuna tasdiqlandi, rahmat!

🎁 Siz ham aksiyada qatnashing: hamkasblaringizni taklif qiling va kursga chegirma yutib oling.`,

  point_added: `🎉 <b>+1 ball!</b> Havolangiz orqali yangi obunachi qo'shildi.

Jami: <b>{ball}</b> ball · O'rningiz: <b>{orin}</b>
📈 {keyingi_pogona} chegirmagacha yana {qolgan} ta odam`,

  my_result: `📊 <b>Natijangiz</b>

Ball: <b>{ball}</b>
O'rin: <b>{orin}</b>
🎟 Hozirgi chegirma: <b>{foiz}</b>
📈 {keyingi_pogona} chegirmagacha yana {qolgan} ta odam

🔗 Havolangiz: {havola}
⏳ Tugash: {tugash_vaqti}`,

  daily_result: `🌙 Bugungi natijangiz: <b>{ball}</b> ball, <b>{orin}</b>-o'rin.
📈 {keyingi_pogona} chegirmagacha yana {qolgan} ta odam.

Havolangizni yana bir guruhga yuboring 👇
{havola}`,

  last_day: `⏰ <b>Aksiya tugashiga 24 soatdan kam qoldi!</b>

Sizda <b>{ball}</b> ball, <b>{orin}</b>-o'rin.
📈 {keyingi_pogona} chegirmagacha yana {qolgan} ta odam.

{havola}`,

  not_active: `⏳ Hozir faol aksiya yo'q. Yangi aksiyalar haqida kanalda e'lon qilamiz.`,

  winner: `🏆 <b>Tabriklaymiz, {ism}!</b>

Siz aksiyada <b>{orin}</b>-o'rinni egalladingiz va {kurs_nomi} kursiga <b>{foiz}</b> chegirma yutdingiz.

🎟 Promokod: <code>{promokod}</code>
⏳ Amal qiladi: {muddat} gacha
💰 Chegirmali narx: {chegirmali_narx}

Kursni olish uchun yozing: {kurs_admin}`,

  no_prize: `🙌 Aksiyada qatnashganingiz uchun rahmat, {ism}! Siz <b>{ball}</b> ball to'pladingiz.

Keyingi aksiyalarda omad tilaymiz!`,
};

/** Admin matni bo'sh bo'lmagan satr bo'lsa o'sha, aks holda standart. */
export function campaignText(campaign: { texts: unknown }, key: CampaignTextKey): string {
  const texts = campaign.texts;
  if (typeof texts === 'object' && texts !== null && !Array.isArray(texts)) {
    const value = (texts as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return DEFAULT_CAMPAIGN_TEXTS[key];
}

const VARIABLE_RE = /\{(\w+)\}/g;

function substitute(text: string, vars: TemplateVars, escape: boolean): string {
  return text.replace(VARIABLE_RE, (match, key: string) => {
    const value = Object.hasOwn(vars, key) ? vars[key] : undefined;
    if (value === undefined || value === null) return match;
    return escape ? escapeHtml(value) : value;
  });
}

function lineHasNull(line: string, vars: TemplateVars): boolean {
  for (const [, key] of line.matchAll(VARIABLE_RE)) {
    if (Object.hasOwn(vars, key) && vars[key] === null) return true;
  }
  return false;
}

/**
 * `{nom}` → qiymat (HTML-escape bilan). Qiymati `null` bo'lgan o'zgaruvchi
 * turgan butun qator o'chadi — yashirin narx yoki keyingi pog'onasi yo'q
 * holat "chegirmagacha yana {qolgan}" kabi chala qator qoldirmasin. Qator
 * o'chgach qolgan ortiqcha bo'sh qatorlar bittaga qisqaradi. Noma'lum `{x}`
 * o'zgarmaydi (A3 saqlashda `unknownVariables` bilan ogohlantiradi).
 */
export function renderTemplate(template: string, vars: TemplateVars): string {
  const kept = template.split('\n').filter((line) => !lineHasNull(line, vars));
  return substitute(kept.join('\n'), vars, true).replace(/\n{3,}/g, '\n\n').trim();
}

/** URL ichiga (tugma havolasi) — HTML emas, shuning uchun escape'siz; `null` qiymat bo'sh satr. */
export function renderUrl(template: string, vars: TemplateVars): string {
  const filled = Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, v ?? '']));
  return substitute(template, filled, false).trim();
}

/** Shablondagi ro'yxatda yo'q o'zgaruvchilar (takrorsiz) — A3 saqlash validatsiyasi uchun. */
export function unknownVariables(template: string): string[] {
  const known = new Set<string>(CAMPAIGN_VARIABLES);
  const unknown = new Set<string>();
  for (const [, key] of template.matchAll(VARIABLE_RE)) if (!known.has(key)) unknown.add(key);
  return [...unknown];
}

/**
 * answerCallbackQuery alerti HTML'ni ko'rsatmaydi va 200 belgidan oshsa
 * rad etiladi — teglar olib tashlanadi, entity'lar qaytariladi, belgi
 * bo'yicha (emoji yarmidan emas) qisqartiriladi.
 */
export function plainText(html: string, max = 200): string {
  const text = html.replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  const chars = Array.from(text);
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : text;
}
