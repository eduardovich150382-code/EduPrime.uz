'use client';

import { useTranslations } from 'next-intl';
import { formatTime } from '@/lib/utils';

export default function ResultScore({ score, maxScore, percentage, correct, incorrect, skipped, timeSpent }: {
  score: number; maxScore: number; percentage: number; correct: number; incorrect: number; skipped: number; timeSpent: number;
}) {
  const t = useTranslations('exam');
  const circumference = 2 * Math.PI * 89;
  const progress = Math.max(0, Math.min(100, percentage)) / 100;
  return <div className="my-6 grid items-center gap-6 sm:grid-cols-[240px_minmax(0,1fr)] sm:gap-10">
    <div className="relative mx-auto flex h-60 w-60 shrink-0 items-center justify-center" aria-label={`${score} / ${maxScore}`}>
      <svg viewBox="0 0 240 240" className="absolute inset-0 h-full w-full" fill="none" aria-hidden="true">
        <circle cx="120" cy="120" r="89" className="stroke-primary-100" strokeWidth="10" />
        <circle cx="120" cy="120" r="89" className="stroke-primary-600" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${circumference * progress} ${circumference}`} transform="rotate(-90 120 120)" />
        <g className="result-orbit stroke-primary-400" strokeWidth="2" strokeLinecap="round"><circle cx="120" cy="120" r="108" strokeDasharray="92 586" transform="rotate(-50 120 120)" /></g>
        <g className="result-orbit result-orbit-reverse stroke-primary-200" strokeWidth="2" strokeLinecap="round"><circle cx="120" cy="120" r="115" strokeDasharray="44 679" transform="rotate(100 120 120)" /></g>
      </svg>
      <div className="relative min-w-0 px-7 text-center"><span className="block break-all text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">{score}</span><span className="mt-1 block text-sm text-text-secondary">{t('scoreOf', { max: maxScore })}</span><span className="mt-2 block text-xs font-medium text-primary-700">{t('percentage', { value: percentage })}</span></div>
    </div>
    <dl className="grid grid-cols-2 gap-x-5 gap-y-6 text-left">
      {[
        { label: 'correct', value: correct, color: 'text-green-700' },
        { label: 'incorrect', value: incorrect, color: 'text-red-700' },
        { label: 'unanswered', value: skipped, color: 'text-text-primary' },
        { label: 'timeSpent', value: formatTime(timeSpent), color: 'text-text-primary' },
      ].map(stat => <div key={stat.label}><dt className="mb-1 text-xs text-text-secondary">{t(stat.label)}</dt><dd className={`break-words text-2xl font-semibold tabular-nums ${stat.color}`}>{stat.value}</dd></div>)}
    </dl>
  </div>;
}
