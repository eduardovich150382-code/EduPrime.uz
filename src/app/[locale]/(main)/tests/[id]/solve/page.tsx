'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import QuestionDisplay from '@/components/test/QuestionDisplay';
import TestTimer from '@/components/test/TestTimer';
import QuestionNav from '@/components/test/QuestionNav';
import BackButton from '@/components/ui/BackButton';
import { ChevronLeft, ChevronRight, Flag, AlertCircle, Loader2, Keyboard, Maximize, Bookmark } from 'lucide-react';

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
  const [accessDenied, setAccessDenied] = useState<{ accessType: string; price?: number; testTitle?: string } | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startTime] = useState(Date.now());
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [autoNext, setAutoNext] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [questionTimeSpent, setQuestionTimeSpent] = useState<Record<number, number>>({});
  const questionStartTimeRef = useRef<number>(Date.now());

  // Auto-save to localStorage
  useEffect(() => {
    if (!test) return;
    const key = `test_progress_${testId}`;
    const saved = localStorage.getItem(key);
    if (saved && Object.keys(answers).length === 0) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.answers) setAnswers(parsed.answers);
        if (parsed.currentQuestion !== undefined) setCurrentQuestion(parsed.currentQuestion);
        if (parsed.flagged) setFlaggedQuestions(new Set(parsed.flagged));
      } catch {}
    }
  }, [test, testId]);

  useEffect(() => {
    if (!test) return;
    const key = `test_progress_${testId}`;
    const data = {
      answers,
      currentQuestion,
      flagged: Array.from(flaggedQuestions),
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(data));
  }, [answers, currentQuestion, flaggedQuestions, testId, test]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!test) return;
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const totalQ = test.questions.length;
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          if (currentQuestion < totalQ - 1) setCurrentQuestion(currentQuestion + 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (currentQuestion > 0) setCurrentQuestion(currentQuestion - 1);
          break;
        case 'a': case 'A':
          e.preventDefault();
          handleAnswer('A');
          break;
        case 'b': case 'B':
          e.preventDefault();
          handleAnswer('B');
          break;
        case 'c': case 'C':
          e.preventDefault();
          handleAnswer('C');
          break;
        case 'd': case 'D':
          e.preventDefault();
          handleAnswer('D');
          break;
        case 'e': case 'E':
          e.preventDefault();
          handleAnswer('E');
          break;
        case 'f': case 'F':
          e.preventDefault();
          toggleFlag(currentQuestion);
          break;
        case '?':
          setShowShortcuts(prev => !prev);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [test, currentQuestion]);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFlag = (index: number) => {
    setFlaggedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

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
        // First check access
        const accessRes = await fetch(`/api/subscription/check-access?testId=${testId}`);
        const accessData = await accessRes.json();

        if (accessRes.ok && accessData.hasAccess === false) {
          setAccessDenied({
            accessType: accessData.accessType,
            price: accessData.price,
            testTitle: accessData.testTitle,
          });
          setLoading(false);
          return;
        }

        // If access granted, fetch test
        const res = await fetch(`/api/tests/${testId}`);
        const data = await res.json();
        if (data.test) {
          setTest(data.test);
          // Reset question timer when test loads
          questionStartTimeRef.current = Date.now();
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
    // Auto-next: go to next question after selecting answer
    if (autoNext && test && currentQuestion < test.questions.length - 1) {
      // Track time before auto-navigating
      const elapsed = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
      setQuestionTimeSpent(prev => ({ ...prev, [currentQuestion]: (prev[currentQuestion] || 0) + elapsed }));
      questionStartTimeRef.current = Date.now();
      setTimeout(() => setCurrentQuestion(currentQuestion + 1), 300);
    }
  };

  const handleNext = () => {
    if (test && currentQuestion < test.questions.length - 1) {
      // Track time spent on current question
      const elapsed = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
      setQuestionTimeSpent(prev => ({ ...prev, [currentQuestion]: (prev[currentQuestion] || 0) + elapsed }));
      questionStartTimeRef.current = Date.now();
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      // Track time spent on current question
      const elapsed = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
      setQuestionTimeSpent(prev => ({ ...prev, [currentQuestion]: (prev[currentQuestion] || 0) + elapsed }));
      questionStartTimeRef.current = Date.now();
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleFinish = useCallback(async () => {
    if (!test || submitting) return;
    setSubmitting(true);

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    // Capture time for current question before submit
    const elapsed = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
    const finalTimeSpent = { ...questionTimeSpent, [currentQuestion]: (questionTimeSpent[currentQuestion] || 0) + elapsed };

    // Prepare answers array with per-question time
    const answerArray = test.questions.map((q, i) => ({
      questionId: q.id,
      answer: answers[i] || '',
      timeSpent: finalTimeSpent[i] || 0,
    }));

    try {
      const res = await fetch(`/api/tests/${testId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answerArray, timeSpent }),
      });

      const data = await res.json();

      if (res.ok && data.result) {
        // Clear saved progress
        localStorage.removeItem(`test_progress_${testId}`);
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
    // Access denied — show lock screen
    if (accessDenied) {
      return (
        <div className="max-w-md mx-auto text-center py-16">
          <div className="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={36} className="text-primary-600" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Test yopiq</h2>
          <p className="text-text-secondary mb-6">
            {accessDenied.testTitle && <span className="font-medium">&ldquo;{accessDenied.testTitle}&rdquo;</span>}
            {' '}testiga kirish uchun
            {accessDenied.accessType === 'premium' && ' Premium tarif'}
            {accessDenied.accessType === 'teacher' && ' Ustoz tarif'}
            {accessDenied.accessType === 'premium_teacher' && ' Premium yoki Ustoz tarif'}
            {accessDenied.accessType === 'paid' && ` ${(accessDenied.price || 0).toLocaleString()} so'm to'lash`}
            {' '}kerak.
          </p>
          {accessDenied.accessType === 'paid' ? (
            <a
              href={`https://t.me/EduPrimeuzbot?start=buy_test_${testId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2"
            >
              Sotib olish — {(accessDenied.price || 0).toLocaleString()} so&apos;m
            </a>
          ) : (
            <a href="/pricing" className="btn-primary inline-flex items-center gap-2">
              Tariflar sahifasi
            </a>
          )}
        </div>
      );
    }

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
    <div className="max-w-7xl mx-auto" ref={containerRef}>
      <BackButton className="mb-4" />
      {/* Top bar — sticky with progress */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-16 z-30 card p-0 mb-4 sm:mb-6 overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 gap-3 sm:gap-0">
          <div>
            <h1 className="font-semibold text-text-primary text-sm sm:text-base">{test.titleUz}</h1>
            <p className="text-xs text-text-secondary">
              {answeredCount}/{totalQuestions} javob berilgan
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <TestTimer totalSeconds={test.duration * 60} onTimeUp={handleFinish} />
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-primary-50 text-text-secondary hover:text-primary-600 transition-colors hidden sm:flex"
              title="Fullscreen (F11)"
            >
              <Maximize size={16} />
            </button>
            <button
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="p-2 rounded-lg hover:bg-primary-50 text-text-secondary hover:text-primary-600 transition-colors hidden sm:flex"
              title="Klaviatura yorliqlari (?)"
            >
              <Keyboard size={16} />
            </button>
            <button
              onClick={() => setShowFinishDialog(true)}
              disabled={submitting}
              className="btn-primary !py-2 !px-3 sm:!px-4 text-sm flex items-center gap-2"
            >
              <Flag size={14} />
              Tugatish
            </button>
          </div>
        </div>
        {/* Progress bar inside sticky header */}
        <div className="w-full h-1.5 bg-gray-100">
          <motion.div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600"
            initial={{ width: 0 }}
            animate={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </motion.div>

      {/* Keyboard shortcuts modal */}
      {showShortcuts && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4 mb-4 text-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-text-primary">Klaviatura yorliqlari</h4>
            <button onClick={() => setShowShortcuts(false)} className="text-text-secondary hover:text-text-primary">&times;</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-text-secondary">
            <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded font-mono">A-E</kbd> Javob tanlash</span>
            <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded font-mono">&larr; &rarr;</kbd> Navigatsiya</span>
            <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded font-mono">F</kbd> Belgilash</span>
          </div>
        </motion.div>
      )}

      {/* Auto-next toggle */}
      <div className="flex items-center justify-end gap-3 mb-4">
        <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoNext}
            onChange={(e) => setAutoNext(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-border text-primary-600 focus:ring-primary-500"
          />
          Javobdan keyin keyingiga o&apos;tish
        </label>
      </div>

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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleFlag(currentQuestion)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    flaggedQuestions.has(currentQuestion)
                      ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                      : 'text-text-secondary hover:bg-yellow-50 hover:text-yellow-600'
                  }`}
                  title="Belgilash (F)"
                >
                  <Bookmark size={14} fill={flaggedQuestions.has(currentQuestion) ? 'currentColor' : 'none'} />
                  {flaggedQuestions.has(currentQuestion) ? 'Belgilangan' : 'Belgilash'}
                </button>
                <span className="text-sm text-text-secondary">{currentQuestion + 1} / {totalQuestions}</span>
              </div>
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
            onNavigate={(index) => {
              // Track time on current question before navigating
              const elapsed = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
              setQuestionTimeSpent(prev => ({ ...prev, [currentQuestion]: (prev[currentQuestion] || 0) + elapsed }));
              questionStartTimeRef.current = Date.now();
              setCurrentQuestion(index);
            }}
            flaggedQuestions={flaggedQuestions}
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
