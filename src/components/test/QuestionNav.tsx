'use client';

import { cn } from '@/lib/utils';

interface QuestionNavProps {
  totalQuestions: number;
  currentQuestion: number;
  answers: Record<number, string>;
  onNavigate: (index: number) => void;
}

export default function QuestionNav({
  totalQuestions,
  currentQuestion,
  answers,
  onNavigate,
}: QuestionNavProps) {
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3">Savollar</h3>
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-5 gap-2">
        {Array.from({ length: totalQuestions }).map((_, i) => {
          const isActive = i === currentQuestion;
          const isAnswered = answers[i] !== undefined;

          return (
            <button
              key={i}
              onClick={() => onNavigate(i)}
              className={cn(
                'w-9 h-9 rounded-lg text-xs font-semibold transition-all duration-200',
                isActive && 'bg-primary-600 text-white shadow-md shadow-primary-500/30 scale-110',
                !isActive && isAnswered && 'bg-green-100 text-green-700 border border-green-200',
                !isActive && !isAnswered && 'bg-gray-100 text-text-secondary hover:bg-primary-50 hover:text-primary-600'
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-4 text-xs text-text-secondary">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-200" />
          <span>Javob berilgan</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-primary-600" />
          <span>Hozirgi</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gray-100" />
          <span>Javobsiz</span>
        </div>
      </div>
    </div>
  );
}
