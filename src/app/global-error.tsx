'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

// Ildiz darajasidagi xato chegarasi. Usiz React render xatolari (layout yoki
// Server Component ichida yiqilish) hech qayerda ko'rinmaydi: `onRequestError`
// faqat so'rov bosqichidagi xatolarni ushlaydi, brauzerdagi render yiqilishi
// esa jimgina bo'sh sahifa bilan tugaydi.
//
// Bu fayl `[locale]` tashqarisida — next-intl konteksti mavjud emas,
// shuning uchun matn tarjimasiz, asosiy tilda (o'zbekcha) yozilgan.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="uz">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            padding: '1.5rem',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.25rem', margin: 0 }}>Xatolik yuz berdi</h1>
          <p style={{ margin: 0, color: '#4b5563', maxWidth: '32rem' }}>
            Kutilmagan xato tufayli sahifa ochilmadi. Qayta urinib ko&apos;ring —
            muammo takrorlansa, biroz kutib turing.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: '44px',
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0 1.25rem',
              border: 'none',
              borderRadius: '0.5rem',
              background: '#2563eb',
              color: '#fff',
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            Qayta urinish
          </button>
        </main>
      </body>
    </html>
  );
}
