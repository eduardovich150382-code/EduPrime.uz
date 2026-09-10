import * as Sentry from '@sentry/nextjs';

// Edge runtime (middleware va `runtime = 'edge'` route'lari) uchun alohida
// init kerak — server konfiguratsiyasi u yerda ishlamaydi.
// DSN yo'q bo'lsa — sentry.server.config.ts dagi kabi to'liq o'chiq.
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    sendDefaultPii: false,
  });
}
