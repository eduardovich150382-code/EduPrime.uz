'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Bookmark, Calculator, Check, ChevronLeft, ChevronRight, Flag, Keyboard, Maximize, Pause, Shuffle } from 'lucide-react';
import QuestionDisplay from './QuestionDisplay';
import QuestionNav from './QuestionNav';
import TestTimer from './TestTimer';
import HintPanel from './HintPanel';
import PhysicsCalculator from './PhysicsCalculator';
import ExamDialog from './ExamDialog';
import { hasExamAnswer } from '@/lib/exam-presentation';
import type { QuestionOption } from '@/types';

interface ExamQuestion {
  id: string; text: string; images: string[]; type: string;
  options: QuestionOption[] | { left: string[]; right: string[] };
  hints?: string[];
}

interface ExamWorkspaceProps {
  title: string; questions: ExamQuestion[]; current: number;
  answers: Record<number, string>; flagged: Set<number>;
  sections?: { label: string; count: number }[];
  totalSeconds: number; remainingSeconds?: number; expiresAt?: string;
  paused: boolean; timed?: boolean; submitting: boolean;
  autoNext: boolean; onAutoNext: (enabled: boolean) => void;
  onAnswer: (answer: string) => void; onNavigate: (index: number) => void;
  onFlag: (index: number) => void; onPause: () => void; onResume: () => void; onFinish: () => void;
  showFinish: boolean; onShowFinish: (show: boolean) => void;
  physics: boolean; onFullscreen?: () => void; before?: ReactNode;
  // Xatolar ustida mashq: rejim yorlig'i o'rnida belgi; taymer, pauza va
  // "saqlandi" yozuvi yo'q — mashqda vaqt tugab avtomatik topshirish ham,
  // qoralama ham yo'q.
  badge?: string; untimed?: boolean;
}

