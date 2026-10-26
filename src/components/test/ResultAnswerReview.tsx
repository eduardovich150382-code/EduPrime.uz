'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle, Info, XCircle } from 'lucide-react';
import LatexRenderer from '@/components/ui/LatexRenderer';
import {
  splitFillBlankText, parseFillBlankAnswer, parseFillBlankCorrectAnswer, isFillBlankIndexCorrect,
} from '@/lib/fill-blank';
import { parseMatchingPairs, parseMatchingAnswer, isMatchingRowCorrect } from '@/lib/matching';

export interface ReviewOption {
  label: string;
  text: string;
  image: string | null;
}

export interface ReviewQuestion {
  text: string;
  type?: string;
  options: ReviewOption[] | { left: string[]; right: string[] };
  correctAnswer: string;
  distractorWhy?: string | null;
}

// Bitta savol bo'yicha foydalanuvchi javobi va to'g'ri javobni tur bo'yicha
// (FILL_BLANK, OPEN_ENDED, MATCHING, variantli) chizadi. Natija sahifasi va
// xatolar ustida mashq natijasi shu bitta komponentni ishlatadi — ko'rinish
// ikki joyda alohida yashab, vaqt o'tib bir-biridan uzoqlashmasin.
export default function ResultAnswerReview({ question, userAnswer, isCorrect, isSkipped }: {
  question: ReviewQuestion;
  userAnswer: string;
  isCorrect: boolean;
  isSkipped: boolean;
}) {
  const t = useTranslations('results');
  return (
    <div className="space-y-2 mt-4">
      {question.type === 'FILL_BLANK' ? (
        /* FILL_BLANK: matnni bo'shliqlar bilan qayta ko'rsatib, har birini alohida baholaydi */
        (() => {
          const segments = splitFillBlankText(question.text);
          const blankCount = segments.length - 1;
          const userBlanks = parseFillBlankAnswer(userAnswer);
          const acceptedPerBlank = parseFillBlankCorrectAnswer(question.correctAnswer);
          return (
            <div className="space-y-3">
              <div className="review-copy text-text-primary flex flex-wrap items-center gap-x-1 gap-y-2 p-3 rounded-xl bg-white border border-border">
                {segments.map((seg, si) => (
                  <span key={si} className="inline-flex items-center flex-wrap">
                    {seg && <LatexRenderer content={seg} />}
                    {si < blankCount && (
                      <span
                        className={`inline-block mx-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${
                          isFillBlankIndexCorrect(userBlanks, acceptedPerBlank, si)
                            ? 'border-green-400 bg-green-50 text-green-700'
                            : userBlanks[si]
                            ? 'border-red-400 bg-red-50 text-red-700'
                            : 'border-gray-300 bg-gray-50 text-gray-500'
                        }`}
                      >
                        {userBlanks[si] || '—'}
                      </span>
                    )}
                  </span>
                ))}
              </div>
              {!isCorrect && acceptedPerBlank.length > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-xl border-2 border-green-400 bg-green-50">
                  <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-secondary mb-1">{t('correctAnswers')}</p>
                    <p className="review-copy font-medium text-green-700">
                      {acceptedPerBlank.map((accepted) => accepted[0] || '').join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })()
      ) : question.type === 'OPEN_ENDED' ? (
        /* OPEN_ENDED: show text-based answer comparison */
        <div className="space-y-3">
          <div className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all ${
            isCorrect
              ? 'border-green-400 bg-green-50'
              : isSkipped
              ? 'border-gray-200 bg-gray-50'
              : 'border-red-400 bg-red-50'
          }`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border-2 ${
              isCorrect
                ? 'border-green-500 bg-green-500 text-white'
                : isSkipped
                ? 'border-gray-300 bg-gray-200 text-gray-500'
                : 'border-red-500 bg-red-500 text-white'
            }`}>
              {isCorrect ? <CheckCircle size={14} /> : isSkipped ? '?' : <XCircle size={14} />}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-xs text-text-secondary mb-1">{t('yourAnswer')}</p>
              <p className={`review-copy font-medium ${
                isCorrect ? 'text-green-700' : isSkipped ? 'text-gray-500' : 'text-red-700'
              }`}>
                {isSkipped ? t('notAnswered') : userAnswer}
              </p>
            </div>
            {isCorrect && <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-1" />}
            {!isCorrect && !isSkipped && <XCircle size={16} className="text-red-600 flex-shrink-0 mt-1" />}
          </div>
          {!isCorrect && (
            <div className="flex items-start gap-3 p-3 rounded-xl border-2 border-green-400 bg-green-50">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border-2 border-green-500 bg-green-500 text-white">
                <CheckCircle size={14} />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-xs text-text-secondary mb-1">{t('correctAnswer')}</p>
                <p className="review-copy font-medium text-green-700">{question.correctAnswer}</p>
              </div>
            </div>
          )}
        </div>
      ) : question.type === 'MATCHING' ? (
        /* MATCHING: har bir chap qatorni tanlangan/to'g'ri o'ng element bilan solishtirib ko'rsatadi */
        (() => {
          const pairs = parseMatchingPairs(question.options);
          const canonicalMatches = parseMatchingAnswer(userAnswer);
          return (
            <div className="space-y-2">
              {pairs.left.map((left, i) => {
                const rowCorrect = isMatchingRowCorrect(canonicalMatches, i);
                const chosen = canonicalMatches[i];
                const chosenText = chosen !== null && chosen !== undefined && chosen >= 0 && chosen < pairs.right.length
                  ? pairs.right[chosen]
                  : null;
                return (
                  <div
                    key={i}
                    className={`flex flex-wrap items-center gap-3 p-3 rounded-xl border-2 ${
                      rowCorrect ? 'border-green-400 bg-green-50' : isSkipped ? 'border-gray-200 bg-gray-50' : 'border-red-400 bg-red-50'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border-2 ${
                      rowCorrect
                        ? 'border-green-500 bg-green-500 text-white'
                        : isSkipped
                        ? 'border-gray-300 bg-gray-200 text-gray-500'
                        : 'border-red-500 bg-red-500 text-white'
                    }`}>
                      {rowCorrect ? <CheckCircle size={14} /> : isSkipped ? '?' : <XCircle size={14} />}
                    </div>
                    <div className="review-copy flex-1 min-w-0 text-text-primary">
                      <LatexRenderer content={left} />
                    </div>
                    <div className="review-copy min-w-0 basis-full text-right sm:basis-auto sm:max-w-[50%]">
                      <p className={`font-medium ${rowCorrect ? 'text-green-700' : chosenText ? 'text-red-700' : 'text-gray-500'}`}>
                        {chosenText || t('notSelected')}
                      </p>
                      {!rowCorrect && (
                        <p className="review-copy text-green-600 mt-0.5">{t('correctShort', { answer: pairs.right[i] })}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()
      ) : (
        /* MULTIPLE_CHOICE / TRUE_FALSE / MULTI_SELECT: show options without A/B/C/D labels */
      <div className="space-y-2">
      {(question.options as ReviewOption[])
        .filter((option) => option.text || option.image) // Bo'sh variantlarni ko'rsatmaslik
        .map((option) => {
        const isMulti = question.type === 'MULTI_SELECT';
        const isUserChoice = isMulti
          ? userAnswer.split(',').includes(option.label)
          : option.label === userAnswer;
        const isCorrectOption = isMulti
          ? question.correctAnswer.split(',').includes(option.label)
          : option.label === question.correctAnswer;
        const isWrongChoice = isUserChoice && !isCorrectOption;

        return (
          <div
            key={option.label}
            className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all ${
              isCorrectOption
                ? 'border-green-400 bg-green-50'
                : isWrongChoice
                ? 'border-red-400 bg-red-50'
                : 'border-gray-100 bg-white'
            }`}
          >
            {/* Radio-style indicator (no letter) */}
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 mt-0.5 ${
              isCorrectOption
                ? 'border-green-500 bg-green-500'
                : isWrongChoice
                ? 'border-red-500 bg-red-500'
                : isUserChoice
                ? 'border-primary-500 bg-primary-500'
                : 'border-gray-200'
            }`}>
              {(isCorrectOption || isWrongChoice || isUserChoice) && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <LatexRenderer content={option.text} className="review-copy text-text-primary" />
              {option.image && (
                <img
                  src={option.image}
                  alt={t('optionImage')}
                  className="mt-2 max-h-32 w-auto object-contain rounded-lg border border-border"
                />
              )}
              {/* S20a — parametrik distraktor izohi: bepul,
                  faqat foydalanuvchi shu (noto'g'ri) variantni
                  tanlagan bo'lsa ko'rinadi. */}
              {isWrongChoice && question.distractorWhy && (
                <div className="mt-2 flex items-start gap-1.5 text-xs text-red-700">
                  <Info size={13} className="flex-shrink-0 mt-0.5" />
                  <span>
                    <span className="font-medium">{t('distractorWhyLabel')}</span>{' '}
                    {question.distractorWhy}
                  </span>
                </div>
              )}
            </div>
            {isCorrectOption && (
              <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-1" />
            )}
            {isWrongChoice && (
              <XCircle size={16} className="text-red-600 flex-shrink-0 mt-1" />
            )}
          </div>
        );
      })}
      </div>
      )}
    </div>
  );
}
