'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { tashkentRelativeDay } from '@/lib/date';
import { getCardLinks } from '@/lib/test-card';
import type { DraftSummary } from '@/lib/test-draft';
import type { TestItem } from '@/components/tests/TestCard';

interface ContinueRowProps {
  drafts: DraftSummary[];
  // Nomsiz eski qoralamalar uchun — sahifa allaqachon yuklagan testlar.
  tests: TestItem[];
}

interface TitleSource {
  titleUz?: string;
  titleRu?: string | null;
  titleEn?: string | null;
}

function localizedTitle(source: TitleSource, locale: string): string | undefined {
  return (locale === 'ru' && source.titleRu) || (locale === 'en' && source.titleEn) || source.titleUz || undefined;
}

export function ContinueRow({ drafts, tests }: ContinueRowProps) {
  const t = useTranslations('tests.continue');
  const locale = useLocale();

  const cards = drafts.flatMap((draft) => {
    const source: TitleSource | undefined = draft.title
      ? { titleUz: draft.title.uz, titleRu: draft.title.ru, titleEn: draft.title.en }
      : tests.find((test) => test.id === draft.testId);
    const title = source && localizedTitle(source, locale);
    // Nomsiz karta foydalanuvchiga hech narsa aytmaydi — ko'rsatmaymiz.
    return title ? [{ draft, title }] : [];
  });

  if (cards.length === 0) return null;

  const dayLabel = (timestamp: number) => {
    const days = tashkentRelativeDay(timestamp);
    if (days === null) return null;
    if (days === 0) return t('today');
    if (days === 1) return t('yesterday');
    return t('daysAgo', { count: days });
  };

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-text-primary">{t('title')}</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(({ draft, title }) => {
          const percent = Math.round((draft.answered / draft.total) * 100);
          const when = dayLabel(draft.timestamp);
          return (
            <div key={draft.testId} className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="line-clamp-2 font-semibold text-text-primary">{title}</h3>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-sm text-text-secondary">
                  <span className="tabular-nums">{t('progress', { answered: draft.answered, total: draft.total })}</span>
                  {when && <span>{when}</span>}
                </div>
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={draft.total}
                  aria-valuenow={draft.answered}
                  className="h-2 overflow-hidden rounded-full bg-primary-50"
                >
                  <div className="h-full rounded-full bg-primary-600" style={{ width: `${percent}%` }} />
                </div>
              </div>
              <Link
                href={getCardLinks(draft.testId, { kind: 'start' }).primary}
                className="mt-auto inline-flex min-h-11 items-center justify-center rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
              >
                {t('cta')}
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
