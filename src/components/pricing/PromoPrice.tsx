'use client';

import { useNow, useTranslations } from 'next-intl';
import { Clock } from 'lucide-react';
import { discountPercent, promoActive, savingsAmount } from '@/lib/pricing';

const MINUTE = 60_000;

/**
 * Chizilgan eski narx, "−30%" belgisi, tejash va aksiya hisoblagichi.
 * Client'da: muddat sahifa ochiq turganda o'tsa ham eski narx qayta
 * yuklanmasdan yo'qolishi kerak — server faqat ochilish paytini biladi.
 */
export function PromoPrice({ price, compareAtPrice, promoUntil, locale }: {
  price: number; compareAtPrice: number | null; promoUntil: string | null; locale: string;
}) {
  const t = useTranslations('pricing');
  const now = useNow({ updateInterval: MINUTE });
  const percent = discountPercent(price, compareAtPrice);
  if (percent === null || !promoActive({ promoUntil }, now)) return null;
  const format = (amount: number) => t('price', { amount: new Intl.NumberFormat(locale).format(amount) });
  const left = promoUntil ? Math.max(Math.ceil((new Date(promoUntil).getTime() - now.getTime()) / MINUTE), 1) : null;
  return (
    <div className="space-y-1.5">
      <p className="flex flex-wrap items-center gap-2">
        <s className="text-sm text-text-secondary">{format(compareAtPrice!)}</s>
        {/* Qizil-to'q sariq fon, oq matn — 5.2:1 (WCAG AA). */}
        <span className="rounded-full bg-[#c2410c] px-2 py-0.5 text-xs font-bold text-white">−{percent}%</span>
      </p>
      <p className="text-sm font-semibold text-[#166534]">{t('youSave', { amount: format(savingsAmount(price, compareAtPrice)!) })}</p>
      {left !== null && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-[#9a3412]">
          <Clock size={14} aria-hidden className="shrink-0 motion-safe:animate-pulse" />
          {/* Daqiqa chegarasida server va brauzer matni farq qilishi mumkin. */}
          <span suppressHydrationWarning>
            {t('promoEndsIn', { time: left >= 1440
              ? t('daysHours', { days: Math.floor(left / 1440), hours: Math.floor((left % 1440) / 60) })
              : t('hoursMinutes', { hours: Math.floor(left / 60), minutes: left % 60 }) })}
          </span>
        </p>
      )}
    </div>
  );
}
