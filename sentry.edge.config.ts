import * as Sentry from '@sentry/nextjs';
import { redactEvent } from '@/lib/logger';

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
    // Logger'ni chetlab o'tgan xatolar (masalan `onRequestError` orqali
    // kelganlari) ham tozalansin — xato matni ichidagi DSN yoki token
    // Sentry'ga chiqmasin.
    beforeSend: (event) => redactEvent(event),
  });
}
