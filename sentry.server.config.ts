import * as Sentry from '@sentry/nextjs';
import { redactEvent } from '@/lib/logger';

// DSN yo'q bo'lsa `Sentry.init` umuman chaqirilmaydi: SDK client yaratmaydi,
// `captureException` jimgina no-op bo'ladi va hech qanday tarmoq so'rovi
// ketmaydi. Lokal `next dev` va CI build aynan shu holatda ishlaydi.
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Trace namunasi past — bepul kvota asosan xatolarga sarflansin.
    tracesSampleRate: 0.1,
    // Vercel'da `VERCEL_ENV` = production | preview | development.
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    // Foydalanuvchi IP va sarlavhalari yuborilmasin — logger'dagi tozalash
    // bilan bir xil mantiq: Sentry'ga faqat kerakli minimum boradi.
    sendDefaultPii: false,
    // Logger'ni chetlab o'tgan xatolar (masalan `onRequestError` orqali
    // kelganlari) ham tozalansin — xato matni ichidagi DSN yoki token
    // Sentry'ga chiqmasin.
    beforeSend: (event) => redactEvent(event),
  });
}
