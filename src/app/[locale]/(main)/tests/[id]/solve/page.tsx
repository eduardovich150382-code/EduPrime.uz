'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams, useSearchParams, usePathname } from 'next/navigation';
import ExamWorkspace from '@/components/test/ExamWorkspace';
import { useAutoAdvance } from '@/components/test/useAutoAdvance';
import { usePracticeClock } from '@/components/test/usePracticeClock';
import { isPhysicsSubject, shufflePresentedQuestions } from '@/lib/exam-presentation';
import { CLOCK_KEY_PREFIX, DRAFT_KEY_PREFIX, getDraftResumeMode, restoreTestDraft } from '@/lib/test-draft';
import ExpiredDraftNotice from '@/components/test/ExpiredDraftNotice';
import SessionExpiredDialog from '@/components/test/SessionExpiredDialog';
import TestLockedNotice, { type TestAccessDenied } from '@/components/test/TestLockedNotice';
import { classifyTestLoad } from '@/lib/test-load-response';
import PracticeSolve from '@/components/test/PracticeSolve';
import BackButton from '@/components/ui/BackButton';
import { withReturnTo, sanitizeReturnPath } from '@/lib/safe-return-path';
import { AlertCircle, Loader2 } from 'lucide-react';

interface QuestionData {
  id: string;
  text: string;
  images: string[];
  options: { label: string; text: string; image: string | null }[] | { left: string[]; right: string[] };
  type: string;
  points: number;
  order: number;
  subjectId?: string | null; // Faqat generatsiya qilingan (DTM Online) testlarda — bo'lim belgisi
  section?: string | null; // Faqat bo'limli attestatsiya testida — blokni aralashtirishda saqlash uchun
  hints?: string[]; // S20a — bo'lim-asosidagi (generatsiya qilingan) testlarda ataylab bo'sh (qarang GET /api/tests/[id])
}

interface TestData {
  id: string;
  titleUz: string;
  titleRu?: string | null;
  titleEn?: string | null;
  duration: number;
  questionCount: number;
  questions: QuestionData[];
  subject: { nameUz: string };
}

// `?practice=<resultId>` — xatolar ustida mashq. Alohida komponent: asosiy
// oqimdagi soat (`test_clock_`), qoralama (`test_progress_`) va muddati o'tgan
// qoralama ekrani mashqda umuman ishga tushmaydi.
export default function TestSolvePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const practiceResultId = searchParams.get('practice');
  if (practiceResultId) {
    return <PracticeSolve key={practiceResultId} testId={params.id as string} resultId={practiceResultId} returnTo={sanitizeReturnPath(searchParams.get('returnTo'))} />;
  }
  return <TestSolveExam />;
}

