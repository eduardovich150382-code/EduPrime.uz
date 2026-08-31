'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { QUESTION_COUNT_OPTIONS } from '../lib/buildState';

interface QuestionCountAndDurationProps {
  questionCount: number;
  durationMin: number;
  onQuestionCountChange: (count: number) => void;
  onDurationChange: (minutes: number) => void;
}

const MAX_QUESTION_COUNT = 200;
const MAX_DURATION_MIN = 600;

export default function QuestionCountAndDuration({
  questionCount, durationMin, onQuestionCountChange, onDurationChange,
}: QuestionCountAndDurationProps) {
  const isPreset = (QUESTION_COUNT_OPTIONS as readonly number[]).includes(questionCount);
  const [customOpen, setCustomOpen] = useState(!isPreset);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-text-primary mb-2">Savollar soni</p>
        <div className="flex flex-wrap gap-2">
          {QUESTION_COUNT_OPTIONS.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => { setCustomOpen(false); onQuestionCountChange(count); }}
              aria-pressed={!customOpen && questionCount === count}
              className={cn(
                'min-h-11 min-w-11 px-4 rounded-full text-sm font-medium border transition-colors',
                !customOpen && questionCount === count
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-gray-50 text-text-secondary border-border hover:border-primary-300 hover:text-primary-600'
              )}
            >
              {count}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCustomOpen(true)}
            aria-pressed={customOpen}
            className={cn(
              'min-h-11 px-4 rounded-full text-sm font-medium border transition-colors',
              customOpen
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-gray-50 text-text-secondary border-border hover:border-primary-300 hover:text-primary-600'
            )}
          >
            Boshqa
          </button>
        </div>
        {customOpen && (
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_QUESTION_COUNT}
            value={questionCount}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              onQuestionCountChange(Number.isFinite(v) ? Math.max(1, Math.min(MAX_QUESTION_COUNT, v)) : 1);
            }}
            className="mt-3 w-28 min-h-11 px-3 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300"
          />
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-text-primary mb-2">Vaqt (daqiqa)</p>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_DURATION_MIN}
          value={durationMin}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            onDurationChange(Number.isFinite(v) ? Math.max(1, Math.min(MAX_DURATION_MIN, v)) : 1);
          }}
          className="w-28 min-h-11 px-3 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300"
        />
        <span className="ml-2 text-xs text-text-secondary">savollar soniga qarab avtomatik hisoblanadi, o&apos;zgartirsa bo&apos;ladi</span>
      </div>
    </div>
  );
}
