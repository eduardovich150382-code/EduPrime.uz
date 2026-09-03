'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, CheckCircle2, XCircle, RotateCcw, ListChecks } from 'lucide-react';
import QuestionDisplay from '@/components/test/QuestionDisplay';
import LatexRenderer from '@/components/ui/LatexRenderer';

interface PracticeQuestion {
  id: string;
  text: string;
  images: string[];
  options: { label: string; text: string; image: string | null }[] | { left: string[]; right: string[] };
  type: string;
  points: number;
}

interface CheckResult {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string | null;
  explanationImages: string[];
}

interface Props {
  blockId: string;
  itemCount: number;
}

/**
 * PRACTICE dars bloki — baholanmaydigan mashq (S22b). Har bir savol darhol
 * tekshiriladi (`QuestionDisplay`ning `isReview` rejimi qayta ishlatiladi —
 * to'g'ri/noto'g'ri variantlarni allaqachon o'zi belgilaydi), hech qanday
 * ball/`TestResult` yo'q. "Qaytadan" — `start` marshrutini qayta chaqiradi,
 * server YANGI urug' bilan qayta aralashtiradi (`lib/sessions.ts`).
 */
export default function PracticeBlock({ blockId, itemCount }: Props) {
  const t = useTranslations('courseLearn');
  const [status, setStatus] = useState<'idle' | 'loading' | 'active' | 'error'>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [draftAnswer, setDraftAnswer] = useState<string>('');
  const [checked, setChecked] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const start = async () => {
    setStatus('loading');
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/lesson-blocks/${blockId}/practice/start`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('practiceError'));
      setSessionId(data.sessionId);
      setQuestions(data.questions);
      setIndex(0);
      setDraftAnswer('');
      setChecked(null);
      setCorrectCount(0);
      setStatus('active');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('practiceError'));
      setStatus('error');
    }
  };

  const checkAnswer = async () => {
    if (!sessionId || !draftAnswer.trim() || checking) return;
    setChecking(true);
    setErrorMsg(null);
    try {
      const question = questions[index];
      const res = await fetch(`/api/lesson-blocks/${blockId}/practice/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, questionId: question.id, answer: draftAnswer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('practiceError'));
      setChecked(data);
      if (data.isCorrect) setCorrectCount((c) => c + 1);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('practiceError'));
    }
    setChecking(false);
  };

  const next = () => {
    setDraftAnswer('');
    setChecked(null);
    setIndex((i) => i + 1);
  };

  if (status === 'idle' || status === 'error') {
    return (
      <div className="p-4 rounded-xl border border-border bg-gray-50/50 text-center space-y-3">
        <ListChecks size={22} className="mx-auto text-primary-500" />
        <p className="text-sm text-text-secondary">{t('practiceIntro', { count: itemCount })}</p>
        {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
        <button type="button" onClick={start} className="btn-primary min-h-[44px] px-5 text-sm">
          {t('practiceStart')}
        </button>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="p-6 flex items-center justify-center text-text-secondary">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (index >= questions.length) {
    return (
      <div className="p-4 rounded-xl border border-border bg-gray-50/50 text-center space-y-3">
        <p className="text-base font-semibold text-text-primary">
          {t('practiceResult', { correct: correctCount, total: questions.length })}
        </p>
        <button type="button" onClick={start} className="btn-secondary min-h-[44px] px-5 text-sm inline-flex items-center gap-2 mx-auto">
          <RotateCcw size={15} /> {t('practiceRetry')}
        </button>
      </div>
    );
  }

  const question = questions[index];
  const isLast = index === questions.length - 1;

  return (
    <div className="space-y-4">
      <QuestionDisplay
        questionNumber={index + 1}
        totalQuestions={questions.length}
        text={question.text}
        images={question.images}
        options={question.options}
        selectedAnswer={draftAnswer || null}
        onAnswer={setDraftAnswer}
        questionType={question.type}
        isReview={!!checked}
        correctAnswer={checked?.correctAnswer}
      />

      {checked && (
        <div className={`p-3 rounded-xl border flex items-start gap-2 ${checked.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {checked.isCorrect ? (
            <CheckCircle2 size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          )}
          <div className="text-sm">
            <p className={checked.isCorrect ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
              {checked.isCorrect ? t('practiceCorrect') : t('practiceIncorrect')}
            </p>
            {checked.explanation && (
              <div className="mt-1 text-text-secondary">
                <LatexRenderer content={checked.explanation} />
              </div>
            )}
          </div>
        </div>
      )}

      {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

      <div className="flex justify-end">
        {!checked ? (
          <button
            type="button"
            onClick={checkAnswer}
            disabled={!draftAnswer.trim() || checking}
            className="btn-primary min-h-[44px] px-5 text-sm disabled:opacity-50 inline-flex items-center gap-2"
          >
            {checking && <Loader2 size={14} className="animate-spin" />} {t('practiceCheck')}
          </button>
        ) : (
          <button type="button" onClick={next} className="btn-primary min-h-[44px] px-5 text-sm">
            {isLast ? t('practiceFinish') : t('practiceNext')}
          </button>
        )}
      </div>
    </div>
  );
}
