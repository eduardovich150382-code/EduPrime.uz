'use client';

import { PenLine } from 'lucide-react';
import { countFillBlanks } from '@/lib/fill-blank';

interface FillBlankEditorProps {
  question: { text: string; blankAnswers: string[] };
  onBlankAnswersChange: (blankAnswers: string[]) => void;
  onInsertBlank: () => void;
}

/**
 * FILL_BLANK savol muharriri — savol qurish/tahrirlash sahifalarida
 * (create/edit) qayta ishlatiladi. Matndagi har bir "___" belgisiga mos,
 * qabul qilinadigan javoblar (vergul bilan ajratilgan, bir nechta variant)
 * ro'yxatini boshqaradi.
 */
export default function FillBlankEditor({ question, onBlankAnswersChange, onInsertBlank }: FillBlankEditorProps) {
  const blankCount = countFillBlanks(question.text);

  const setBlank = (i: number, value: string) => {
    const next = [...question.blankAnswers];
    while (next.length <= i) next.push('');
    next[i] = value;
    onBlankAnswersChange(next);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-text-primary">Bo&apos;shliqlar uchun qabul qilinadigan javoblar *</label>
        <button
          type="button"
          onClick={onInsertBlank}
          className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1.5"
        >
          <PenLine size={12} /> Bo&apos;shliq qo&apos;shish (___)
        </button>
      </div>
      {blankCount === 0 ? (
        <p className="text-xs text-text-secondary p-3 rounded-lg bg-gray-50 border border-dashed border-border">
          Savol matniga hali bo&apos;shliq qo&apos;shilmagan. Yuqoridagi &quot;Bo&apos;shliq qo&apos;shish&quot; tugmasini bosing yoki matn ichiga qo&apos;lda <code className="px-1 py-0.5 rounded bg-gray-100">___</code> yozing.
        </p>
      ) : (
        <div className="space-y-2">
          {Array.from({ length: blankCount }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-7 h-7 flex-shrink-0 rounded-full bg-primary-50 text-primary-600 text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <input
                type="text"
                value={question.blankAnswers[i] || ''}
                onChange={(e) => setBlank(i, e.target.value)}
                placeholder="Qabul qilinadigan javob(lar), vergul bilan: 3.14, 3,14"
                className="flex-1 px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
              />
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-text-secondary mt-2">
        Har bir bo&apos;shliq uchun bir nechta to&apos;g&apos;ri variant kiritishingiz mumkin (vergul bilan ajrating) — masalan sinonim yoki imlo farqlari uchun.
      </p>
    </div>
  );
}
