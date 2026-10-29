'use client';

import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import { Link } from '@/i18n/routing';

// Faqat reklama uchun bepul test natijasida (GET /api/results/[id] → adOffer).
// Tugma /attestation dagi obuna kartasiga (#obuna) olib boradi — o'sha yerda
// mavjud checkout oqimi (BuyOfferButton), alohida to'lov yo'li ochilmaydi.
export default function AdTestOffer() {
  const t = useTranslations('results.adOffer');
  return (
    <section className="mt-6 rounded-2xl border border-primary-200 bg-primary-50 p-4 sm:p-5">
      <p className="flex items-start gap-2 font-semibold text-text-primary">
        <Sparkles size={20} className="mt-0.5 shrink-0 text-primary-600" aria-hidden />
        {t('title')}
      </p>
      <Link href="/attestation#obuna"
        className="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl bg-primary-600 px-4 py-3 text-center font-semibold text-white hover:bg-primary-700 sm:w-auto sm:inline-flex">
        {t('button')}
      </Link>
    </section>
  );
}
