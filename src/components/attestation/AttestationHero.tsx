import { getTranslations } from 'next-intl/server';
import { ChevronRight, ListChecks, Play, RotateCcw } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { daysUntil } from '@/lib/date';
import type { AttestationPageData } from '@/lib/attestation-page';

const INTL_LOCALES: Record<string, string> = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' };

// `YYYY-MM-DD` kalitini UTC'da formatlaymiz — mahalliy vaqt zonasida
// Date(…) kunni bir kunga surib yuborishi mumkin. Sana `daysUntil` dan
// o'tgan (to'g'ri), shuning uchun bu yerda qayta tekshirish shart emas.
function formatDateKey(key: string, locale: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Intl.DateTimeFormat(INTL_LOCALES[locale] ?? locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

// "№N" faqat mock uchun — mavzu testlarida tartib raqami ko'rsatilmaydi.
function ctaLabel(
  t: Awaited<ReturnType<typeof getTranslations<'attestation'>>>,
  hero: NonNullable<AttestationPageData['hero']>,
): string {
  switch (hero.kind) {
    case 'mockNext':
      return t('hero.ctaNext', { number: hero.number ?? 0 });
    case 'mockRetake':
      return t('hero.ctaRetake', { number: hero.number ?? 0 });
    case 'topicStart':
      return t('hero.ctaTopicStart');
    case 'topicRetake':
      return t('hero.ctaRetakeLowest');
  }
}

export async function AttestationHero({
  hero,
  date,
  locale,
}: {
  hero: AttestationPageData['hero'];
  date: string | null;
  locale: string;
}) {
  const t = await getTranslations('attestation');
  const days = daysUntil(date);

  return (
    <section className="rounded-2xl bg-[#2e1065] p-5 sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 lg:max-w-3xl">
          <nav aria-label="breadcrumb" className="flex items-center gap-1 text-sm text-[#ddd6fe]">
            <Link href="/tests" className="inline-flex min-h-11 items-center hover:text-white">
              {t('hero.breadcrumbTests')}
            </Link>
            <ChevronRight size={14} aria-hidden />
            <span aria-current="page" className="text-white">{t('hero.breadcrumbCurrent')}</span>
          </nav>
          <h1 className="mt-2 text-2xl font-bold leading-tight text-white sm:text-3xl wrap-break-word">
            {t('hero.title')}
          </h1>
          <p className="mt-3 text-sm text-[#ddd6fe] sm:text-base">{t('hero.subtitle')}</p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {hero && (
              <Link
                href={hero.href}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#fbbf24] px-5 text-sm font-semibold text-[#451a03] transition-colors hover:bg-[#f59e0b]"
              >
                {hero.kind === 'mockRetake' || hero.kind === 'topicRetake' ? (
                  <RotateCcw size={16} aria-hidden />
                ) : (
                  <Play size={16} aria-hidden />
                )}
                {ctaLabel(t, hero)}
              </Link>
            )}
            <a
              href="#tuzilma"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/30 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <ListChecks size={16} aria-hidden />
              {t('hero.ctaStructure')}
            </a>
          </div>
        </div>

        {days !== null && date && (
          <div className="rounded-2xl bg-white/10 p-5 text-white lg:w-64 lg:shrink-0">
            <p className="text-sm text-[#ddd6fe]">{t('countdown.before')}</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-bold tabular-nums leading-none">{days}</span>
              <span className="text-sm text-[#ddd6fe]">{t('countdown.daysLeft')}</span>
            </p>
            <p className="mt-2 text-sm text-white">{formatDateKey(date.trim(), locale)}</p>
          </div>
        )}
      </div>
    </section>
  );
}
