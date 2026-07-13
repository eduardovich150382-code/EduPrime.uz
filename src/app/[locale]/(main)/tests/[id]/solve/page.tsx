'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import QuestionDisplay from '@/components/test/QuestionDisplay';
import TestTimer from '@/components/test/TestTimer';
import QuestionNav from '@/components/test/QuestionNav';
import { ChevronLeft, ChevronRight, Flag, AlertCircle } from 'lucide-react';

// Mock questions data
const mockQuestions = [
  {
    id: '1',
    text: 'Agar <i>f(x) = x<sup>2</sup> + 3x - 4</i> bo\'lsa, <i>f(2)</i> ning qiymatini toping.',
    images: [],
    options: [
      { label: 'A', text: '6', image: null },
      { label: 'B', text: '8', image: null },
      { label: 'C', text: '10', image: null },
      { label: 'D', text: '12', image: null },
    ],
    correctAnswer: 'A',
    points: 1,
  },
  {
    id: '2',
    text: 'Quyidagi tenglama nechta yechimga ega: <i>x<sup>2</sup> - 5x + 6 = 0</i>',
    images: [],
    options: [
      { label: 'A', text: '0 ta', image: null },
      { label: 'B', text: '1 ta', image: null },
      { label: 'C', text: '2 ta', image: null },
      { label: 'D', text: '3 ta', image: null },
      { label: 'E', text: 'Cheksiz', image: null },
    ],
    correctAnswer: 'C',
    points: 1,
  },
  {
    id: '3',
    text: 'Uchburchakning ichki burchaklari yig\'indisi nechaga teng?',
    images: [],
    options: [
      { label: 'A', text: '90°', image: null },
      { label: 'B', text: '180°', image: null },
      { label: 'C', text: '270°', image: null },
      { label: 'D', text: '360°', image: null },
    ],
    correctAnswer: 'B',
    points: 1,
  },
];

export default function TestSolvePage() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showFinishDialog, setShowFinishDialog] = useState(false);

  const question = mockQuestions[currentQuestion];
  const totalQuestions = mockQuestions.length;

  const handleAnswer = (answer: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion]: answer }));
  };

  const handleNext = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleFinish = useCallback(() => {
    // In real app, submit answers to API
    router.push('/results/1');
  }, [router]);

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6 card p-4"
      >
        <div>
          <h1 className="font-semibold text-text-primary">DTM Matematika #1</h1>
          <p className="text-xs text-text-secondary">
            {answeredCount}/{totalQuestions} javob berilgan
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TestTimer totalSeconds={210 * 60} onTimeUp={handleFinish} />
          <button
            onClick={() => setShowFinishDialog(true)}
            className="btn-primary !py-2 !px-4 text-sm flex items-center gap-2"
          >
            <Flag size={14} />
            Tugatish
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main content */}
        <div className="lg:col-span-3">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="card p-6"
          >
            <QuestionDisplay
              questionNumber={currentQuestion + 1}
              totalQuestions={totalQuestions}
              text={question.text}
              images={question.images}
              options={question.options}
              selectedAnswer={answers[currentQuestion] || null}
              onAnswer={handleAnswer}
            />

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <button
                onClick={handlePrev}
                disabled={currentQuestion === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-text-secondary hover:text-primary-600 hover:bg-primary-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={18} />
                Oldingi
              </button>

              <span className="text-sm text-text-secondary">
                {currentQuestion + 1} / {totalQuestions}
              </span>

              <button
                onClick={handleNext}
                disabled={currentQuestion === totalQuestions - 1}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-primary-600 hover:bg-primary-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Keyingi
                <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        </div>

        {/* Sidebar - Question navigation */}
        <div className="lg:col-span-1">
          <QuestionNav
            totalQuestions={totalQuestions}
            currentQuestion={currentQuestion}
            answers={answers}
            onNavigate={setCurrentQuestion}
          />
        </div>
      </div>

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
              <h3 className="text-lg font-bold text-text-primary mb-2">
                Testni tugatishni xohlaysizmi?
              </h3>
              <p className="text-sm text-text-secondary mb-6">
                {answeredCount}/{totalQuestions} savolga javob berdingiz.
                {answeredCount < totalQuestions && (
                  <span className="block text-yellow-600 mt-1">
                    {totalQuestions - answeredCount} ta savol javobsiz qoladi
                  </span>
                )}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowFinishDialog(false)}
                  className="flex-1 btn-secondary !py-2.5"
                >
                  Davom etish
                </button>
                <button
                  onClick={handleFinish}
                  className="flex-1 btn-primary !py-2.5"
                >
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
