'use client';

import { useTranslations } from 'next-intl';

export default function AttestationMockField({ checked, onChange }: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const t = useTranslations('attestationMockField');
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border p-4">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-primary-600" />
      <span className="min-w-0 text-sm">
        <span className="block font-medium text-text-primary">{t('label')}</span>
        <span className="mt-1 block text-text-secondary">{t('hint')}</span>
      </span>
    </label>
  );
}
