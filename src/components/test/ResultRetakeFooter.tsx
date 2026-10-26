'use client';

import { useTranslations } from 'next-intl';
import { ArrowLeft, RotateCcw, Target } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { withReturnTo } from '@/lib/safe-return-path';
import type { AttemptHistory } from '@/lib/result-attempts';

// Sahifadagi asosiy CTA — natija kartasi va pastki blokda bir xil ko'rinsin.
// docs/design/testlar-ui.md: to'liq primary-600, gradient emas.
export const RETAKE_BUTTON_CLASS =
  'inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 text-[17px] font-extrabold text-white shadow-md shadow-primary-600/25 transition-colors hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600';

export const SECONDARY_BUTTON_CLASS =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 text-sm font-semibold text-primary-800 transition-colors hover:bg-primary-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600';

// Uzun tahlilni o'qib bo'lgan foydalanuvchi qayta yechish uchun tepaga
// qaytmasin — shu blok savollar tahlilidan keyin turadi.
export default function ResultRetakeFooter({ retakeHref, practiceHref = null, practiceCount = 0, backHref, backLabel, history, currentId, returnTo }: {
  retakeHref: string;
  /** "Faqat xatolarni qayta yechish" — ikkinchi darajali, asosiy tugma bilan raqobatlashmaydi. */
  practiceHref?: string | null;
  practiceCount?: number;
  backHref: string;
  backLabel: string;
  history: AttemptHistory | null;
  currentId: string;
  returnTo: string | null;
}) {
  const t = useTranslations('results');
  const showHistory = history !== null && history.total > 1;
  return <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6">
    <div className="min-w-0">
      <h2 className="text-lg font-bold text-text-primary">{t('retakeTitle')}</h2>
      {showHistory ? (
        <div className="mt-2 min-w-0">
          <p className="text-xs font-medium text-text-secondary">{t('attemptsHistory')}</p>
          <ol className="-mx-1 mt-1 flex gap-1 overflow-x-auto pb-1">
            {history.recent.map(attempt => {
              const isCurrent = attempt.id === currentId;
              return <li key={attempt.id} className="shrink-0">
                <Link href={withReturnTo(`/results/${attempt.id}`, returnTo)} aria-current={isCurrent ? 'page' : undefined}
                  className={`inline-flex min-h-11 items-center gap-1 whitespace-nowrap rounded-lg px-2 text-sm tabular-nums transition-colors hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-primary-600 ${isCurrent ? 'font-bold text-primary-800' : 'text-text-secondary'}`}>
                  {t('attempt', { number: attempt.number })} — {t('attemptScore', { score: attempt.score, max: attempt.maxScore })}
                </Link>
              </li>;
            })}
          </ol>
        </div>
      ) : (
        <p className="mt-1 text-sm text-text-secondary">{t('retakeSubtitle')}</p>
      )}
    </div>
    {/* Mobilda asosiy tugma tepada (birinchi ko'rinadi), desktopda o'ngda.
        Mashq tugmasi bilan uchta tugma planshetda sig'masa — keyingi qatorga o'tadi. */}
    <div className={`mt-4 flex flex-col-reverse gap-3 sm:mt-0 sm:w-auto sm:flex-row sm:items-center ${practiceHref ? 'sm:min-w-0 sm:flex-wrap sm:justify-end' : 'sm:shrink-0'}`}>
      <Link href={backHref} className={`${SECONDARY_BUTTON_CLASS} sm:min-h-14 sm:w-auto`}>
        <ArrowLeft size={16} aria-hidden="true" />
        {backLabel}
      </Link>
      {practiceHref && <Link href={practiceHref} className={`${SECONDARY_BUTTON_CLASS} sm:min-h-14 sm:w-auto`}>
        <Target size={16} aria-hidden="true" />
        {t('retakeWrongOnly', { count: practiceCount })}
      </Link>}
      <Link href={retakeHref} className={`${RETAKE_BUTTON_CLASS} sm:w-auto`}>
        <RotateCcw size={20} aria-hidden="true" />
        {t('retake')}
      </Link>
    </div>
  </section>;
}
