'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ZoomIn } from 'lucide-react';
import LatexRenderer from '@/components/ui/LatexRenderer';
import type { QuestionOption } from '@/types';
import {
  splitFillBlankText, parseFillBlankAnswer, parseFillBlankCorrectAnswer, isFillBlankIndexCorrect,
} from '@/lib/fill-blank';
import { parseMatchingAnswer, encodeMatchingAnswer } from '@/lib/matching';

interface QuestionDisplayProps {
  questionNumber: number;
  totalQuestions: number;
  text: string;
  images?: string[];
  options: QuestionOption[] | { left: string[]; right: string[] };
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
          {questionType === 'FILL_BLANK' && (
            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              Bo&apos;sh joyni to&apos;ldiring
            </span>
          )}
          {questionType === 'MATCHING' && (
            <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
              Moslashtiring
            </span>
          )}
          {questionType === 'MULTI_SELECT' && (
            <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              Bir nechtasini tanlang
            </span>
          )}
        </div>

        {/* LaTeX rendered text — FILL_BLANK renders text inline with input blanks below instead */}
        {questionType !== 'FILL_BLANK' && (
          <div className="text-lg text-text-primary leading-relaxed">
            <LatexRenderer content={text} />
          </div>
        )}

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

      {/* FILL_BLANK: text with inline input blanks */}
      {questionType === 'FILL_BLANK' ? (
        <FillBlankInput
          text={text}
          selectedAnswer={selectedAnswer}
          onAnswer={onAnswer}
          isReview={isReview}
          correctAnswer={correctAnswer}
        />
      ) : questionType === 'OPEN_ENDED' ? (
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
      ) : questionType === 'MATCHING' ? (
        <MatchingInput
          leftItems={(options as { left: string[]; right: string[] })?.left || []}
          rightItems={(options as { left: string[]; right: string[] })?.right || []}
          selectedAnswer={selectedAnswer}
          onAnswer={onAnswer}
          isReview={isReview}
        />
      ) : (
      /* MULTIPLE_CHOICE / TRUE_FALSE / MULTI_SELECT: Options */
      <div className="space-y-3">
        {(options as QuestionOption[])
          .filter((option) => option.text || option.image) // Bo'sh variantlarni ko'rsatmaslik
          .map((option, index) => {
          const isMulti = questionType === 'MULTI_SELECT';
          const selectedLabels = isMulti ? (selectedAnswer || '').split(',').filter(Boolean) : [];
          const correctLabels = isMulti ? (correctAnswer || '').split(',').filter(Boolean) : [];
          const isSelected = isMulti ? selectedLabels.includes(option.label) : selectedAnswer === option.label;
          const isCorrect = isReview && (isMulti ? correctLabels.includes(option.label) : option.label === correctAnswer);
          const isWrong = isReview && isSelected && !isCorrect;

          const handleClick = () => {
            if (isReview) return;
            if (isMulti) {
              const next = selectedLabels.includes(option.label)
                ? selectedLabels.filter((l) => l !== option.label)
                : [...selectedLabels, option.label];
              onAnswer(next.sort().join(','));
            } else {
              onAnswer(option.label);
            }
          };

          return (
            <button
              key={option.label}
              onClick={handleClick}
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
              {/* Option indicator (radio circle for single-answer, checkbox square for multi-select) */}
              <div className={cn(
                'w-7 h-7 flex items-center justify-center flex-shrink-0 border-2 transition-colors',
                isMulti ? 'rounded-md' : 'rounded-full',
                !isReview && !isSelected && 'border-gray-300',
                !isReview && isSelected && 'border-primary-500 bg-primary-500',
                isCorrect && 'border-green-500 bg-green-500',
                isWrong && 'border-red-500 bg-red-500'
              )}>
                {(isSelected || isCorrect || isWrong) && (
                  <div className={cn(
                    isMulti ? 'w-3 h-3 rounded-sm' : 'w-2.5 h-2.5 rounded-full',
                    !isReview && isSelected && 'bg-white',
                    isCorrect && 'bg-white',
                    isWrong && 'bg-white'
                  )} />
                )}
              </div>

              {/* Option content */}
              <div className="flex-1 pt-0.5">
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
                      alt="Variant rasmi"
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

/**
 * FILL_BLANK: savol matnini "___" bo'yicha bo'laklarga bo'lib, har bir
 * bo'shliq o'rniga inline matn maydoni chizadi. Har bo'lak (LaTeX bo'lishi
 * mumkin bo'lgan matn) LatexRenderer orqali, bo'shliqlar esa oddiy <input>
 * sifatida ko'rsatiladi.
 */
function FillBlankInput({
  text,
  selectedAnswer,
  onAnswer,
  isReview,
  correctAnswer,
}: {
  text: string;
  selectedAnswer: string | null;
  onAnswer: (answer: string) => void;
  isReview: boolean;
  correctAnswer?: string;
}) {
  const segments = splitFillBlankText(text);
  const blankCount = segments.length - 1;
  const userBlanks = parseFillBlankAnswer(selectedAnswer);
  const acceptedPerBlank = parseFillBlankCorrectAnswer(correctAnswer);

  const setBlank = (i: number, value: string) => {
    const next = [...userBlanks];
    while (next.length <= i) next.push('');
    next[i] = value;
    onAnswer(JSON.stringify(next));
  };

  return (
    <div className="space-y-3">
      <div className="text-lg text-text-primary leading-relaxed flex flex-wrap items-center gap-x-1 gap-y-3">
        {segments.map((seg, i) => (
          <span key={i} className="inline-flex items-center flex-wrap">
            {seg && <LatexRenderer content={seg} />}
            {i < blankCount && (
              <input
                type="text"
                value={userBlanks[i] || ''}
                onChange={(e) => setBlank(i, e.target.value)}
                disabled={isReview}
                placeholder={`${i + 1}`}
                className={cn(
                  'inline-block w-28 sm:w-36 mx-1.5 px-2 py-1.5 rounded-lg border-2 text-center text-base align-middle outline-none transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400',
                  !isReview && 'border-border hover:border-primary-300',
                  isReview && isFillBlankIndexCorrect(userBlanks, acceptedPerBlank, i) && 'border-green-500 bg-green-50',
                  isReview && !isFillBlankIndexCorrect(userBlanks, acceptedPerBlank, i) && 'border-red-500 bg-red-50',
                  isReview && 'cursor-not-allowed'
                )}
              />
            )}
          </span>
        ))}
      </div>
      {isReview && acceptedPerBlank.length > 0 && (
        <p className="text-sm text-green-600 font-medium">
          To&apos;g&apos;ri javob(lar): {acceptedPerBlank.map((accepted) => accepted[0] || '').join(', ')}
        </p>
      )}
    </div>
  );
}

/**
 * MATCHING: chap ustunni tartib bo'yicha ko'rsatib, har bir qator uchun
 * (aralashtirilgan) o'ng ustundan tanlash mumkin bo'lgan dropdown chizadi.
 * Bitta o'ng element faqat bitta chap qatorga tanlanishi mumkin.
 */
function MatchingInput({
  leftItems,
  rightItems,
  selectedAnswer,
  onAnswer,
  isReview,
}: {
  leftItems: string[];
  rightItems: string[];
  selectedAnswer: string | null;
  onAnswer: (answer: string) => void;
  isReview: boolean;
}) {
  const matches = parseMatchingAnswer(selectedAnswer);
  const usedPositions = new Set(matches.filter((m): m is number => m !== null && m !== undefined));

  const setMatch = (rowIndex: number, rightPos: number | null) => {
    const next = [...matches];
    while (next.length <= rowIndex) next.push(null);
    next[rowIndex] = rightPos;
    onAnswer(encodeMatchingAnswer(next));
  };

  return (
    <div className="space-y-2.5">
      {leftItems.map((left, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border-2 border-border">
          <span className="w-7 h-7 flex-shrink-0 rounded-full bg-primary-50 text-primary-600 text-xs font-bold flex items-center justify-center">
            {i + 1}
          </span>
          <div className="flex-1 text-sm text-text-primary min-w-0">
            <LatexRenderer content={left} />
          </div>
          <select
            value={matches[i] ?? ''}
            onChange={(e) => setMatch(i, e.target.value === '' ? null : Number(e.target.value))}
            disabled={isReview}
            className="w-36 sm:w-56 flex-shrink-0 px-3 py-2 rounded-lg border-2 border-border text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
          >
            <option value="">— Tanlang —</option>
            {rightItems.map((right, j) => (
              (matches[i] === j || !usedPositions.has(j)) && (
                <option key={j} value={j}>{right}</option>
              )
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
