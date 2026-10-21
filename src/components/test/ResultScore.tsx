'use client';

import { useTranslations } from 'next-intl';
import { Check, Clock, Minus, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import { formatTime } from '@/lib/utils';

const orbitRows = [
  { radius: 114, count: 84, size: 3.8 },
  { radius: 122, count: 90, size: 4.6 },
  { radius: 130, count: 96, size: 3.8 },
];
const orbitColors = [
  'fill-violet-500', 'fill-indigo-500', 'fill-sky-500',
  'fill-cyan-500', 'fill-emerald-500', 'fill-amber-500',
  'fill-orange-500', 'fill-rose-500', 'fill-fuchsia-500',
];

export default function ResultScore({ score, maxScore, percentage, correct, incorrect, skipped, timeSpent }: {
  score: number; maxScore: number; percentage: number; correct: number; incorrect: number; skipped: number; timeSpent: number;
}) {
  const t = useTranslations('exam');
  const circumference = 2 * Math.PI * 96;
  const progress = Math.max(0, Math.min(100, percentage)) / 100;
  return <div className="my-6 flex flex-col items-center gap-8 sm:my-8">
    <div className="relative flex aspect-square w-full max-w-72 items-center justify-center sm:max-w-80" aria-label={`${score} / ${maxScore}`}>
      <div className="absolute inset-4 rounded-full bg-gradient-to-br from-sky-100/80 via-violet-100/70 to-rose-100/80 blur-2xl" aria-hidden="true" />
      <svg viewBox="0 0 280 280" className="absolute inset-0 h-full w-full" fill="none" aria-hidden="true">
        <g className="result-orbit">
          <g transform="translate(140 140)">
            {orbitRows.map((row, rowIndex) => <g key={row.radius}>
              {Array.from({ length: row.count }, (_, index) => <rect
                key={index}
                x={row.radius - row.size / 2}
                y={-row.size / 2}
                width={row.size}
                height={row.size}
                rx="1"
                transform={`rotate(${index * 360 / row.count + rowIndex * 2})`}
                className={orbitColors[Math.floor(index / row.count * orbitColors.length + rowIndex / 3) % orbitColors.length]}
              />)}
            </g>)}
          </g>
        </g>
        <circle cx="140" cy="140" r="96" className="stroke-primary-100" strokeWidth="12" />
        <circle cx="140" cy="140" r="96" className="result-progress stroke-primary-600" strokeWidth="12" strokeLinecap={progress > 0 ? 'round' : 'butt'} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} transform="rotate(-90 140 140)" style={{ '--result-circumference': circumference } as CSSProperties} />
      </svg>
      <div className="result-score-value relative min-w-0 max-w-[75%] px-4 text-center"><span className="block break-words text-5xl font-bold tracking-tight text-text-primary sm:text-6xl">{score}</span><span className="mt-2 block text-sm text-text-secondary sm:text-base">{t('scoreOf', { max: maxScore })}</span><span className="mt-3 inline-block rounded-full bg-primary-100 px-3 py-1 text-sm font-semibold text-primary-800">{t('percentage', { value: percentage })}</span></div>
    </div>
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
