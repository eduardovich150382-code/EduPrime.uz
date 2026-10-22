'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Minus, X } from 'lucide-react';
import { hasExamAnswer } from '@/lib/exam-presentation';

type CellState = 'correct' | 'incorrect' | 'unanswered';

// docs/design/testlar-ui.md — natija holatlari. Xato to'liq to'q qizil, to'g'ri
// och yashil, javobsiz oq: rangni ajratmaydigan foydalanuvchi uchun ham
// yorqinlik farqi katta, ustiga ikonka va uzuq chegara qo'shimcha belgi.
const CELL_STYLE: Record<CellState, string> = {
  correct: 'border border-[#86efac] bg-[#dcfce7] text-[#166534]',
  incorrect: 'border border-[#e11d48] bg-[#e11d48] font-semibold text-white',
  unanswered: 'border border-dashed border-[#9ca3af] bg-white text-gray-600',
};
const CELL_ICON = { correct: Check, incorrect: X, unanswered: Minus };
const LEGEND_KEY = { correct: 'legendCorrect', incorrect: 'legendIncorrect', unanswered: 'legendUnanswered' } as const;

export default function ResultQuestionMap({ questions, answers, onSelect }: {
  questions: { id: string }[];
  answers: { questionId: string; answer: string; isCorrect: boolean }[];
  onSelect: (id: string) => void;
}) {
  const t = useTranslations('exam');
  const [selected, setSelected] = useState<string | null>(null);
  const byId = new Map(answers.map(answer => [answer.questionId, answer]));
  const status = (id: string): CellState => { const answer = byId.get(id); return answer?.isCorrect ? 'correct' : hasExamAnswer(answer?.answer) ? 'incorrect' : 'unanswered'; };
  const counts: Record<CellState, number> = { correct: 0, incorrect: 0, unanswered: 0 };
  for (const question of questions) counts[status(question.id)]++;
  return <section className="rounded-[18px] border border-border bg-white p-4 sm:p-6" aria-label={t('resultMap', { count: questions.length })}>
    <h2 className="text-base font-semibold text-text-primary sm:text-lg">{t('resultMap', { count: questions.length })}</h2>
    <div className="my-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-text-secondary">
      {(['correct', 'incorrect', 'unanswered'] as const).map(state => {
        const Icon = CELL_ICON[state];
        return <span key={state} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={`flex size-4 items-center justify-center rounded ${CELL_STYLE[state]}`}><Icon size={10} /></span>
          {t(LEGEND_KEY[state], { count: counts[state] })}
        </span>;
      })}
    </div>
    <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
      {questions.map((question, index) => {
        const state = status(question.id), Icon = CELL_ICON[state];
        return <button key={question.id} type="button" aria-label={`${t('questionStatus', { number: index + 1, status: t(state) })}. ${t('openAnalysis', { number: index + 1 })}`} aria-pressed={selected === question.id}
          onClick={() => { setSelected(question.id); onSelect(question.id); }}
          className={`relative flex min-h-11 min-w-0 items-center justify-center rounded-xl text-sm font-medium tabular-nums transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 ${CELL_STYLE[state]} ${selected === question.id ? 'ring-2 ring-primary-500 ring-offset-2' : 'hover:ring-2 hover:ring-primary-200'}`}>
          {index + 1}<Icon size={11} aria-hidden="true" className="absolute right-1 top-1" />
        </button>;
      })}
    </div>
    <p className="mt-4 min-h-5 text-xs text-text-secondary" aria-live="polite">{selected && t('questionStatus', { number: questions.findIndex(question => question.id === selected) + 1, status: t(status(selected)) })}</p>
  </section>;
}
