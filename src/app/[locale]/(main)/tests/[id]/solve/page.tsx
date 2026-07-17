'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import QuestionDisplay from '@/components/test/QuestionDisplay';
import TestTimer from '@/components/test/TestTimer';
import QuestionNav from '@/components/test/QuestionNav';
import BackButton from '@/components/ui/BackButton';
import { ChevronLeft, ChevronRight, Flag, AlertCircle, Loader2 } from 'lucide-react';

interface QuestionData {
  id: string;
  text: string;
  images: string[];
  options: { label: string; text: string; image: string | null }[];
  type: string;
  points: number;
  order: number;
}

interface TestData {
  id: string;
  titleUz: string;
  duration: number;
  questionCount: number;
  questions: QuestionData[];
  subject: { nameUz: string };
}

export default function TestSolvePage() {
  const router = useRouter();
  const params = useParams();
  const testId = params.id as string;

  const [test, setTest] = useState<TestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startTime] = useState(Date.now());
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);

  // Anti-cheating: detect tab/window switch
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && test) {
        setTabSwitchCount((prev) => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            // After 3 tab switches, show persistent warning
            setShowTabWarning(true);
          }
          return newCount;
        });
        setShowTabWarning(true);
        // Auto-hide warning after 3 seconds
        setTimeout(() => setShowTabWarning(false), 4000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [test]);

  // Fetch test
  useEffect(() => {
    async function fetchTest() {
      try {
        const res = await fetch(`/api/tests/${testId}`);
        const data = await res.json();
        if (data.test) {
          setTest(data.test);
        }
      } catch (error) {
        console.error('Failed to fetch test:', error);
      }
      setLoading(false);
    }
    fetchTest();
  }, [testId]);

  const handleAnswer = (answer: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion]: answer }));
  };

  const handleNext = () => {
    if (test && currentQuestion < test.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleFinish = useCallback(async () => {
    if (!test || submitting) return;
    setSubmitting(true);

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    // Prepare answers array
    const answerArray = test.questions.map((q, i) => ({
      questionId: q.id,
      answer: answers[i] || '',
    }));

    try {
      const res = await fetch(`/api/tests/${testId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answerArray, timeSpent }),
      });

      const data = await res.json();

      if (res.ok && data.result) {
        router.push(`/results/${data.result.id}`);
      } else {
        alert(data.error || 'Xatolik yuz berdi');
        setSubmitting(false);
      }
    } catch (error) {
      alert('Server xatolik');
      setSubmitting(false);
    }
  }, [test, answers, testId, startTime, submitting, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-text-secondary">Test yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (!test || test.questions.length === 0) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-text-primary mb-2">Test topilmadi</h2>
        <p className="text-text-secondary">Bu test mavjud emas yoki savollar hali qo&apos;shilmagan</p>
      </div>
    );
  }

  const question = test.questions[currentQuestion];
  const totalQuestions = test.questions.length;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="max-w-7xl mx-auto">
      <BackButton className="mb-4" />
      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 card p-3 sm:p-4 gap-3 sm:gap-0"
      >
        <div>
          <h1 className="font-semibold text-text-primary text-sm sm:text-base">{test.titleUz}</h1>
          <p className="text-xs text-text-secondary">
            {answeredCount}/{totalQuestions} javob berilgan
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <TestTimer totalSeconds={test.duration * 60} onTimeUp={handleFinish} />
          <button
            onClick={() => setShowFinishDialog(true)}
            disabled={submitting}
            className="btn-primary !py-2 !px-3 sm:!px-4 text-sm flex items-center gap-2"
          >
            <Flag size={14} />
            Tugatish
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Main content */}
        <div className="lg:col-span-3 order-2 lg:order-1">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="card p-4 sm:p-6"
          >
            <QuestionDisplay
              questionNumber={currentQuestion + 1}
              totalQuestions={totalQuestions}
              text={question.text}
              images={question.images}
              options={question.options}
              selectedAnswer={answers[currentQuestion] || null}
              onAnswer={handleAnswer}
              questionType={question.type}
            />

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <button
                onClick={handlePrev}
                disabled={currentQuestion === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-text-secondary hover:text-primary-600 hover:bg-primary-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={18} /> Oldingi
              </button>
              <span className="text-sm text-text-secondary">{currentQuestion + 1} / {totalQuestions}</span>
              <button
                onClick={handleNext}
                disabled={currentQuestion === totalQuestions - 1}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-primary-600 hover:bg-primary-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Keyingi <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 order-1 lg:order-2">
          <QuestionNav
            totalQuestions={totalQuestions}
            currentQuestion={currentQuestion}
            answers={answers}
            onNavigate={setCurrentQuestion}
          />
        </div>
      </div>

      {/* Tab switch warning */}
      {showTabWarning && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 max-w-sm"
        >
          <AlertCircle size={20} className="flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold">Ogohlantirish!</p>
            <p className="text-xs opacity-90">
              Boshqa tab/ilovaga o&apos;tish aniqlandi ({tabSwitchCount} marta). Test davomida sahifani tark etmang.
            </p>
          </div>
        </motion.div>
      )}

      {/* Finish dialog */}
      {showFinishDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
          >
            <div className="text-center">
              <AlertCircle size={48} className="text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-text-primary mb-2">Testni tugatishni xohlaysizmi?</h3>
              <p className="text-sm text-text-secondary mb-6">
                {answeredCount}/{totalQuestions} savolga javob berdingiz.
                {answeredCount < totalQuestions && (
                  <span className="block text-yellow-600 mt-1">
                    {totalQuestions - answeredCount} ta savol javobsiz qoladi
                  </span>
                )}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowFinishDialog(false)} className="flex-1 btn-secondary !py-2.5">
                  Davom etish
                </button>
                <button
                  onClick={() => { setShowFinishDialog(false); handleFinish(); }}
                  disabled={submitting}
                  className="flex-1 btn-primary !py-2.5 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
                  Tugatish
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
