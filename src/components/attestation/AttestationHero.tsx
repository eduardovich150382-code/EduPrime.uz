import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { formatTashkentDate } from '@/lib/date';
import { AttestationCountdown } from './AttestationCountdown';

// `YYYY-MM-DD` kaliti UTC yarim tuni — Toshkentda shu kunning 05:00 i,
// shuning uchun formatTashkentDate kunni surmaydi.
function formatDateKey(key: string, locale: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return formatTashkentDate(new Date(Date.UTC(y, m - 1, d)), locale, true);
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

// Sarlavha va sana — umumiy (statik HTML). Tugmalar foydalanuvchining
// natijasiga bog'liq — `actions` slotida (AttestationPersonal.HeroActions),
// kunlar soni — klientda (AttestationCountdown).
export async function AttestationHero({
  date,
  locale,
  actions,
}: {
  date: string | null;
  locale: string;
  actions: ReactNode;
}) {
  const t = await getTranslations('attestation');
  const dateKey = date?.trim() ?? '';

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

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">{actions}</div>
        </div>

        {DATE_KEY.test(dateKey) && <AttestationCountdown dateKey={dateKey} dateLabel={formatDateKey(dateKey, locale)} />}
      </div>
    </section>
  );
}
