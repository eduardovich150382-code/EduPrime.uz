'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bookmark, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hasExamAnswer } from '@/lib/exam-presentation';

interface QuestionNavProps {
  totalQuestions: number; currentQuestion: number; answers: Record<number, string>;
  onNavigate: (index: number) => void; flaggedQuestions?: Set<number>;
  sections?: { label: string; count: number }[];
}

export default function QuestionNav({ totalQuestions, currentQuestion, answers, onNavigate, flaggedQuestions = new Set(), sections }: QuestionNavProps) {
  const t = useTranslations('exam');
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    setOpen(media.matches);
    const update = () => setOpen(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const button = (index: number) => {
    const active = index === currentQuestion, answered = hasExamAnswer(answers[index]), flagged = flaggedQuestions.has(index);
    return <button key={index} type="button" onClick={() => { onNavigate(index); if (!window.matchMedia('(min-width: 1024px)').matches) setOpen(false); }} aria-current={active ? 'step' : undefined}
      aria-label={`${t('questionNumber', { current: index + 1, total: totalQuestions })}: ${t(answered ? 'answered' : 'unanswered')}${flagged ? `, ${t('flagged')}` : ''}`}
      className={cn('relative flex min-h-11 min-w-0 items-center justify-center rounded-xl border text-sm font-medium tabular-nums transition-colors', active ? 'border-primary-800 bg-primary-800 text-white ring-2 ring-primary-300 ring-offset-2' : answered ? 'border-primary-600 bg-primary-600 font-bold text-white hover:border-primary-700 hover:bg-primary-700' : 'border-border bg-gray-50 text-text-secondary hover:border-primary-300')}>
      {index + 1}{flagged && <Bookmark size={12} aria-hidden="true" fill="currentColor" className={`absolute -top-1 right-0.5 ${active ? 'text-yellow-300' : 'text-amber-600'}`} />}
    </button>;
  };
  let offset = 0;
  const groups = sections?.length ? sections : [{ label: '', count: totalQuestions }];
  return <div className="rounded-[18px] border border-border bg-white p-4">
    <button type="button" aria-expanded={open} aria-controls="exam-question-map" onClick={() => setOpen(value => !value)} className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-sm font-semibold">
      <span>{t('questionMap')}</span><span className="ml-auto text-xs font-normal text-text-secondary">{Object.values(answers).filter(hasExamAnswer).length} / {totalQuestions}</span><ChevronDown size={16} className={open ? 'rotate-180' : ''} />
    </button>
    <div id="exam-question-map" hidden={!open}>
      {groups.map((group, groupIndex) => {
        const start = offset; offset += group.count;
        return <div key={groupIndex} className="mt-3">{group.label && <h3 className="mb-2 text-xs font-medium text-text-secondary">{group.label}</h3>}<div className="grid grid-cols-5 gap-2">{Array.from({ length: Math.min(group.count, totalQuestions - start) }, (_, j) => button(start + j))}</div></div>;
      })}
      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-2 text-[11px] text-text-secondary">
        {(['answered', 'current', 'unanswered'] as const).map((label, index) => <span key={label} className="flex items-center gap-1.5"><span className={cn('h-2.5 w-2.5 rounded-sm', index === 0 ? 'bg-primary-600' : index === 1 ? 'bg-primary-800 ring-1 ring-primary-300 ring-offset-1' : 'border border-border bg-gray-50')} />{t(label)}</span>)}<span className="flex items-center gap-1"><Bookmark size={12} className="text-amber-600" />{t('flagged')}</span>
      </div>
    </div>
  </div>;
}
