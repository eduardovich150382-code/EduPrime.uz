import * as Sentry from '@sentry/nextjs';
import { redactEvent } from '@/lib/logger';

// Brauzer bundle'iga faqat `NEXT_PUBLIC_` prefiksli o'zgaruvchilar tushadi,
// shuning uchun client tarafda DSN `NEXT_PUBLIC_SENTRY_DSN` dan olinadi.
// U berilmasa client tarafdagi Sentry o'chiq qoladi — server va edge
// baribir `SENTRY_DSN` bilan ishlaydi.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    sendDefaultPii: false,
    // Klient tarafda ham tozalash kerak: brauzerdagi `console.error` va
    // fetch izlari breadcrumb sifatida hodisaga ilinadi, ular esa
    // logger'dan o'tmaydi.
    beforeSend: (event) => redactEvent(event),
  });
}

// App Router navigatsiyalarini o'lchash uchun Next.js talab qiladigan hook.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
