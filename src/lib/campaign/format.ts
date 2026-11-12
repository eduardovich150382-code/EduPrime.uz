import { formatTashkentDate } from '../date';
import { publicCoursePrice, type BotSettings } from '../bot-settings';
import { BOT_USERNAME } from '../telegram-bot-links';
import { campaignStartParameter } from './ref-code';
import type { CampaignVars } from './texts';
import type { Standing } from './rewards';

// Shablon o'zgaruvchilarining qiymatlari. `null` — "ko'rsatilmasin":
// renderTemplate bunday o'zgaruvchi turgan butun qatorni olib tashlaydi.

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

/** `"26-noyabr, 23:59"` — Toshkent vaqtida (server UTC'da ishlaydi). */
export function formatCampaignDate(date: Date): string {
  const shifted = new Date(date.getTime() + TASHKENT_OFFSET_MS);
  const hh = String(shifted.getUTCHours()).padStart(2, '0');
  const mm = String(shifted.getUTCMinutes()).padStart(2, '0');
  return `${formatTashkentDate(date, 'uz')}, ${hh}:${mm}`;
}

/** `"350 000 so'm"` — oddiy bo'shliq bilan; Intl/ICU muhitga qarab NBSP yoki boshqa ajratgich beradi. */
export function formatSom(amount: number): string {
  return `${String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so'm`;
}

export function campaignLink(refCode: string): string {
  return `https://t.me/${BOT_USERNAME}?start=${campaignStartParameter(refCode)}`;
}

export type VarsInput = {
  campaign: { channelUsername: string; endsAt: Date };
  bot: BotSettings;
  firstName?: string | null;
  refCode?: string | null;
  standing?: Standing | null;
};

export function campaignVars({ campaign, bot, firstName, refCode, standing }: VarsInput): CampaignVars {
  const price = publicCoursePrice(bot);
  const vars: CampaignVars = {
    ism: firstName?.trim() || "do'stim",
    kanal: campaign.channelUsername,
    tugash_vaqti: formatCampaignDate(campaign.endsAt),
    kurs_nomi: bot.course.name || null,
    kurs_narxi: price === null ? null : formatSom(price),
    kurs_admin: bot.course.managerUsername || null,
    kurs_havola: bot.course.infoLink || null,
  };
  if (refCode) vars.havola = campaignLink(refCode);
  if (standing) {
    vars.ball = String(standing.activeCount);
    vars.orin = String(standing.rank);
    vars.foiz = standing.percent > 0 ? `${standing.percent}%` : null;
    vars.keyingi_pogona = standing.next ? `${standing.next.percent}%` : null;
    vars.qolgan = standing.next ? String(standing.next.needed) : null;
    vars.chegirmali_narx = price !== null && standing.percent > 0 ? formatSom(price * (100 - standing.percent) / 100) : null;
  }
  return vars;
}
