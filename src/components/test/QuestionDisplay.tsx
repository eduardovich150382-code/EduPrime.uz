'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ZoomIn } from 'lucide-react';
import LatexRenderer from '@/components/ui/LatexRenderer';
import type { QuestionOption } from '@/types';

interface QuestionDisplayProps {
  questionNumber: number;
  totalQuestions: number;
  text: string;
  images?: string[];
  options: QuestionOption[];
  selectedAnswer: string | null;
  onAnswer: (answer: string) => void;
  isReview?: boolean;
  correctAnswer?: string;
  questionType?: string;
}

export default function QuestionDisplay({
  questionNumber,
  totalQuestions,
  text,
  images = [],
  options,
  selectedAnswer,
  onAnswer,
  isReview = false,
  correctAnswer,
  questionType,
}: QuestionDisplayProps) {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Question text */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-primary-600 bg-primary-50 px-3 py-1 rounded-full">
            {questionNumber}-savol ({totalQuestions} dan)
          </span>
          {questionType === 'OPEN_ENDED' && (
            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              Ochiq savol
            </span>
          )}
        </div>

        {/* LaTeX rendered text */}
        <div className="text-lg text-text-primary leading-relaxed">
          <LatexRenderer content={text} />
        </div>

        {/* Question images */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {images.map((img, i) => (
              <div
                key={i}
                className="relative group cursor-pointer rounded-xl overflow-hidden border border-border"
                onClick={() => setZoomedImage(img)}
              >
                <img
                  src={img}
                  alt={`Savol rasmi ${i + 1}`}
                  className="max-h-64 w-auto object-contain"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <ZoomIn size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* OPEN_ENDED: Text input */}
      {questionType === 'OPEN_ENDED' ? (
        <div className="space-y-3">
          <label className="text-sm font-medium text-text-secondary block">
            Javobingizni yozing:
          </label>
          <input
            type="text"
            value={selectedAnswer || ''}
            onChange={(e) => onAnswer(e.target.value)}
            disabled={isReview}
            placeholder="Javobingizni yozing..."
            className={cn(
              'w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 text-base focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none',
              !isReview && 'border-border hover:border-primary-300',
              isReview && selectedAnswer?.trim().toLowerCase() === correctAnswer?.trim().toLowerCase() && 'border-green-500 bg-green-50',
              isReview && selectedAnswer?.trim().toLowerCase() !== correctAnswer?.trim().toLowerCase() && 'border-red-500 bg-red-50',
              isReview && 'cursor-not-allowed'
            )}
          />
          {isReview && correctAnswer && selectedAnswer?.trim().toLowerCase() !== correctAnswer?.trim().toLowerCase() && (
            <p className="text-sm text-green-600 font-medium">
              To&apos;g&apos;ri javob: {correctAnswer}
            </p>
          )}
        </div>
      ) : (
      /* MULTIPLE_CHOICE: Options */
      <div className="space-y-3">
        {options.map((option) => {
          const isSelected = selectedAnswer === option.label;
          const isCorrect = isReview && option.label === correctAnswer;
          const isWrong = isReview && isSelected && option.label !== correctAnswer;

          return (
            <button
              key={option.label}
              onClick={() => !isReview && onAnswer(option.label)}
              disabled={isReview}
              className={cn(
                'w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left',
                !isReview && !isSelected && 'border-border hover:border-primary-300 hover:bg-primary-50/50',
                !isReview && isSelected && 'border-primary-500 bg-primary-50 shadow-sm',
                isCorrect && 'border-green-500 bg-green-50',
                isWrong && 'border-red-500 bg-red-50',
                isReview && !isCorrect && !isWrong && 'border-border opacity-60'
              )}
            >
              {/* Option label circle */}
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 border-2 transition-colors',
                !isReview && !isSelected && 'border-border text-text-secondary',
                !isReview && isSelected && 'border-primary-500 bg-primary-500 text-white',
                isCorrect && 'border-green-500 bg-green-500 text-white',
                isWrong && 'border-red-500 bg-red-500 text-white'
              )}>
                {option.label}
              </div>

              {/* Option content */}
              <div className="flex-1 pt-1">
                {/* Text (LaTeX rendered) */}
                <LatexRenderer content={option.text} className="text-text-primary" />

                {/* Option image */}
                {option.image && (
                  <div
                    className="mt-2 cursor-pointer rounded-lg overflow-hidden inline-block border border-border"
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomedImage(option.image!);
                    }}
                  >
                    <img
                      src={option.image}
                      alt={`Variant ${option.label}`}
                      className="max-h-32 w-auto object-contain"
                    />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      )}

      {/* Zoom modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <img
            src={zoomedImage}
            alt="Kattalashtirilgan rasm"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
