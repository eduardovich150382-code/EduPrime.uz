'use client';

import { useTranslations } from 'next-intl';
import { Check, Clock, Minus, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatTime } from '@/lib/utils';
import ResultRing from './ResultRing';

export default function ResultScore({ score, maxScore, percentage, correct, incorrect, skipped, timeSpent, ring }: {
  score: number; maxScore: number; percentage: number; correct: number; incorrect: number; skipped: number; timeSpent: number;
  /** Berilsa standart ball aylanasi o'rniga chiziladi (attestatsiya mock'i — ball + toifa). */
  ring?: ReactNode;
}) {
  const t = useTranslations('exam');
  return <div className="my-6 flex flex-col items-center gap-8 sm:my-8">
    {ring ?? <ResultRing progress={percentage / 100} label={`${score} / ${maxScore}`} orbit>
      <span className="block break-words text-5xl font-bold tracking-tight text-text-primary sm:text-6xl">{score}</span><span className="mt-2 block text-sm text-text-secondary sm:text-base">{t('scoreOf', { max: maxScore })}</span><span className="mt-3 inline-block rounded-full bg-primary-100 px-3 py-1 text-sm font-semibold text-primary-800">{t('percentage', { value: percentage })}</span>
    </ResultRing>}
    <dl className="grid w-full max-w-5xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {[
        { label: 'correct', value: correct, Icon: Check, color: 'border-emerald-200 bg-emerald-50/80 text-emerald-800', iconColor: 'bg-emerald-100' },
        { label: 'incorrect', value: incorrect, Icon: X, color: 'border-rose-200 bg-rose-50/80 text-rose-800', iconColor: 'bg-rose-100' },
        { label: 'unanswered', value: skipped, Icon: Minus, color: 'border-slate-200 bg-slate-50 text-slate-700', iconColor: 'bg-slate-200/70' },
        { label: 'timeSpent', value: formatTime(timeSpent), Icon: Clock, color: 'border-primary-200 bg-primary-50/80 text-primary-800', iconColor: 'bg-primary-100' },
      ].map((stat, index) => <div key={stat.label} className={`result-stat min-w-0 rounded-2xl border p-3 text-center sm:p-5 ${stat.color}`} style={{ animationDelay: `${index * 80 + 150}ms` }}><dt className="flex flex-col items-center gap-2 text-xs font-medium sm:text-sm"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.iconColor}`}><stat.Icon size={19} aria-hidden="true" /></span>{t(stat.label)}</dt><dd className="mt-2 break-words text-2xl font-bold tabular-nums sm:text-3xl">{stat.value}</dd></div>)}
    </dl>
  </div>;
}
