import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { loadPricingPage } from '@/lib/pricing-page';
import { PricingPersonal } from '@/components/pricing/PricingPersonal';
import { noBuildTimeParams } from '@/i18n/static-params';

// Statik (ISR): katalog keshlangan `loadPricingCatalog` dan, mehmon
// ko'rinishida; shaxsiy qism va `?goal` klientda (PricingPersonal). Admin
// narxni o'zgartirsa revalidateTag('pricing') sahifani ham yangilaydi.
export const revalidate = 300;
// Build'da bazaga ulanmaydi — birinchi so'rovda render (i18n/static-params.ts).
export const generateStaticParams = noBuildTimeParams;
type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pricing.meta' });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eduprime.uz';
  const path = locale === 'uz' ? '/pricing' : `/${locale}/pricing`;
  return {
    title: t('title'), description: t('description'),
    alternates: { canonical: `${baseUrl}${path}`, languages: {
      uz: `${baseUrl}/pricing`, ru: `${baseUrl}/ru/pricing`, en: `${baseUrl}/en/pricing`, 'x-default': `${baseUrl}/pricing`,
    } },
    openGraph: { title: t('title'), description: t('description'), url: `${baseUrl}${path}` },
  };
}

export default async function PricingPage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [data, t] = await Promise.all([loadPricingPage(null, locale), getTranslations({ locale, namespace: 'pricing' })]);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">{t('title')}</h1>
        <p className="max-w-2xl text-text-secondary">{t('subtitle')}</p>
      </header>
      <PricingPersonal guest={data} locale={locale} />
    </div>
  );
}
