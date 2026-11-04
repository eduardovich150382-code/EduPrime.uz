import { captureRequestError } from '@/lib/logger';

// Next.js server ishga tushganda bir marta chaqiriladi.
//
// Node runtime'da bu yerda hech narsa init qilinmaydi: server Sentry SDK'si
// (~1.5 MB) statik yuklansa, har funksiyaning sovuq startiga ~260 ms
// qo'shilardi. SDK birinchi xato kelganda `lib/logger.ts` dagi `loadSentry()`
// orqali yuklanadi va o'sha yerda init qilinadi.
//
// Edge (middleware) o'zgarishsiz: u yerda SDK alohida, kichik va Fluid
// funksiyalarining sovuq startiga ta'sir qilmaydi. Edge konfiguratsiyasi
// faqat edge runtime'da yuklansin — aks holda Node bundle'iga tushadi.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

// Server Component'lar va route handler'lardagi tutilmagan xatolarni
// Sentry'ga uzatadi. DSN yo'q bo'lsa — no-op, SDK yuklanmaydi.
export async function onRequestError(...args: Parameters<typeof captureRequestError>): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'edge') {
    const sdk = await import('@sentry/nextjs');
    sdk.captureRequestError(...args);
    return;
  }
  await captureRequestError(...args);
}
