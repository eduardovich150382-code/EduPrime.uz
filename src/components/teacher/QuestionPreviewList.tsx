'use client';

import LatexRenderer from '@/components/ui/LatexRenderer';
import type { QuestionCoreFields } from '@/types';

interface QuestionPreviewListProps<T extends QuestionCoreFields> {
  questions: T[];
  emptyMessage?: string;
}

/**
 * Bir nechta savolning faqat-o'qish uchun (ko'rib chiqish) ko'rinishi —
 * to'g'ri javob yashil rangda belgilanadi, tur bo'yicha tana (variantlar /
 * bo'shliq / moslashtirish / ochiq javob) mos ravishda chiziladi. Test
 * yaratish va Savollar bazasi sahifalari o'rtasida qayta ishlatiladi.
 */
export default function QuestionPreviewList<T extends QuestionCoreFields>({
  questions,
  emptyMessage = "Hali savollar kiritilmagan.",
}: QuestionPreviewListProps<T>) {
  const withText = questions.filter((q) => q.text);

  if (withText.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {withText.map((q, i) => (
        <div key={i} className="p-4 rounded-xl border border-border">
          <div className="flex items-start gap-3">
            <span className="text-sm font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
              {i + 1}
            </span>
            <div className="flex-1">
              <div className="text-sm text-text-primary mb-3">
                <LatexRenderer content={q.text} />
              </div>
              {q.type === 'FILL_BLANK' ? (
                <div className="p-3 rounded-lg bg-gray-50 border border-border space-y-1">
                  <p className="text-xs text-text-secondary mb-1">Bo&apos;shliqlar:</p>
                  {q.blankAnswers.filter(Boolean).map((b, bi) => (
                    <p key={bi} className="text-sm font-medium text-green-700">{bi + 1}. {b}</p>
                  ))}
                </div>
              ) : q.type === 'MATCHING' ? (
                <div className="p-3 rounded-lg bg-gray-50 border border-border space-y-1">
                  <p className="text-xs text-text-secondary mb-1">Juftliklar:</p>
                  {q.matchingPairs.filter((p) => p.left && p.right).map((p, pi) => (
                    <p key={pi} className="text-sm font-medium text-green-700">{p.left} &harr; {p.right}</p>
                  ))}
                </div>
              ) : q.type === 'OPEN_ENDED' ? (
                <div className="p-3 rounded-lg bg-gray-50 border border-border">
                  <p className="text-xs text-text-secondary mb-1">Javob:</p>
                  <p className="text-sm font-medium text-green-700">{q.correctAnswer}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {q.options.filter((o) => o.text).map((opt) => {
                    const isCorrectOpt = q.type === 'MULTI_SELECT'
                      ? q.correctAnswer.split(',').includes(opt.label)
                      : opt.label === q.correctAnswer;
                    return (
                      <div
                        key={opt.label}
                        className={`flex items-start gap-2 p-2.5 rounded-lg text-sm ${
                          isCorrectOpt ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-100'
                        }`}
                      >
                        <span className={`w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 ${q.type === 'MULTI_SELECT' ? 'rounded-md' : 'rounded-full'} ${
                          isCorrectOpt ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {opt.label}
                        </span>
                        <span className="flex-1 pt-0.5">
                          <LatexRenderer content={opt.text} />
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              {q.explanation && (
                <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-xs text-blue-600 font-medium mb-1">Yechim:</p>
                  <div className="text-xs text-text-primary">
                    <LatexRenderer content={q.explanation} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