function TestSolveExam() {
  const exam = useTranslations('exam');
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const testId = params.id as string;
  // Kurs darsidan kelingan bo'lsa (qarang `courses/[id]/learn`), test
  // tugatilgach natija sahifasi orqali aynan shu manzilga qaytish uchun —
  // tekshirilgan holda saqlanadi, xavfsiz bo'lmasa e'tiborsiz qoldiriladi.
  const returnTo = sanitizeReturnPath(searchParams.get('returnTo'));

  const [test, setTest] = useState<TestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState<TestAccessDenied | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [autoNext, setAutoNext] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [questionTimeSpent, setQuestionTimeSpent] = useState<Record<number, number>>({});
  const questionStartTimeRef = useRef<number>(Date.now());
  const [sections, setSections] = useState<{ label: string; count: number }[] | undefined>(undefined);
  // Ochilishda vaqti tugagan qoralama — foydalanuvchi tanlamaguncha
  // ExamWorkspace (va TestTimer) render qilinmaydi.
  const [expiredDraft, setExpiredDraft] = useState<{ answered: number; total: number } | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  // Test ochilishidayoq 401 — sessiya tugagan (sahifa middleware ortida, mehmon bu yerga yetmaydi).
  const [loginRequired, setLoginRequired] = useState(false);

  const clock = usePracticeClock(testId, (test?.duration ?? 0) * 60);
  const submitLock = useRef(false);

  useEffect(() => {
    if (!test || submitLock.current) return;
    try {
      localStorage.setItem(`test_progress_${testId}`, JSON.stringify({
        // Nom faqat /tests "Davom etish" bloki uchun — restoreTestDraft uni o'qimaydi.
        titleUz: test.titleUz, titleRu: test.titleRu, titleEn: test.titleEn,
        questionIds: test.questions.map(question => question.id), answers, currentQuestion,
        flagged: Array.from(flaggedQuestions), questionTimeSpent, autoNext, timestamp: Date.now(),
      }));
    } catch { /* Storage to'lsa ham javob tanlash ishlashi kerak. */ }
  }, [answers, currentQuestion, flaggedQuestions, questionTimeSpent, autoNext, testId, test]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!test || expiredDraft || clock.paused || showFinishDialog || submitting || document.querySelector('[role="dialog"]')) return;
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      
      const totalQ = test.questions.length;
      if (/^[a-e]$/i.test(e.key) && !['MULTIPLE_CHOICE', 'TRUE_FALSE'].includes(test.questions[currentQuestion]?.type)) return;
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          if (currentQuestion < totalQ - 1) navigate(currentQuestion + 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (currentQuestion > 0) navigate(currentQuestion - 1);
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
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  const toggleFlag = (index: number) => {
    advance.cancel();
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
      if (document.hidden && test && !expiredDraft && !clock.paused) {
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
  }, [test, expiredDraft, clock.paused]);

  // Fetch test
  useEffect(() => {
    async function fetchTest() {
      try {
        // Bitta so'rov: kirish huquqi qarori GET'ning o'zida (401/403) —
        // oldindan alohida check-access chaqiruvi kerak emas.
        const res = await fetch(`/api/tests/${testId}`);
        const data = await res.json();
        const outcome = classifyTestLoad(res.status, data);
        if (outcome.kind === 'locked') setAccessDenied(outcome.accessDenied);
        if (outcome.kind === 'login') setLoginRequired(true);
        if (outcome.kind === 'ok') {
          const rawQuestions: QuestionData[] = data.test.questions;
          let questions = shufflePresentedQuestions(rawQuestions, crypto.getRandomValues(new Uint32Array(1))[0]);
          try {
            const rawDraft = localStorage.getItem(`${DRAFT_KEY_PREFIX}${testId}`);
            const rawClock = localStorage.getItem(`${CLOCK_KEY_PREFIX}${testId}`);
            const draft = restoreTestDraft(rawQuestions, rawDraft);
            const mode = draft ? getDraftResumeMode(rawDraft, rawClock, data.test.duration * 60) : 'fresh';
            if (draft) {
              questions = draft.questions; setAnswers(draft.answers); setCurrentQuestion(draft.current);
              setFlaggedQuestions(new Set(draft.flagged)); setQuestionTimeSpent(draft.questionTimeSpent); setAutoNext(draft.autoNext);
              if (mode === 'expired') setExpiredDraft({ answered: Object.values(draft.answers).filter(answer => answer !== '').length, total: questions.length });
            } else {
              // Qoralamasiz qolgan eski soat bo'sh testni qisqargan yoki nol
              // vaqt bilan ochib, darhol topshirib yuborardi.
              localStorage.removeItem(`${CLOCK_KEY_PREFIX}${testId}`);
            }
          } catch { /* Yopiq storage mashqni ochishga to'sqinlik qilmasin. */ }
          setTest({ ...data.test, questions });
          // Reset question timer when test loads
          questionStartTimeRef.current = Date.now();

          // Generatsiya qilingan (masalan DTM Online) testlarda savollar
          // subjectId bilan bo'limlarga bo'lingan — nav panelida guruhlab
          // ko'rsatish uchun fan nomlarini olib, ketma-ket guruhlarga ajratamiz.
          const qs = questions;
          if (qs.some((q) => q.subjectId)) {
            try {
              const subjRes = await fetch('/api/subjects');
              const subjData = await subjRes.json();
              const nameMap = new Map<string, string>(
                (subjData.subjects || []).map((s: any) => [s.id, `${s.icon || ''} ${s.nameUz}`.trim()])
              );
              const grouped: { label: string; count: number }[] = [];
              for (const q of qs) {
                const label = q.subjectId ? nameMap.get(q.subjectId) || "Bo'lim" : "Bo'lim";
                if (grouped.length > 0 && grouped[grouped.length - 1].label === label) {
                  grouped[grouped.length - 1].count++;
                } else {
                  grouped.push({ label, count: 1 });
                }
              }
              setSections(grouped);
            } catch {
              // Bo'lim nomlarini olib bo'lmasa ham test yechishga xalaqit bermaydi
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch test:', error);
      }
      setLoading(false);
    }
    fetchTest();
  }, [testId]);

  const trackQuestionTime = () => {
    const elapsed = Math.max(0, Math.floor((Date.now() - questionStartTimeRef.current) / 1000));
    setQuestionTimeSpent(prev => ({ ...prev, [currentQuestion]: (prev[currentQuestion] || 0) + elapsed }));
    questionStartTimeRef.current = Date.now();
  };
  const navigate = (index: number) => {
    advance.cancel();
    if (!test || clock.paused || submitting || index < 0 || index >= test.questions.length) return;
    trackQuestionTime(); setCurrentQuestion(index);
  };
  const advance = useAutoAdvance(autoNext, clock.paused || showFinishDialog || submitting, currentQuestion, test?.questions.length ?? 0, navigate);
  const handleAnswer = (answer: string) => {
    const question = test?.questions[currentQuestion];
    if (!question || clock.paused || submitting) return;
    if (['MULTIPLE_CHOICE', 'TRUE_FALSE'].includes(question.type) && (!Array.isArray(question.options) || !question.options.some(option => option.label === answer))) return;
    setAnswers(prev => ({ ...prev, [currentQuestion]: answer }));
    advance.schedule(question.type, answer);
  };

  const handleFinish = useCallback(async () => {
    if (!test || submitLock.current) return;
    advance.cancel();
    submitLock.current = true;
    setSubmitting(true);

    const timeSpent = clock.elapsed;

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

      // Qoralama o'chirilmaydi — kirgach shu sahifa uni tiklaydi.
      if (res.status === 401) {
        setSessionExpired(true);
        submitLock.current = false;
        setSubmitting(false);
        return;
      }

      const data = await res.json();

      if (res.ok && data.result) {
        // Clear saved progress
        try { localStorage.removeItem(`test_progress_${testId}`); } catch {}
        clock.clear();
        router.push(withReturnTo(`/results/${data.result.id}`, returnTo));
      } else {
        alert(data.error || 'Xatolik yuz berdi');
        submitLock.current = false;
        setSubmitting(false);
      }
    } catch (error) {
      alert('Server xatolik');
      submitLock.current = false;
      setSubmitting(false);
    }
  }, [test, answers, testId, clock, advance, router, returnTo, currentQuestion, questionTimeSpent]);

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
    if (accessDenied) return <TestLockedNotice testId={testId} accessDenied={accessDenied} />;
    if (loginRequired) {
      const loginQuery = searchParams.toString();
      return <SessionExpiredDialog returnPath={loginQuery ? `${pathname}?${loginQuery}` : pathname} onClose={() => setLoginRequired(false)} />;
    }

    return (
      <div className="text-center py-20">
        <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-text-primary mb-2">Test topilmadi</h2>
        <p className="text-text-secondary">Bu test mavjud emas yoki savollar hali qo&apos;shilmagan</p>
      </div>
    );
  }

  // `returnTo` ham saqlansin — kurs darsidan kelgan foydalanuvchi kirgach o'sha yo'lda qolsin.
  const query = searchParams.toString();
  const sessionDialog = sessionExpired && <SessionExpiredDialog returnPath={query ? `${pathname}?${query}` : pathname} onClose={() => setSessionExpired(false)} />;

  if (expiredDraft) {
    return <>
      <ExpiredDraftNotice testId={testId} answered={expiredDraft.answered} total={expiredDraft.total} submitting={submitting}
        // Tanlov ekranida o'tgan vaqt joriy savolga yozilmasin.
        onSubmit={() => { questionStartTimeRef.current = Date.now(); handleFinish(); }} />
      {sessionDialog}
    </>;
  }

  return (
    <div className="mx-auto max-w-7xl" ref={containerRef}>
      <ExamWorkspace title={test.titleUz} questions={test.questions} current={currentQuestion} answers={answers}
        flagged={flaggedQuestions} sections={sections} totalSeconds={test.duration * 60} remainingSeconds={clock.remaining}
        paused={clock.paused} submitting={submitting} autoNext={autoNext}
        onAutoNext={value => { advance.cancel(); setAutoNext(value); }} onAnswer={handleAnswer} onNavigate={navigate} onFlag={toggleFlag}
        onPause={() => { advance.cancel(); trackQuestionTime(); clock.pause(); }}
        onResume={() => { questionStartTimeRef.current = Date.now(); clock.resume(); }}
        onFinish={handleFinish} showFinish={showFinishDialog} onShowFinish={value => { advance.cancel(); setShowFinishDialog(value); }}
        physics={isPhysicsSubject(test.subject)} onFullscreen={toggleFullscreen} before={<BackButton className="mb-4" />} />
      {showTabWarning && !clock.paused && <div role="status" className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-[18px] bg-amber-50 p-4 text-sm text-amber-800 shadow-lg">{tabSwitchCount} · {exam('stayOnPage')}</div>}
      {sessionDialog}
    </div>
  );
}
