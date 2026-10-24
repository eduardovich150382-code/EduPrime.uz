'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export default function PricingSection() {
  const t = useTranslations('pricing.landing');
  return (
    <section id="pricing" className="bg-gray-50 px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">{t('title')}</h2>
        <p className="mt-3 text-text-secondary">{t('body')}</p>
        <Link href="/pricing" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700">{t('cta')}</Link>
      </div>
    </section>
  );
}
