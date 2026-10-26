import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';

const QUESTIONS = ['payment', 'activation', 'changeSubject', 'secondSubject', 'expiry'] as const;

// JSsiz <details>: server sahifasida qoladi, klaviatura va ekran o'quvchida o'zi ishlaydi.
export function PricingFaq() {
  const t = useTranslations('pricing.faq');
  return (
    <section aria-labelledby="pricing-faq" className="space-y-3">
      <h2 id="pricing-faq" className="text-xl font-bold text-text-primary">{t('title')}</h2>
      <div className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white">
        {QUESTIONS.map((key) => (
          <details key={key} className="group px-4 sm:px-5">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 font-semibold text-text-primary [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 wrap-break-word">{t(`${key}.q`)}</span>
              <ChevronDown size={18} aria-hidden className="shrink-0 text-text-secondary motion-safe:transition-transform group-open:rotate-180" />
            </summary>
            <p className="pb-4 text-sm text-text-secondary">{t(`${key}.a`)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
