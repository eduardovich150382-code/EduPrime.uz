'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PRESETS } from '../lib/buildState';

interface PresetChipsProps {
  onApplyPreset: (presetId: string) => void;
  onApplyYesterdayMistakes: () => void;
  loadingYesterdayMistakes: boolean;
}

// Tez boshlash presetlari. "Zaif mavzularim" ataylab yo'q — bilim xaritasi
// hozircha Item bankiga bog'lanmagan (PR tavsifidagi "Keyingi sessiyaga"
// bo'limiga qarang). "Kechagi xatolarim" boshqalardan farqli — serverdan
// (`GET /api/items/yesterday-mistakes`) ma'lumot kerak, shuning uchun
// alohida (async) callback orqali ishlaydi.
export default function PresetChips({ onApplyPreset, onApplyYesterdayMistakes, loadingYesterdayMistakes }: PresetChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onApplyPreset(preset.id)}
          className={cn(
            'min-h-11 px-4 rounded-full text-sm font-medium border transition-colors',
            'bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100'
          )}
        >
          {preset.label}
        </button>
      ))}
      <button
        type="button"
        onClick={onApplyYesterdayMistakes}
        disabled={loadingYesterdayMistakes}
        className="min-h-11 px-4 rounded-full text-sm font-medium border bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100 disabled:opacity-60 flex items-center gap-1.5"
      >
        {loadingYesterdayMistakes ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        Kechagi xatolarim
      </button>
    </div>
  );
}
