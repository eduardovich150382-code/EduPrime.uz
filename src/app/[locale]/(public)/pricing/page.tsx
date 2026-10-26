import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { loadPricingPage } from '@/lib/pricing-page';
import { sanitizeReturnPath } from '@/lib/safe-return-path';
import { PricingCatalog } from '@/components/pricing/PricingCatalog';
import { Link } from '@/i18n/routing';

// Admin narxni o'zgartirgach keyingi ochilishda eski Full Route Cache qaytmasin.
export const dynamic = 'force-dynamic';
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

export default async function PricingPage({ params, searchParams }: {
  params: Params; searchParams: Promise<{ goal?: string; returnUrl?: string }>;
}) {
  const [{ locale }, query, session, t] = await Promise.all([params, searchParams, auth(), getTranslations('pricing')]);
  const data = await loadPricingPage(session?.user?.id ?? null, locale);
  const returnUrl = sanitizeReturnPath(query.returnUrl);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">{t('title')}</h1>
        <p className="max-w-2xl text-text-secondary">{t('subtitle')}</p>
      </header>
      <PricingCatalog {...data} goal={query.goal} locale={locale} returnUrl={returnUrl ?? undefined} userId={session?.user?.id ?? null} />
      {returnUrl && <Link href={returnUrl} className="inline-flex min-h-11 items-center text-primary-700">{t('back')}</Link>}
    </div>
  );
}
