'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Lightbulb } from 'lucide-react';
import LatexRenderer from '@/components/ui/LatexRenderer';

interface HintPanelProps {
  hints: string[];
}

// S20a — parametrik savollarning shablonida yozilgan ko'rsatmalar
// (`lib/paramgen/templates.json` — `hints[]`) progressiv ko'rsatiladi:
// tugma bosilganda birinchisi, yana bosilganda ikkinchisi ochiladi. Bepul,
// ishlatilgani hech qayerda jazolanmaydi (hozircha faqat ko'rsatiladi).
//
// `hints` — server tomonidan allaqachon tayyor keladi (bo'sh massiv =
// tugma umuman chizilmaydi): oddiy (mualliflik) savollarda, va DTM Online
// kabi bo'lim-asosidagi sessiyalarda ataylab har doim bo'sh (qarang
// `lib/sessions.ts` — `toPresentedQuestions`, `GET /api/tests/[id]`) —
// haqiqiy imtihonni takrorlashi kerak.
export default function HintPanel({ hints }: HintPanelProps) {
  const t = useTranslations('hint');
  const [revealed, setRevealed] = useState(0);

  if (hints.length === 0) return null;

  return (
    <div className="mt-4">
      {revealed < hints.length && (
        <button
          type="button"
          onClick={() => setRevealed((n) => n + 1)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all min-h-11 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
        >
          <Lightbulb size={16} />
          {revealed === 0 ? t('button') : t('buttonNext')}
        </button>
      )}
      {revealed > 0 && (
        <div className="mt-3 space-y-2">
          {hints.slice(0, revealed).map((hint, i) => (
            <div
              key={i}
              className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800"
            >
              <Lightbulb size={14} className="flex-shrink-0 mt-0.5" />
              <LatexRenderer content={hint} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
