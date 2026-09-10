import * as Sentry from '@sentry/nextjs';

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
  });
}

// App Router navigatsiyalarini o'lchash uchun Next.js talab qiladigan hook.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
