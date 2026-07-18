import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import ThemeProvider from '@/components/providers/ThemeProvider';
import '../globals.css';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://eduprime.uz';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  const localeMap: Record<string, string> = {
    uz: 'uz_UZ',
    ru: 'ru_RU',
    en: 'en_US',
  };

  return {
    title: {
      default: 'EduPrime.uz — O\'zbekiston Test Platformasi',
      template: '%s | EduPrime.uz',
    },
    description: "O'zbekistondagi eng zamonaviy test platformasi — DTM, maktab, attestatsiya, SAT, GRE va Milliy sertifikat testlari. Video va yozma yechimlar.",
    keywords: ['test', 'DTM', 'imtihon', 'attestatsiya', 'SAT', 'GRE', 'EduPrime', 'Uzbekistan', 'online test', 'bilim', 'maktab'],
    alternates: {
      canonical: locale === 'uz' ? BASE_URL : `${BASE_URL}/${locale}`,
      languages: {
        'uz': BASE_URL,
        'ru': `${BASE_URL}/ru`,
        'en': `${BASE_URL}/en`,
        'x-default': BASE_URL,
      },
    },
    openGraph: {
      type: 'website',
      locale: localeMap[locale] || 'uz_UZ',
      alternateLocale: Object.values(localeMap).filter(l => l !== (localeMap[locale] || 'uz_UZ')),
      siteName: 'EduPrime.uz',
      url: locale === 'uz' ? BASE_URL : `${BASE_URL}/${locale}`,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} className="scroll-smooth">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
