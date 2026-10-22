'use client';

import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { TEST_GOALS, type TestGoal, type TestsFilters as Filters, type TestsSort } from '@/lib/tests-filters';

export interface SubjectOption {
  id: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-11 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors ${
        selected
          ? 'bg-primary-600 text-white'
          : 'border border-gray-200 bg-white text-text-secondary hover:border-primary-200 hover:text-primary-700'
      }`}
    >
      {children}
    </button>
  );
}

// Mobilda chiplar bitta qatorda gorizontal suriladi — sahifaning o'zi emas,
// faqat shu qator. Manfiy margin qatorni karta chetigacha cho'zadi, shunda
// chip kesilgani ko'rinadi va surish mumkinligi seziladi.
function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="sm:flex sm:items-start sm:gap-3">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-secondary sm:mb-0 sm:w-20 sm:shrink-0 sm:pt-3.5">
        {label}
      </span>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </div>
  );
}

export function TestsFilters({
  filters,
  subjects,
  loadingSubjects,
  onTypeChange,
  onSubjectChange,
  onSortChange,
}: {
  filters: Filters;
  subjects: SubjectOption[];
  loadingSubjects: boolean;
  onTypeChange: (type: TestGoal | null) => void;
  onSubjectChange: (subject: string | null) => void;
  onSortChange: (sort: TestsSort) => void;
}) {
  const t = useTranslations('tests');
  const locale = useLocale();
  const subjectName = (s: SubjectOption) =>
    locale === 'ru' ? s.nameRu || s.nameUz : locale === 'en' ? s.nameEn || s.nameUz : s.nameUz;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <ChipRow label={t('goal')}>
            <Chip selected={filters.type === null} onClick={() => onTypeChange(null)}>
              {t('all')}
            </Chip>
            {TEST_GOALS.map((goal) => (
              <Chip key={goal} selected={filters.type === goal} onClick={() => onTypeChange(goal)}>
                {t(`goals.${goal}`)}
              </Chip>
            ))}
          </ChipRow>

          {filters.type !== null && (
            <ChipRow label={t('subject')}>
              <Chip selected={filters.subject === null} onClick={() => onSubjectChange(null)}>
                {t('all')}
              </Chip>
              {loadingSubjects
                ? Array.from({ length: 4 }).map((_, i) => (
                    <span key={i} className="h-11 w-24 shrink-0 animate-pulse rounded-full bg-gray-100" />
                  ))
                : subjects.map((s) => (
                    <Chip key={s.id} selected={filters.subject === s.id} onClick={() => onSubjectChange(s.id)}>
                      {subjectName(s)}
                    </Chip>
                  ))}
            </ChipRow>
          )}
        </div>

        <label className="flex items-center gap-3 lg:shrink-0">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{t('sort')}</span>
          <select
            value={filters.sort}
            onChange={(e) => onSortChange(e.target.value === 'popular' ? 'popular' : 'newest')}
            className="min-h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-text-primary focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="newest">{t('sortNewest')}</option>
            <option value="popular">{t('sortPopular')}</option>
          </select>
        </label>
      </div>
    </div>
  );
}
