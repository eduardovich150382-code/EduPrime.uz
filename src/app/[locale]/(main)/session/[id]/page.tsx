'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, useRouter as useLocaleRouter } from '@/i18n/routing';
import QuestionDisplay from '@/components/test/QuestionDisplay';
import TestTimer from '@/components/test/TestTimer';
import QuestionNav from '@/components/test/QuestionNav';
import { ChevronLeft, ChevronRight, Flag, AlertCircle, Loader2, LogOut } from 'lucide-react';
import { DTM_TITLE_PREFIX } from '@/lib/dtm-online-shared';
import { remainingSeconds } from './lib/remainingSeconds';
import { resolveDraftStartTime } from './lib/sessionDraft';

// Sahifa yangilansa (Android'da brauzer tabni tashlab yuborishi odatiy
// hol) javoblar yo'qolmasligi uchun qoralama localStorage'ga yoziladi.
// Baholash SERVERDA bo'ladi — bu faqat foydalanuvchi qulayligi uchun,
// xavfsizlik chegarasi emas.
function draftKey(sessionId: string): string {
  return `session-draft:${sessionId}`;
}

function clearDraft(sessionId: string): void {
  try {
    localStorage.removeItem(draftKey(sessionId));
  } catch {
    // private rejim yoki storage bloklangan bo'lishi mumkin — e'tiborsiz qoldiramiz
  }
}

// Konstruktordan ("/build") kelgan virtual TestSession'ni yechish sahifasi.
// `tests/[id]/solve/page.tsx`ning soddalashtirilgan nusxasi — ma'lumot
// manbai boshqa (`/api/sessions/[id]`, Test o'rniga), paywall/access
// tekshiruvi yo'q (sessiya allaqachon egasiga tegishli — item-picker faqat
// ochiq/PUBLIC itemlardan tanlaydi) va DTM Online uslubidagi bo'lim
// guruhlash (sections) yo'q, chunki sessiya savollari bunday tuzilishga
// ega emas.
interface SessionQuestion {
  id: string;
  text: string;
  images: string[];
  options: { label: string; text: string; image: string | null }[] | { left: string[]; right: string[] };
  type: string;
  points: number;
}

interface SessionData {
  id: string;
  title: string;
  durationMin: number;
  expiresAt: string;
  submittedAt: string | null;
  questionCount: number;
  questions: SessionQuestion[];
}

