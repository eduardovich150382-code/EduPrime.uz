import * as Sentry from '@sentry/nextjs';

// Next.js server ishga tushganda bir marta chaqiriladi. Server va edge
// konfiguratsiyalari faqat mos runtime'da yuklanishi kerak — aks holda
// edge bundle'iga Node'ga bog'liq kod tushib, build yiqiladi.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

// Server Component'lar va route handler'lardagi tutilmagan xatolarni
// Sentry'ga uzatadi. Sentry sozlanmagan bo'lsa — no-op.
export const onRequestError = Sentry.captureRequestError;
