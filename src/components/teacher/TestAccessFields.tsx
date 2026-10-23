'use client';

import { useTranslations } from 'next-intl';
import { normalizeTestAccess, type TestAccessChoice } from '@/lib/test-access-form';

export default function TestAccessFields({ value, price, onChange }: { value: string; price: number; onChange: (accessType: TestAccessChoice, price: number) => void }) {
  const t = useTranslations('testAccessForm');
  const selected = normalizeTestAccess(value);
  return <fieldset className="space-y-3">
    <legend className="mb-3 text-sm font-medium">{t('title')}</legend>
    <div className="grid gap-2 sm:grid-cols-3">{(['free', 'subscription', 'paid'] as const).map((type) => <button type="button" key={type} aria-pressed={selected === type} onClick={() => onChange(type, type === 'paid' ? price : 0)} className={`min-h-11 rounded-xl border-2 p-3 text-left ${selected === type ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-border'}`}><span className="block text-sm font-semibold">{t(type)}</span><span className="text-xs">{t(`${type}Description`)}</span></button>)}</div>
    {selected === 'paid' && <label className="flex flex-wrap items-center gap-3 text-sm">{t('price')}<input aria-label={t('price')} className="min-h-11 w-44 rounded-lg border border-border px-3 py-2" type="number" inputMode="numeric" min={0} max={2147483647} step={1} required value={price || ''} onChange={(e) => { const number = Number(e.target.value); if (Number.isInteger(number) && number >= 0 && number <= 2147483647) onChange('paid', number); }} /></label>}
    <p className="rounded-lg bg-blue-50 p-3 text-xs text-text-secondary">{t('help')}</p>
  </fieldset>;
}
