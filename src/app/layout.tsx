import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'EduPrime.uz — O\'zbekiston Test Platformasi',
    template: '%s | EduPrime.uz',
  },
  description: "O'zbekistondagi eng zamonaviy test platformasi — DTM, maktab, attestatsiya, SAT, GRE va Milliy sertifikat testlari. Video va yozma yechimlar bilan.",
  keywords: ['test', 'DTM', 'imtihon', 'attestatsiya', 'SAT', 'GRE', 'EduPrime', 'Uzbekistan', 'testlar', 'maktab', 'online test', 'bilim'],
  authors: [{ name: 'EduPrime.uz' }],
  creator: 'EduPrime.uz',
  publisher: 'EduPrime.uz',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://eduprime.uz'),
  icons: {
    icon: '/icon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'uz_UZ',
    url: '/',
    siteName: 'EduPrime.uz',
    title: "EduPrime.uz — O'zbekiston Test Platformasi",
    description: "DTM, maktab, attestatsiya, SAT, GRE testlarini yeching. Professional ustozlardan video yechimlar oling.",
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'EduPrime.uz — Test Platformasi',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "EduPrime.uz — O'zbekiston Test Platformasi",
    description: "DTM, maktab, attestatsiya, SAT, GRE testlarini yeching.",
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
