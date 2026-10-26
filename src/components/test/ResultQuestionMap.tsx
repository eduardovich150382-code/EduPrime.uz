'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Minus, X } from 'lucide-react';
import { hasExamAnswer } from '@/lib/exam-presentation';
import { groupBySection, sectionRange, sectionScore } from '@/lib/question-sections';

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

type MapQuestion = { id: string; tags?: string[]; points?: number | null };

export default function ResultQuestionMap({ questions, answers, onSelect, categoryType, numberOf }: {
  questions: MapQuestion[];
  answers: { questionId: string; answer: string; isCorrect: boolean }[];
  onSelect: (id: string) => void;
  /** Faqat `ATTESTATION` da bo'limlar bo'yicha guruhlanadi; boshqa turlarda oddiy to'r. */
  categoryType?: string | null;
  /**
   * Katakdagi raqam. Berilmasa — `questions` dagi o'rin + 1. Xatolar ustida
   * mashq natija sahifasidagi asl raqamlarni beradi: qism to'plamda "1, 2, 3"
   * foydalanuvchini natija sahifasidagi boshqa savollarga adashtirardi.
   */
  numberOf?: (id: string) => number;
}) {
  const t = useTranslations('exam');
  const sectionNames = useTranslations('questionSections');
  const [selected, setSelected] = useState<string | null>(null);
  const byId = new Map(answers.map(answer => [answer.questionId, answer]));
  const status = (id: string): CellState => { const answer = byId.get(id); return answer?.isCorrect ? 'correct' : hasExamAnswer(answer?.answer) ? 'incorrect' : 'unanswered'; };
  const counts: Record<CellState, number> = { correct: 0, incorrect: 0, unanswered: 0 };
  for (const question of questions) counts[status(question.id)]++;
  // Katak bitta joyda chiziladi: guruhli va oddiy to'r bir xil ko'rinsin.
  // `index` — foydalanuvchi yechishda ko'rgan raqam − 1 (aralashtirilgan tartib).
  const numberAt = (question: MapQuestion, index: number) => numberOf ? numberOf(question.id) : index + 1;
  const renderCell = (question: MapQuestion, index: number) => {
    const state = status(question.id), Icon = CELL_ICON[state], number = numberAt(question, index);
    return <button key={question.id} type="button" aria-label={`${t('questionStatus', { number, status: t(state) })}. ${t('openAnalysis', { number })}`} aria-pressed={selected === question.id}
      onClick={() => { setSelected(question.id); onSelect(question.id); }}
      className={`relative flex min-h-11 min-w-0 items-center justify-center rounded-xl text-sm font-medium tabular-nums transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 ${CELL_STYLE[state]} ${selected === question.id ? 'ring-2 ring-primary-500 ring-offset-2' : 'hover:ring-2 hover:ring-primary-200'}`}>
      {number}<Icon size={11} aria-hidden="true" className="absolute right-1 top-1" />
    </button>;
  };
  // Eski (bo'limlashdan oldingi) urinishlarda bo'lim raqamlari uzluksiz
  // bo'lmasligi mumkin — `sectionRange` null bo'lsa sarlavhada son chiqadi.
  const groups = categoryType === 'ATTESTATION' ? groupBySection(questions) : null;
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
    {groups ? <div className="space-y-5">
      {groups.map(group => {
        // Mashqdagi qism to'plamda asl raqamlar odatda uzluksiz emas — shunda
        // sarlavhada oraliq emas, son chiqadi (sectionRange → null).
        const range = sectionRange(group.items.map(item => numberAt(item.question, item.index) - 1));
        const name = sectionNames(group.key);
        const { score, max } = sectionScore(group.items, answers);
        return <div key={group.key}>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 className="text-sm font-semibold text-text-primary">{range ? t('sectionRange', { name, from: range.from, to: range.to }) : t('sectionCount', { name, count: group.items.length })}</h3>
            <span className="text-xs font-medium tabular-nums text-text-secondary">{t('sectionScore', { score, max })}</span>
          </div>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {group.items.map(item => renderCell(item.question, item.index))}
          </div>
        </div>;
      })}
    </div> : <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
      {questions.map((question, index) => renderCell(question, index))}
    </div>}
    <p className="mt-4 min-h-5 text-xs text-text-secondary" aria-live="polite">{selected && t('questionStatus', { number: numberAt({ id: selected }, questions.findIndex(question => question.id === selected)), status: t(status(selected)) })}</p>
  </section>;
}
