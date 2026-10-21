'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Minus, X } from 'lucide-react';
import { hasExamAnswer } from '@/lib/exam-presentation';

export default function ResultQuestionMap({ questions, answers, onSelect }: {
  questions: { id: string }[];
  answers: { questionId: string; answer: string; isCorrect: boolean }[];
  onSelect: (id: string) => void;
}) {
  const t = useTranslations('exam');
  const [selected, setSelected] = useState<string | null>(null);
  const byId = new Map(answers.map(answer => [answer.questionId, answer]));
  const status = (id: string) => { const answer = byId.get(id); return answer?.isCorrect ? 'correct' : hasExamAnswer(answer?.answer) ? 'incorrect' : 'unanswered'; };
  return <section className="rounded-[18px] border border-border bg-white p-4 sm:p-6" aria-label={t('resultMap', { count: questions.length })}>
    <h2 className="text-base font-semibold text-text-primary sm:text-lg">{t('resultMap', { count: questions.length })}</h2>
    <div className="my-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-text-secondary"><span className="flex items-center gap-1"><Check size={14} className="text-green-700" />{t('correct')}</span><span className="flex items-center gap-1"><X size={14} className="text-red-700" />{t('incorrect')}</span><span className="flex items-center gap-1"><Minus size={14} />{t('unanswered')}</span></div>
    <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
      {questions.map((question, index) => {
        const state = status(question.id), Icon = state === 'correct' ? Check : state === 'incorrect' ? X : Minus;
        return <button key={question.id} type="button" aria-label={`${t('questionStatus', { number: index + 1, status: t(state) })}. ${t('openAnalysis', { number: index + 1 })}`} aria-pressed={selected === question.id}
          onClick={() => { setSelected(question.id); onSelect(question.id); }}
          className={`relative flex min-h-11 min-w-0 items-center justify-center rounded-xl text-sm font-medium tabular-nums transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 ${state === 'correct' ? 'bg-green-50 text-green-700' : state === 'incorrect' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'} ${selected === question.id ? 'ring-2 ring-primary-500 ring-offset-2' : 'hover:ring-2 hover:ring-primary-200'}`}>
          {index + 1}<Icon size={11} aria-hidden="true" className="absolute right-1 top-1" />
        </button>;
      })}
    </div>
    <p className="mt-4 min-h-5 text-xs text-text-secondary" aria-live="polite">{selected && t('questionStatus', { number: questions.findIndex(question => question.id === selected) + 1, status: t(status(selected)) })}</p>
  </section>;
}
