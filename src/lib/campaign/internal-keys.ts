// Aksiyaning SystemSetting'dagi vaqtinchalik ichki holati: capture (A4),
// yakuniy xabarlar kursori va cron eslatmasi belgisi (A5). Sozlama emas —
// Sozlamalar sahifasida ko'rinmasin va u butun xaritani PUT qilganda qayta
// yozilib "tirilmasin". Faqat aniq prefikslar: `campaign_` bilan boshlanadigan
// har qanday kalit emas (kelajakdagi haqiqiy sozlama yashirinib qolmasin).

export const CAPTURE_KEY_PREFIX = 'campaign_capture:';
export const NOTIFY_KEY_PREFIX = 'campaign_notify:';
export const FINISH_NOTICE_KEY_PREFIX = 'campaign_finish_notice:';

export const INTERNAL_KEY_PREFIXES = [CAPTURE_KEY_PREFIX, NOTIFY_KEY_PREFIX, FINISH_NOTICE_KEY_PREFIX] as const;

export const notifyKey = (campaignId: string) => `${NOTIFY_KEY_PREFIX}${campaignId}`;
export const finishNoticeKey = (campaignId: string) => `${FINISH_NOTICE_KEY_PREFIX}${campaignId}`;

export function isInternalCampaignKey(key: string): boolean {
  return INTERNAL_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}
