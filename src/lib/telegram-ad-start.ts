import { miniAppUrl } from './telegram-bot-links';
import type { BotTransport } from './telegram-bot-menu';

// Reklamadan (/start ad_<kod>) kelgan odamga uzun welcome o'rniga bitta
// aniq harakat: bepul mock testni yechish. Matn reklama kampaniyasiga qarab
// tez-tez almashadi — shuning uchun messages/*.json emas, bitta konstanta.
export const AD_START_TEXT = "🧪 <b>Fizika attestatsiyasi bo'yicha bepul mock testni hozir yeching</b> — natija va har bir savol yechimi darhol ko'rinadi.";
export const AD_TEST_BUTTON = '🧪 Bepul mock testni yechish';
export const AD_SUBSCRIBE_BUTTON = '💳 Obuna';

/** Bepul test sozlanmagan bo'lsa ham tugma ishlasin — attestatsiya ro'yxatiga. */
export function adTestPath(testId: string | null): string {
  return testId ? `/tests/${testId}/solve` : '/attestation';
}

export async function sendAdStart(chatId: number, appUrl: string, testId: string | null, transport: BotTransport) {
  await transport.send(chatId, AD_START_TEXT, {
    reply_markup: {
      inline_keyboard: [
        [{ text: AD_TEST_BUTTON, web_app: { url: miniAppUrl(appUrl, adTestPath(testId)) } }],
        // co:list — mavjud checkout'ning mahsulot tanlovi (telegram-category-checkout.ts).
        [{ text: AD_SUBSCRIBE_BUTTON, callback_data: 'co:list' }],
      ],
    },
  });
}
