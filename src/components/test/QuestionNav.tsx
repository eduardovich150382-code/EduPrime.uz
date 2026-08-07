'use client';

import { cn } from '@/lib/utils';

interface QuestionSection {
  label: string;
  count: number;
}

interface QuestionNavProps {
  totalQuestions: number;
  currentQuestion: number;
  answers: Record<number, string>;
  onNavigate: (index: number) => void;
  flaggedQuestions?: Set<number>;
  /** Ixtiyoriy — berilsa savollar bo'limlarga guruhlanib, sarlavha bilan ko'rsatiladi (masalan DTM Online). */
  sections?: QuestionSection[];
}

function QuestionButton({
  index, isActive, isAnswered, isFlagged, onNavigate,
}: {
  index: number; isActive: boolean; isAnswered: boolean; isFlagged: boolean; onNavigate: (i: number) => void;
}) {
  return (
    <button
      onClick={() => onNavigate(index)}
      className={cn(
        'w-9 h-9 rounded-lg text-xs font-semibold transition-all duration-200 relative',
        isActive && 'bg-primary-600 text-white shadow-md shadow-primary-500/30 scale-110',
        !isActive && isAnswered && 'bg-green-100 text-green-700 border border-green-200',
        !isActive && !isAnswered && 'bg-gray-100 text-text-secondary hover:bg-primary-50 hover:text-primary-600'
      )}
    >
      {index + 1}
      {isFlagged && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-white" />
      )}
    </button>
  );
}

export default function QuestionNav({
  totalQuestions,
  currentQuestion,
  answers,
  onNavigate,
  flaggedQuestions = new Set(),
  sections,
}: QuestionNavProps) {
  const showSections = sections && sections.length > 1;

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3">Savollar</h3>

      {showSections ? (
        <div className="space-y-4">
          {(() => {
            let offset = 0;
            return sections!.map((section, sIdx) => {
              const start = offset;
              offset += section.count;
              return (
                <div key={sIdx}>
                  <p className="text-xs font-medium text-text-secondary mb-2">{section.label}</p>
                  <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-5 gap-2">
                    {Array.from({ length: section.count }).map((_, j) => {
                      const i = start + j;
                      return (
                        <QuestionButton
                          key={i}
                          index={i}
                          isActive={i === currentQuestion}
                          isAnswered={answers[i] !== undefined && answers[i] !== ''}
                          isFlagged={flaggedQuestions.has(i)}
                          onNavigate={onNavigate}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      ) : (
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-5 gap-2">
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <QuestionButton
              key={i}
              index={i}
              isActive={i === currentQuestion}
              isAnswered={answers[i] !== undefined && answers[i] !== ''}
              isFlagged={flaggedQuestions.has(i)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
      <div className="flex items-center gap-4 mt-4 text-xs text-text-secondary flex-wrap">
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
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-white border border-gray-200 relative">
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-400 rounded-full" />
          </div>
          <span>Belgilangan</span>
        </div>
      </div>
    </div>
  );
}
