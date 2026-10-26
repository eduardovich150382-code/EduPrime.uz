'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from '@/i18n/routing';
import BackButton from '@/components/ui/BackButton';
import ExamWorkspace from './ExamWorkspace';
import TestLockedNotice, { type TestAccessDenied } from './TestLockedNotice';
import PracticeResult, { type PracticeReview } from './PracticeResult';
import { useAutoAdvance } from './useAutoAdvance';
import { isPhysicsSubject, shufflePresentedQuestions } from '@/lib/exam-presentation';
import { withReturnTo } from '@/lib/safe-return-path';
import type { QuestionOption } from '@/types';

interface PracticeQuestion {
  id: string; text: string; images: string[]; type: string;
  options: QuestionOption[] | { left: string[]; right: string[] };
  subjectId?: string | null; section?: string | null; hints?: string[];
}

interface PracticeTest {
  titleUz: string;
  subject: { nameUz?: string; nameRu?: string; nameEn?: string } | null;
}

type Phase = 'loading' | 'locked' | 'error' | 'empty' | 'solving' | 'result';

/**
 * Xatolar ustida mashq (`/tests/[id]/solve?practice=<resultId>`). Asosiy
 * yechish oqimidan ATAYLAB alohida: `test_progress_` / `test_clock_`
 * kalitlariga tegmaydi va ularni o'qimaydi (S12 qoralamasi, "Davom etish"
 * bloki va muddati o'tgan qoralama ekrani mashqdan bexabar qoladi). Mashq
 * qoralamasi saqlanmaydi — u qisqa va oqibatsiz. Taymer yo'q.
 */
export default function PracticeSolve({ testId, resultId, returnTo }: { testId: string; resultId: string; returnTo: string | null }) {
  const t = useTranslations('exam');
  const [phase, setPhase] = useState<Phase>('loading');
  const [accessDenied, setAccessDenied] = useState<TestAccessDenied | null>(null);
  const [test, setTest] = useState<PracticeTest | null>(null);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  // 2-raunddan boshlab server shu to'plamni tekshiradi; 1-raundda — natijadan o'zi.
  const [roundIds, setRoundIds] = useState<string[] | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [autoNext, setAutoNext] = useState(true);
  const [showFinish, setShowFinish] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkError, setCheckError] = useState(false);
  const [review, setReview] = useState<PracticeReview | null>(null);
  const submitLock = useRef(false);
  const backHref = withReturnTo(`/results/${resultId}`, returnTo);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const accessRes = await fetch(`/api/subscription/check-access?testId=${encodeURIComponent(testId)}`);
        const accessData = await accessRes.json();
        if (cancelled) return;
        if (accessRes.ok && accessData.hasAccess === false) {
          setAccessDenied({ accessType: accessData.accessType, price: accessData.price, testTitle: accessData.testTitle, categoryType: accessData.categoryType });
          setPhase('locked');
          return;
        }
        const res = await fetch(`/api/tests/${encodeURIComponent(testId)}?practice=${encodeURIComponent(resultId)}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.test) { setPhase('error'); return; }
        const served: PracticeQuestion[] = data.test.questions;
        setTest({ titleUz: data.test.titleUz, subject: data.test.subject ?? null });
        setQuestions(shufflePresentedQuestions(served, crypto.getRandomValues(new Uint32Array(1))[0]));
        setPhase(served.length > 0 ? 'solving' : 'empty');
      } catch {
        if (!cancelled) setPhase('error');
      }
    })();
    return () => { cancelled = true; };
  }, [testId, resultId]);

  const navigate = (index: number) => {
    advance.cancel();
    if (submitting || index < 0 || index >= questions.length) return;
    setCurrent(index);
  };
  const advance = useAutoAdvance(autoNext, showFinish || submitting, current, questions.length, navigate);

  const handleAnswer = (answer: string) => {
    const question = questions[current];
    if (!question || submitting) return;
    if (['MULTIPLE_CHOICE', 'TRUE_FALSE'].includes(question.type) && (!Array.isArray(question.options) || !question.options.some(option => option.label === answer))) return;
    setAnswers(prev => ({ ...prev, [current]: answer }));
    advance.schedule(question.type, answer);
  };

  const toggleFlag = (index: number) => {
    advance.cancel();
    setFlagged(prev => { const next = new Set(prev); if (next.has(index)) next.delete(index); else next.add(index); return next; });
  };

  const handleFinish = useCallback(async () => {
    if (submitLock.current) return;
    advance.cancel();
    submitLock.current = true;
    setSubmitting(true);
    setCheckError(false);
    try {
      const res = await fetch(`/api/tests/${encodeURIComponent(testId)}/practice-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resultId,
          answers: questions.map((q, i) => ({ questionId: q.id, answer: answers[i] || '', timeSpent: 0 })),
          ...(roundIds ? { questionIds: roundIds } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.practice) throw new Error(data.error);
      setReview(data.practice);
      setPhase('result');
      window.scrollTo({ top: 0 });
    } catch {
      setCheckError(true);
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }, [advance, testId, resultId, questions, answers, roundIds]);

  const retry = (ids: string[]) => {
    const wanted = new Set(ids);
    setQuestions(prev => prev.filter(q => wanted.has(q.id)));
    setRoundIds(ids);
    setAnswers({}); setFlagged(new Set()); setCurrent(0); setReview(null);
    setPhase('solving');
    window.scrollTo({ top: 0 });
  };

  if (phase === 'loading') {
    return <div className="flex min-h-[60vh] items-center justify-center" role="status">
      <div className="text-center"><Loader2 size={40} className="mx-auto mb-4 animate-spin text-primary-600" aria-hidden="true" /><p className="text-text-secondary">{t('practice.loading')}</p></div>
    </div>;
  }
  if (phase === 'locked' && accessDenied) return <TestLockedNotice testId={testId} accessDenied={accessDenied} />;
  if (phase === 'error' || phase === 'empty' || !test) {
    return <div className="mx-auto max-w-md py-16 text-center">
      <AlertCircle size={40} className="mx-auto mb-4 text-text-secondary" aria-hidden="true" />
      <p className="mb-6 text-text-secondary">{t(phase === 'empty' ? 'practice.nothingToPractice' : 'practice.loadError')}</p>
      <Link href={backHref} className="btn-primary inline-flex min-h-11 items-center gap-2"><ArrowLeft size={16} aria-hidden="true" />{t('practice.backToResult')}</Link>
    </div>;
  }
  if (phase === 'result' && review) {
    return <PracticeResult review={review} order={questions.map(q => q.id)} backHref={backHref} onRetry={retry} />;
  }

  return <div className="mx-auto max-w-7xl">
    <ExamWorkspace title={test.titleUz} questions={questions} current={current} answers={answers} flagged={flagged}
      totalSeconds={0} paused={false} untimed badge={t('practice.badge', { count: questions.length })}
      submitting={submitting} autoNext={autoNext} onAutoNext={value => { advance.cancel(); setAutoNext(value); }}
      onAnswer={handleAnswer} onNavigate={navigate} onFlag={toggleFlag} onPause={() => {}} onResume={() => {}}
      onFinish={handleFinish} showFinish={showFinish} onShowFinish={value => { advance.cancel(); setShowFinish(value); }}
      physics={isPhysicsSubject(test.subject)} before={<BackButton className="mb-4" />} />
    {checkError && <p role="alert" className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-[18px] bg-rose-50 p-4 text-sm text-rose-800 shadow-lg">{t('practice.checkError')}</p>}
  </div>;
}