export default function ExamWorkspace(props: ExamWorkspaceProps) {
  const t = useTranslations('exam');
  const [calculator, setCalculator] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLElement>(null);
  const { questions, current, answers, flagged, paused, submitting, sections } = props;
  const question = questions[current];
  const count = questions.reduce((sum, _, i) => sum + Number(hasExamAnswer(answers[i])), 0);
  let offset = 0;
  const section = sections?.find(item => { offset += item.count; return current < offset; });
  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;
    // Sarlavha tugmalari qatorga sig'maganda ham xarita uning ostida qolsin.
    const updateHeight = () => workspaceRef.current?.style.setProperty('--exam-toolbar-height', `${toolbar.getBoundingClientRect().height}px`);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(toolbar);
    return () => observer.disconnect();
  }, []);
  if (!question) return null;
  const navigate = (index: number) => { if (!paused && !submitting && index >= 0 && index < questions.length) props.onNavigate(index); };
  return <>
    <div ref={workspaceRef} className="exam-workspace" inert={paused || props.showFinish || undefined} aria-hidden={paused || props.showFinish || undefined}>
      {props.before}
      <header ref={toolbarRef} className="exam-toolbar sticky z-30 mb-4 overflow-hidden rounded-[18px] border border-border bg-white shadow-sm sm:mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
          <div className="min-w-0 flex-1 basis-[45%] sm:basis-auto">{props.badge ? <p className="mb-2 inline-flex rounded-full border border-primary-200 bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-800">{props.badge}</p> : <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{t(props.timed ? 'timedMode' : 'practiceMode')}</p>}<h1 className="text-base font-semibold text-text-primary sm:text-xl">{props.title}</h1><p className="mt-1 text-xs text-text-secondary">{t('answeredCount', { answered: count, total: questions.length })}</p></div>
          {!props.untimed && <TestTimer totalSeconds={props.totalSeconds} remainingSeconds={props.remainingSeconds} expiresAt={props.expiresAt} onTimeUp={props.onFinish} />}
          <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto">
            {props.physics && <button type="button" onClick={() => setCalculator(value => !value)} aria-expanded={calculator} aria-controls="exam-calculator" className="exam-control min-w-11"><Calculator size={17} /><span className="sr-only sm:not-sr-only">{t('calculator')}</span></button>}
            {props.onFullscreen && <button type="button" onClick={props.onFullscreen} aria-label={t('fullscreen')} className="exam-control hidden sm:flex"><Maximize size={17} /></button>}
            {props.onFullscreen && <button type="button" onClick={() => setShortcuts(value => !value)} aria-expanded={shortcuts} aria-label={t('shortcuts')} className="exam-control hidden sm:flex"><Keyboard size={17} /></button>}
            {!props.untimed && <button type="button" onClick={props.onPause} disabled={submitting} className="exam-control flex-1 sm:flex-none"><Pause size={17} className="hidden sm:block" />{t('pause')}</button>}
            <button type="button" onClick={() => props.onShowFinish(true)} disabled={submitting} className="exam-control flex-1 !border-primary-600 !bg-primary-600 !text-white hover:!bg-primary-700 sm:flex-none"><Flag size={17} className="hidden sm:block" />{t('finish')}</button>
          </div>
        </div>
        <div className="h-1.5 bg-primary-50" role="progressbar" aria-label={t('answered')} aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={count}><div className="h-full bg-primary-600 transition-[width] motion-reduce:transition-none" style={{ width: `${count / questions.length * 100}%` }} /></div>
      </header>
      {shortcuts && <p className="mb-4 rounded-[18px] border border-border bg-white p-4 text-sm text-text-secondary">{t('shortcutsBody')}</p>}
      {calculator && props.physics && <div id="exam-calculator" className="mb-4"><PhysicsCalculator onClose={() => setCalculator(false)} /></div>}
      <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6">
        <div className={`exam-question min-w-0 rounded-[18px] border border-border bg-white p-4 sm:p-6 ${paused ? 'invisible' : ''}`}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><span className="rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700">{t('questionNumber', { current: current + 1, total: questions.length })}</span>{section && <span className="text-xs text-text-secondary">{section.label}</span>}</div><button type="button" onClick={() => props.onFlag(current)} aria-pressed={flagged.has(current)} className={`exam-control ${flagged.has(current) ? '!border-amber-300 !bg-amber-50 !text-amber-700' : ''}`}><Bookmark size={16} fill={flagged.has(current) ? 'currentColor' : 'none'} />{t(flagged.has(current) ? 'flagged' : 'flag')}</button></div>
          <fieldset disabled={submitting} className="min-w-0"><QuestionDisplay key={question.id} questionNumber={current + 1} totalQuestions={questions.length} text={question.text} images={question.images} options={question.options} selectedAnswer={answers[current] || null} onAnswer={props.onAnswer} questionType={question.type} hideNumber /></fieldset>
          <HintPanel key={question.id} hints={question.hints ?? []} />
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <button type="button" onClick={() => navigate(current - 1)} disabled={current === 0 || submitting} className="exam-control"><ChevronLeft size={17} />{t('previous')}</button>
            <label className="order-last flex min-h-11 w-full items-center justify-center gap-2 text-xs text-text-secondary sm:order-none sm:w-auto"><input type="checkbox" checked={props.autoNext} onChange={event => props.onAutoNext(event.target.checked)} className="h-4 w-4 accent-primary-600" />{t('autoNext')}</label>
            <button type="button" onClick={() => navigate(current + 1)} disabled={current === questions.length - 1 || submitting} aria-label={t(['MULTIPLE_CHOICE', 'TRUE_FALSE'].includes(question.type) ? 'next' : 'confirmNext')} className="exam-control !text-primary-700">{t('next')}<ChevronRight size={17} /></button>
          </div>
        </div>
        <aside className="exam-map order-first min-w-0 lg:order-none"><QuestionNav totalQuestions={questions.length} currentQuestion={current} answers={answers} onNavigate={navigate} flaggedQuestions={flagged} sections={sections} /><p className="mt-3 flex items-start justify-center gap-2 px-2 text-xs text-text-secondary"><Shuffle size={15} className="mt-0.5 shrink-0" /><span>{t('shuffleNote')}<br /><span className="text-[11px]">{t('stableOrder')}</span></span></p></aside>
      </div>
      {!props.untimed && <p className="my-4 flex items-center justify-center gap-1.5 text-xs text-text-secondary"><Check size={14} />{t('saved')}</p>}
    </div>
    {paused && <ExamDialog title={t('pausedTitle')} onClose={props.onResume}><p className="mb-6 text-sm leading-relaxed text-text-secondary">{t(props.timed ? 'pausedTimed' : 'pausedPractice')}</p><button type="button" className="exam-control w-full !border-primary-600 !bg-primary-600 !text-white" onClick={props.onResume}>{t('resume')}</button></ExamDialog>}
    {props.showFinish && !paused && <ExamDialog title={t('finishTitle')} onClose={() => props.onShowFinish(false)}>
      <dl className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'answered', value: count, color: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
          { label: 'unanswered', value: questions.length - count, color: 'border-rose-200 bg-rose-50 text-rose-800' },
          { label: 'flagged', value: flagged.size, color: 'border-amber-200 bg-amber-50 text-amber-800' },
        ].map(stat => <div key={stat.label} className={`min-w-0 rounded-xl border px-2 py-4 text-center ${stat.color}`}><dt className="text-[11px] font-medium sm:text-xs">{t(stat.label)}</dt><dd className="mt-2 text-3xl font-bold tabular-nums">{stat.value}</dd></div>)}
      </dl>
      <p className="mb-6 text-sm text-text-secondary">{t('finishNote')}</p><div className="flex flex-wrap justify-end gap-3"><button type="button" className="exam-control" onClick={() => props.onShowFinish(false)}>{t('resume')}</button><button type="button" disabled={submitting} className="exam-control !border-primary-600 !bg-primary-600 !text-white" onClick={() => { props.onShowFinish(false); props.onFinish(); }}>{t('finish')}</button></div>
    </ExamDialog>}
  </>;
}
