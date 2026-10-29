import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import TestTypesSection from '@/components/landing/TestTypesSection';
import PricingSection from '@/components/landing/PricingSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import CTASection from '@/components/landing/CTASection';
import SessionProvider from '@/components/providers/SessionProvider';
import { OrganizationJsonLd, WebApplicationJsonLd, FAQJsonLd } from '@/components/seo/JsonLd';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { generateLocaleStaticParams } from '@/i18n/static-params';

export const metadata: Metadata = {
  title: "EduPrime.uz — O'zbekiston Test Platformasi | DTM, SAT, GRE",
  description: "DTM, maktab, attestatsiya, SAT, GRE va Milliy sertifikat testlarini yeching. Professional ustozlardan video yechimlar oling. 1000+ testlar, reyting tizimi.",
  openGraph: {
    title: "EduPrime.uz — O'zbekiston Test Platformasi",
    description: "DTM, maktab, attestatsiya, SAT, GRE testlarini yeching. Professional ustozlardan video yechimlar oling.",
    url: '/',
    type: 'website',
  },
};

// Landing to'liq statik (klient komponentlari, server tomonda auth/DB yo'q) —
// setRequestLocale bilan sahifa build vaqtida har locale uchun tayyorlanadi.
export const generateStaticParams = generateLocaleStaticParams;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <SessionProvider>
      <OrganizationJsonLd />
      <WebApplicationJsonLd />
      <FAQJsonLd />
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <TestTypesSection />
        <PricingSection />
        <HowItWorksSection />
        <CTASection />
      </main>
      <Footer />
    </SessionProvider>
  );
}
