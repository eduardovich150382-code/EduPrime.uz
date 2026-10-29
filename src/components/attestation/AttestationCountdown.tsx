'use client';

import { useTranslations } from 'next-intl';
import { useDaysUntil } from '@/lib/use-days-until';

// Hero'dagi hisoblagich kartasi. Sana serverda (statik HTML'da) ko'rinadi,
// kunlar soni hydration'dan keyin — joyi oldindan band, karta sakramaydi.
// O'tgan sana: son chiqmaydi, karta yashiriladi (avval serverda ham shunday edi).
export function AttestationCountdown({ dateKey, dateLabel }: { dateKey: string; dateLabel: string }) {
  const t = useTranslations('attestation.countdown');
  const days = useDaysUntil(dateKey);
  if (days === null) return null;
  return (
    <div className="rounded-2xl bg-white/10 p-5 text-white lg:w-64 lg:shrink-0">
      <p className="text-sm text-[#ddd6fe]">{t('before')}</p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="inline-block min-w-[2ch] text-4xl font-bold tabular-nums leading-none">
          {days ?? <span className="invisible">00</span>}
        </span>
        <span className="text-sm text-[#ddd6fe]">{t('daysLeft')}</span>
      </p>
      <p className="mt-2 text-sm text-white">{dateLabel}</p>
    </div>
  );
}
