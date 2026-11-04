import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { logger } from '@/lib/logger';
import { getPublicSettings, PUBLIC_SETTING_DEFAULTS } from '@/lib/public-catalog';
import { CACHE_TAGS } from '@/lib/cache-tags';

// GET /api/settings — ommaviy sozlamalar (hozir klientda faqat
// `SiteAnnouncement` o'qiydi). Javobda foydalanuvchiga bog'liq hech narsa
// yo'q, shuning uchun route statik (ISR): CDN'dan beriladi va mehmon
// sahifasi funksiyani uyg'otmaydi. Admin sozlamani o'zgartirsa
// `revalidateSettings()` `settings` tegini tozalaydi — `getPublicSettings`
// ichidagi teg route'ning kesh yozuviga ham ilinadi.
//
// `PUBLIC_CACHE_REVALIDATE_SEC` bilan bir xil bo'lishi shart; Next faqat
// literalni qabul qiladi (test tengligini tekshiradi).
export const revalidate = 3600;

// Zaxira qiymat qisqa muddat keshlanadi: `unstable_cache` ning `revalidate`
// i route yozuvining muddatini qisqartiradi (kichigi g'olib), shuning uchun
// defaults 1 soat emas, shuncha vaqt turadi va keyin haqiqiy qiymat bilan
// qayta yig'iladi. Teg — admin o'zgarishi darhol tozalashi uchun.
const FALLBACK_REVALIDATE_SEC = 60;

const fallbackSettings = unstable_cache(
  async () => ({ ...PUBLIC_SETTING_DEFAULTS }),
  ['api-settings', 'fallback'],
  { revalidate: FALLBACK_REVALIDATE_SEC, tags: [CACHE_TAGS.settings] },
);

export async function GET() {
  // Build'da bazaga ulanmaymiz (lokal va CI'da baza yo'q — loyiha qoidasi,
  // `i18n/static-params.ts`). Statik route esa build'da prerender bo'ladi:
  // defaults bilan chiqadi va deploy'dan keyin bir daqiqa ichida yangilanadi.
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return NextResponse.json({ settings: await fallbackSettings() });
  }
  try {
    return NextResponse.json({ settings: await getPublicSettings() });
  } catch (error) {
    logger.error('GET /api/settings error:', { error });
    return NextResponse.json({ settings: await fallbackSettings() });
  }
}
