'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { calculatorStep, initialCalculator } from '@/lib/exam-calculator';

export default function PhysicsCalculator({ onClose }: { onClose: () => void }) {
  const t = useTranslations('exam');
  const [state, setState] = useState(initialCalculator);
  return <section aria-label={t('calculator')} className="w-full max-w-sm rounded-[18px] border border-border bg-gray-50 p-4 sm:ml-auto" onKeyDown={event => event.stopPropagation()}>
    <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{t('calculator')}</h3><button type="button" onClick={onClose} aria-label={t('close')} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl hover:bg-white"><X size={18} /></button></div>
    <p className="min-h-6 text-right text-xs text-text-secondary">{state.accumulator !== null ? `${state.accumulator} ${state.operator}` : '\u00a0'}</p>
    <output aria-live="polite" className="my-3 block break-all text-right font-mono text-2xl tabular-nums">{state.display === 'error' ? t('calculatorError') : state.display}</output>
    <div className="grid grid-cols-4 gap-2">
      {['C', '⌫', 'π', '÷', '√', 'x²', '1/x', '×', '7', '8', '9', '−', '4', '5', '6', '+', '1', '2', '3', '%', '±', '0', '.', '='].map(key => <button key={key} type="button" aria-label={key === 'C' ? t('clear') : key === '⌫' ? t('backspace') : key}
        onClick={() => setState(prev => calculatorStep(prev, key))}
        className={`min-h-11 min-w-0 rounded-xl border border-border px-2 py-3 text-base font-medium transition-colors ${key === '=' ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-white hover:bg-primary-50'}`}>{key}</button>)}
    </div>
  </section>;
}
