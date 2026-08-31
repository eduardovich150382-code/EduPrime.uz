'use client';

import { useState } from 'react';
import { ChevronDown, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ChipGroup from './ChipGroup';
import { BLOOM_LEVELS, LANGUAGES, QUESTION_TYPES } from '../lib/buildState';

interface MoreSettingsProps {
  bloomLevels: string[];
  onBloomLevelsChange: (v: string[]) => void;
  types: string[];
  onTypesChange: (v: string[]) => void;
  lang: string[];
  onLangChange: (v: string[]) => void;
}

// "Ko'proq sozlamalar" — standart holatda yig'ilgan, Bloom/format/til
// tanlanmasa ham "Boshlash" ishlashiga xalaqit bermaydi (nol majburiy tanlov).
export default function MoreSettings({
  bloomLevels, onBloomLevelsChange, types, onTypesChange, lang, onLangChange,
}: MoreSettingsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 min-h-11 text-sm font-medium text-text-secondary hover:text-primary-600 transition-colors"
      >
        <Settings2 size={16} />
        Ko&apos;proq sozlamalar
        <ChevronDown size={16} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="mt-4 space-y-5">
          <div>
            <p className="text-sm font-medium text-text-primary mb-2">Bloom taksonomiyasi</p>
            <ChipGroup options={BLOOM_LEVELS} selected={bloomLevels} onChange={onBloomLevelsChange} />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary mb-2">Savol formati</p>
            <ChipGroup options={QUESTION_TYPES} selected={types} onChange={onTypesChange} />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary mb-2">Til</p>
            <ChipGroup options={LANGUAGES} selected={lang} onChange={onLangChange} />
          </div>
        </div>
      )}
    </div>
  );
}