export default function SessionSolvePage() {
  const router = useRouter();
  const localeRouter = useLocaleRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const t = useTranslations('sessionSolve');

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const questionTimeSpentRef = useRef<Record<number, number>>({});
  const questionStartTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        const data = await res.json();
        if (!res.ok || !data.session) {
          setLoadError(data.error || 'Sessiya topilmadi');
          setLoading(false);
          return;
        }
        if (data.session.submittedAt) {
          clearDraft(sessionId);
          setLoadError('Bu sessiya allaqachon topshirilgan');
          setLoading(false);
          return;
        }
        if (new Date(data.session.expiresAt).getTime() < Date.now()) {
          clearDraft(sessionId);
          setLoadError('Sessiya muddati tugagan');
          setLoading(false);
          return;
        }
        setSession(data.session);
        questionStartTimeRef.current = Date.now();

        // Qoralamani tiklash — yangilashdan oldingi holatga qaytarish.
        try {
          const raw = localStorage.getItem(draftKey(sessionId));
          if (raw) {
            const draft = JSON.parse(raw);
            const questionCount = data.session.questions.length;
            if (draft.answers && typeof draft.answers === 'object') {
              setAnswers(draft.answers);
            }
            if (Array.isArray(draft.flaggedQuestions)) {
              setFlaggedQuestions(new Set(draft.flaggedQuestions));
            }
            if (draft.questionTimeSpent && typeof draft.questionTimeSpent === 'object') {
              questionTimeSpentRef.current = draft.questionTimeSpent;
            }
            if (
              typeof draft.currentQuestion === 'number' &&
              draft.currentQuestion >= 0 &&
              draft.currentQuestion < questionCount
            ) {
              setCurrentQuestion(draft.currentQuestion);
            }
            // Eski qoralamalarda (bu maydon qo'shilishidan oldingi) startTime
            // yo'q — shunday holatda `prev` (shu sahifa ochilgan payt) qoladi.
            setStartTime((prev) => resolveDraftStartTime(draft.startTime, prev));
          }
        } catch {
          // Qoralama buzilgan yoki storage o'qilmadi — bo'sh holatdan boshlaymiz
        }
      } catch {
        setLoadError('Server xatolik');
      }
      setLoading(false);
    }
    fetchSession();
  }, [sessionId]);

  // Har o'zgarishda qoralamani localStorage'ga yozadi (debounce 500ms) —
  // Android'da tab tashlab yuborilsa ham javoblar joyida qoladi.
  useEffect(() => {
    if (!session) return;
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey(sessionId),
          JSON.stringify({
            answers,
            flaggedQuestions: Array.from(flaggedQuestions),
            questionTimeSpent: questionTimeSpentRef.current,
            currentQuestion,
            startTime,
          })
        );
      } catch {
        // private rejim yoki storage to'lgan bo'lishi mumkin — sahifa baribir ishlashi kerak
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [session, sessionId, answers, flaggedQuestions, currentQuestion, startTime]);

  const handleAnswer = (answer: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion]: answer }));
  };

  const trackTimeAndGo = (index: number) => {
    const elapsed = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
    questionTimeSpentRef.current[currentQuestion] = (questionTimeSpentRef.current[currentQuestion] || 0) + elapsed;
    questionStartTimeRef.current = Date.now();
    setCurrentQuestion(index);
  };

  const toggleFlag = (index: number) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleFinish = useCallback(async () => {
    if (!session || submitting) return;
    setSubmitting(true);

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const elapsed = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
    const finalTimeSpent = {
      ...questionTimeSpentRef.current,
      [currentQuestion]: (questionTimeSpentRef.current[currentQuestion] || 0) + elapsed,
    };

    const answerArray = session.questions.map((q, i) => ({
      questionId: q.id,
      answer: answers[i] || '',
      timeSpent: finalTimeSpent[i] || 0,
    }));

    try {
      const res = await fetch(`/api/sessions/${sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answerArray, timeSpent }),
      });
      const data = await res.json();
      if (res.ok && data.result) {
        clearDraft(sessionId);
        router.push(`/results/${data.result.id}`);
      } else {
        alert(data.error || 'Xatolik yuz berdi');
        setSubmitting(false);
      }
    } catch {
      alert('Server xatolik');
      setSubmitting(false);
    }
  }, [session, answers, sessionId, startTime, submitting, router, currentQuestion]);

  // Sessiya DTM Online orqali yaratilganmi — sarlavha `DTM_TITLE_PREFIX`
  // bilan boshlanishidan bilinadi (generateDtmOnlineExam shu prefiks bilan
  // nomlaydi, qarang lib/dtm-online.ts). Shunga qarab "chiqish" konstruktor
  // (/build) o'rniga DTM Online sahifasiga qaytishi kerak — aks holda DTM
  // orqali kelgan foydalanuvchi konstruktorga tushib qolardi.
  const exitHref = session?.title?.startsWith(DTM_TITLE_PREFIX) ? '/dashboard/dtm-online' : '/build';

  // "Testdan chiqish" — brauzer tarixiga tayanadigan BackButton o'rniga
  // aniq manzilga qaytaradi. Bironta javob belgilangan bo'lsa tasdiq
  // so'raladi, chunki test o'rtasida "ortga" bosish sessiyani jimgina
  // tashlab ketishi mumkin edi (javoblar baribir qoralamada saqlanadi).
  const handleExitClick = () => {
    if (Object.keys(answers).length > 0) {
      setShowExitDialog(true);
    } else {
      localeRouter.push(exitHref);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-text-secondary">Sessiya yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (!session || loadError) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-text-primary mb-2">Sessiya ochilmadi</h2>
        <p className="text-text-secondary">{loadError || "Bu sessiya mavjud emas yoki savollari yo'q"}</p>
        <Link href="/build" className="btn-primary inline-flex items-center gap-2 mt-6">
          Yangi test tuzish
        </Link>
      </div>
    );
  }

  const question = session.questions[currentQuestion];
  const totalQuestions = session.questions.length;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="max-w-7xl mx-auto">
      <button
        onClick={handleExitClick}
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary-600 transition-colors mb-4"
      >
        <LogOut size={16} />
        <span>{t('exitButton')}</span>
      </button>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-16 z-30 card p-0 mb-4 sm:mb-6 overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 gap-3 sm:gap-0">
          <div>
            <h1 className="font-semibold text-text-primary text-sm sm:text-base">{session.title}</h1>
            <p className="text-xs text-text-secondary">{answeredCount}/{totalQuestions} javob berilgan</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <TestTimer totalSeconds={remainingSeconds(session.expiresAt)} onTimeUp={handleFinish} />
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
        <div className="w-full h-1.5 bg-gray-100">
          <motion.div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600"
            initial={{ width: 0 }}
            animate={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
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

            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <button
                onClick={() => trackTimeAndGo(currentQuestion - 1)}
                disabled={currentQuestion === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-text-secondary hover:text-primary-600 hover:bg-primary-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={18} /> Oldingi
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleFlag(currentQuestion)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    flaggedQuestions.has(currentQuestion)
                      ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                      : 'text-text-secondary hover:bg-yellow-50 hover:text-yellow-600'
                  }`}
                >
                  {flaggedQuestions.has(currentQuestion) ? 'Belgilangan' : 'Belgilash'}
                </button>
                <span className="text-sm text-text-secondary">{currentQuestion + 1} / {totalQuestions}</span>
              </div>
              <button
                onClick={() => trackTimeAndGo(currentQuestion + 1)}
                disabled={currentQuestion === totalQuestions - 1}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-primary-600 hover:bg-primary-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Keyingi <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        </div>

        <div className="lg:col-span-1 order-1 lg:order-2">
          <QuestionNav
            totalQuestions={totalQuestions}
            currentQuestion={currentQuestion}
            answers={answers}
            onNavigate={trackTimeAndGo}
            flaggedQuestions={flaggedQuestions}
          />
        </div>
      </div>

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

      {showExitDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
          >
            <div className="text-center">
              <AlertCircle size={48} className="text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-text-primary mb-2">{t('exitConfirmTitle')}</h3>
              <p className="text-sm text-text-secondary mb-6">{t('exitConfirmBody')}</p>
              <div className="flex gap-3">
                <button onClick={() => setShowExitDialog(false)} className="flex-1 btn-secondary !py-2.5">
                  {t('exitConfirmStay')}
                </button>
                <button
                  onClick={() => { setShowExitDialog(false); localeRouter.push(exitHref); }}
                  className="flex-1 btn-primary !py-2.5"
                >
                  {t('exitConfirmLeave')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
