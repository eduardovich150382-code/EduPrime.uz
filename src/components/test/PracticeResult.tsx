'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, CheckCircle, FileText, RotateCcw, SkipForward, Video, XCircle } from 'lucide-react';
import { Link } from '@/i18n/routing';
import LatexRenderer from '@/components/ui/LatexRenderer';
import SecureYouTubePlayer from '@/components/ui/SecureYouTubePlayer';
import ResultQuestionMap from './ResultQuestionMap';
import ResultAnswerReview, { type ReviewQuestion } from './ResultAnswerReview';
import { RETAKE_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from './ResultRetakeFooter';
import { hasExamAnswer } from '@/lib/exam-presentation';

export interface PracticeReviewQuestion extends ReviewQuestion {
  id: string;
  images: string[];
  points: number;
  tags: string[];
  explanation: string | null;
  explanationImages: string[];
  videoUrl: string | null;
  /** Natija sahifasidagi asl raqam. */
  number: number | null;
}

export interface PracticeReview {
  correct: number;
  total: number;
  answers: { questionId: string; answer: string; isCorrect: boolean }[];
  questions: PracticeReviewQuestion[];
  categoryType: string | null;
}

// Mashq natijasi — rasmiy natija EMAS: ball/100, toifa aylanalari va
// tabriklar yo'q, faqat "N tadan K tasi" va savollar tahlili. Yopiq yechimni
// ochish (kvota) va AI tushuntirish natija sahifasida qoladi — mashq kvota
// sarflamaydi va hech narsa yozmaydi.
export default function PracticeResult({ review, order, backHref, onRetry }: {
  review: PracticeReview;
  /** Foydalanuvchi mashqda ko'rgan tartib (savol id'lari). */
  order: string[];
  backHref: string;
  onRetry: (ids: string[]) => void;
}) {
  const t = useTranslations('exam');
  const r = useTranslations('results');
  const [openSolution, setOpenSolution] = useState<Record<string, 'written' | 'video' | null>>({});
  const position = new Map(order.map((id, index) => [id, index]));
  const questions = [...review.questions].sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0));
  const byId = new Map(review.answers.map((answer) => [answer.questionId, answer]));
  const numberOf = (id: string) => questions.find((q) => q.id === id)?.number ?? (position.get(id) ?? 0) + 1;
  const remaining = questions.filter((q) => !byId.get(q.id)?.isCorrect).map((q) => q.id);
  const toggle = (id: string, kind: 'written' | 'video') => setOpenSolution((prev) => ({ ...prev, [id]: prev[id] === kind ? null : kind }));

  return <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6">
    <Link href={backHref} className="inline-flex min-h-11 items-center gap-2 text-sm text-text-secondary transition-colors hover:text-primary-600">
      <ArrowLeft size={16} aria-hidden="true" />{t('practice.backToResult')}
    </Link>

    <section className="rounded-2xl border border-border bg-white p-5 text-center shadow-sm sm:p-8">
      <p className="mb-2 inline-flex rounded-full border border-primary-200 bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-800">{t('practice.badge', { count: review.total })}</p>
      <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">{t('practice.resultTitle')}</h1>
      <p className="mt-3 text-lg font-semibold tabular-nums text-text-primary">{t('practice.summary', { total: review.total, correct: review.correct })}</p>
      <p className="mt-2 text-sm text-text-secondary">{t('practice.note')}</p>
      <div className="mx-auto mt-6 flex max-w-md flex-col gap-3">
        {remaining.length > 0 && <button type="button" onClick={() => onRetry(remaining)} className={RETAKE_BUTTON_CLASS}>
          <RotateCcw size={20} aria-hidden="true" />{t('practice.retryRemaining', { count: remaining.length })}
        </button>}
        <Link href={backHref} className={SECONDARY_BUTTON_CLASS}><ArrowLeft size={16} aria-hidden="true" />{t('practice.backToResult')}</Link>
      </div>
    </section>

    <ResultQuestionMap questions={questions} answers={review.answers} categoryType={review.categoryType} numberOf={numberOf} onSelect={(id) => {
      requestAnimationFrame(() => {
        const element = document.getElementById(`practice-question-${id}`);
        element?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        element?.focus({ preventScroll: true });
      });
    }} />

    <section className="space-y-4">
      {questions.map((question) => {
        const record = byId.get(question.id);
        const userAnswer = record?.answer || '';
        const isCorrect = record?.isCorrect || false;
        const isSkipped = !isCorrect && !hasExamAnswer(userAnswer);
        const Icon = isCorrect ? CheckCircle : isSkipped ? SkipForward : XCircle;
        return <article key={question.id} id={`practice-question-${question.id}`} tabIndex={-1}
          className={`min-w-0 scroll-mt-24 overflow-hidden rounded-xl border-2 ${isCorrect ? 'border-green-200 bg-green-50/30' : isSkipped ? 'border-gray-200 bg-gray-50/30' : 'border-red-200 bg-red-50/30'}`}>
          <div className="flex items-start gap-3 p-4">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isCorrect ? 'bg-green-100 text-green-700' : isSkipped ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'}`}><Icon size={16} aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <p className="review-copy font-medium text-text-primary">{numberOf(question.id)}. <LatexRenderer content={question.text} /></p>
              <p className={`mt-1 text-xs ${isCorrect ? 'text-green-600' : isSkipped ? 'text-gray-500' : 'text-red-600'}`}>{isCorrect ? r('answerCorrect') : isSkipped ? r('notAnswered') : r('answerIncorrect')}</p>
            </div>
          </div>
          <div className="border-t border-inherit px-4 pb-4">
            {question.images.length > 0 && <div className="mt-3 flex flex-wrap gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- natija sahifasidagi savol rasmlari bilan bir xil */}
              {question.images.map((img, index) => <img key={index} src={img} alt={r('questionImage', { number: index + 1 })} className="max-h-48 w-auto max-w-full rounded-lg border border-border object-contain" />)}
            </div>}
            <ResultAnswerReview question={question} userAnswer={userAnswer} isCorrect={isCorrect} isSkipped={isSkipped} />
            {(question.explanation || question.videoUrl) && <div className="mt-4 flex flex-wrap gap-3">
              {question.explanation && <button type="button" onClick={() => toggle(question.id, 'written')} aria-expanded={openSolution[question.id] === 'written'}
                className="flex min-h-11 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-medium text-blue-700 hover:bg-blue-100"><FileText size={16} aria-hidden="true" />{r('writtenSolution')}</button>}
              {question.videoUrl && <button type="button" onClick={() => toggle(question.id, 'video')} aria-expanded={openSolution[question.id] === 'video'}
                className="flex min-h-11 items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 text-sm font-medium text-purple-700 hover:bg-purple-100"><Video size={16} aria-hidden="true" />{r('videoSolution')}</button>}
            </div>}
            {openSolution[question.id] === 'written' && question.explanation && <div className="review-copy mt-4 min-w-0 whitespace-pre-line rounded-xl border border-blue-200 bg-blue-50 p-4 text-text-primary">
              <LatexRenderer content={question.explanation} />
            </div>}
            {openSolution[question.id] === 'video' && question.videoUrl && <div className="mt-4">
              <SecureYouTubePlayer videoUrl={question.videoUrl} title={r('questionVideoTitle', { number: numberOf(question.id) })} onClose={() => toggle(question.id, 'video')} />
            </div>}
          </div>
        </article>;
      })}
      <p className="text-center text-xs text-text-secondary">{t('practice.moreOnResult')}</p>
    </section>
  </div>;
}
