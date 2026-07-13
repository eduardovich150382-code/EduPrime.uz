'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import {
  CheckCircle, XCircle, SkipForward, Clock, Trophy,
  Video, FileText, ArrowLeft, Share2, RotateCcw,
} from 'lucide-react';

// Mock result data
const mockResult = {
  testTitle: 'DTM Matematika #1',
  score: 24,
  maxScore: 30,
  percentage: 80,
  timeSpent: 5420, // seconds
  correct: 24,
  incorrect: 4,
  skipped: 2,
  questions: [
    { id: '1', text: 'f(x) = x² + 3x - 4, f(2) = ?', userAnswer: 'A', correctAnswer: 'A', isCorrect: true },
    { id: '2', text: 'x² - 5x + 6 = 0 nechta yechim?', userAnswer: 'C', correctAnswer: 'C', isCorrect: true },
    { id: '3', text: 'Uchburchak ichki burchaklar yig\'indisi?', userAnswer: 'A', correctAnswer: 'B', isCorrect: false },
  ],
};

export default function ResultPage() {
  const t = useTranslations('test');

  const hours = Math.floor(mockResult.timeSpent / 3600);
  const minutes = Math.floor((mockResult.timeSpent % 3600) / 60);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href="/tests"
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary-600 transition-colors"
      >
        <ArrowLeft size={16} />
        Testlarga qaytish
      </Link>

      {/* Score card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card-elevated p-8 text-center"
      >
        <h1 className="text-xl font-bold text-text-primary mb-6">{mockResult.testTitle}</h1>

        {/* Score circle */}
        <div className="relative inline-flex items-center justify-center w-40 h-40 mb-6">
          <svg className="w-40 h-40 -rotate-90" viewBox="0 0 160 160">
            <circle
              cx="80" cy="80" r="70"
              fill="none" stroke="#e5e7eb" strokeWidth="12"
            />
            <circle
              cx="80" cy="80" r="70"
              fill="none"
              stroke={mockResult.percentage >= 80 ? '#22c55e' : mockResult.percentage >= 60 ? '#eab308' : '#ef4444'}
              strokeWidth="12"
              strokeDasharray={`${2 * Math.PI * 70}`}
              strokeDashoffset={`${2 * Math.PI * 70 * (1 - mockResult.percentage / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute text-center">
            <span className="text-3xl font-bold text-text-primary">{mockResult.percentage}%</span>
            <p className="text-xs text-text-secondary">{mockResult.score}/{mockResult.maxScore}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="p-3 rounded-xl bg-green-50">
            <CheckCircle size={20} className="text-green-600 mx-auto mb-1" />
            <span className="text-lg font-bold text-green-700">{mockResult.correct}</span>
            <p className="text-xs text-green-600">{t('correct')}</p>
          </div>
          <div className="p-3 rounded-xl bg-red-50">
            <XCircle size={20} className="text-red-600 mx-auto mb-1" />
            <span className="text-lg font-bold text-red-700">{mockResult.incorrect}</span>
            <p className="text-xs text-red-600">{t('incorrect')}</p>
          </div>
          <div className="p-3 rounded-xl bg-gray-50">
            <SkipForward size={20} className="text-gray-600 mx-auto mb-1" />
            <span className="text-lg font-bold text-gray-700">{mockResult.skipped}</span>
            <p className="text-xs text-gray-600">{t('skipped')}</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-50">
            <Clock size={20} className="text-blue-600 mx-auto mb-1" />
            <span className="text-lg font-bold text-blue-700">{hours}:{minutes.toString().padStart(2, '0')}</span>
            <p className="text-xs text-blue-600">Vaqt</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <Link href="/tests" className="btn-secondary flex items-center gap-2">
            <RotateCcw size={16} />
            Qayta yechish
          </Link>
          <button className="btn-ghost flex items-center gap-2">
            <Share2 size={16} />
            Ulashish
          </button>
        </div>
      </motion.div>

      {/* Questions review */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="card p-6"
      >
        <h2 className="text-lg font-bold text-text-primary mb-4">Savollar tahlili</h2>

        <div className="space-y-3">
          {mockResult.questions.map((q, i) => (
            <div
              key={q.id}
              className={`flex items-center gap-4 p-4 rounded-xl border ${
                q.isCorrect ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                q.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {q.isCorrect ? <CheckCircle size={16} /> : <XCircle size={16} />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {i + 1}. {q.text}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs">
                  <span className={q.isCorrect ? 'text-green-600' : 'text-red-600'}>
                    Sizning javob: {q.userAnswer}
                  </span>
                  {!q.isCorrect && (
                    <span className="text-green-600">
                      To&apos;g&apos;ri javob: {q.correctAnswer}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button className="p-2 rounded-lg hover:bg-white transition-colors" title="Video yechim">
                  <Video size={16} className="text-primary-600" />
                </button>
                <button className="p-2 rounded-lg hover:bg-white transition-colors" title="Yozma yechim">
                  <FileText size={16} className="text-primary-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
