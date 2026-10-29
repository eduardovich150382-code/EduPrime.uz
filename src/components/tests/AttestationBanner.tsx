'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useDaysUntil } from '@/lib/use-days-until';
import { ATTESTATION_HREF } from '@/lib/nav-links';

interface AttestationBannerProps {
  // SystemSetting "attestation_date" (YYYY-MM-DD). Sozlanmagan yoki o'tgan
  // bo'lsa hisoblagich yashiriladi, banner esa qoladi.
  attestationDate: string | null;
}

export function AttestationBanner({ attestationDate }: AttestationBannerProps) {
  const t = useTranslations('tests.banner');
  const pricing = useTranslations('pricing');
  // Klientda hisoblanadi — /tests statik (ISR), server soni eskirishi mumkin.
  const days = useDaysUntil(attestationDate);

  return (
    <section className="rounded-2xl bg-[#2e1065] p-5 sm:p-7 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 md:max-w-2xl">
        <span className="inline-block rounded-full bg-[#fbbf24] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#451a03]">
          {t('pill')}
        </span>
        <h2 className="mt-3 text-xl sm:text-2xl font-bold text-white">{t('title')}</h2>
        <p className="mt-2 text-sm sm:text-base text-[#ddd6fe]">{t('body')}</p>
      </div>
      <div className="flex flex-col gap-4 sm:items-center md:shrink-0">
        {/* Hisoblanguncha joy band (ko'rinmas) — banner sakramasin. */}
        {attestationDate && days !== null && (
          <div className={`flex items-baseline gap-2 text-white sm:flex-col sm:items-center sm:gap-0 ${days === undefined ? 'invisible' : ''}`}>
            <span className="text-3xl sm:text-4xl font-bold tabular-nums leading-none">{days ?? 0}</span>
            <span className="text-sm text-[#ddd6fe]">{t('daysLeft', { count: days ?? 0 })}</span>
          </div>
        )}
        <Link
          href={ATTESTATION_HREF}
          className="inline-flex min-h-11 w-full md:w-auto items-center justify-center rounded-xl bg-[#fbbf24] px-5 text-sm font-semibold text-[#451a03] transition-colors hover:bg-[#f59e0b]"
        >
          {t('cta')}
        </Link>
        <Link href="/pricing?goal=ATTESTATION" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/30 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-white/10">
          {pricing('viewSubscription')}
        </Link>
      </div>
    </section>
  );
}
