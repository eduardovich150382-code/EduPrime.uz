'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestTimerProps {
  totalSeconds: number;
  onTimeUp: () => void;
  remainingSeconds?: number;
  expiresAt?: string;
}

export default function TestTimer({ totalSeconds, onTimeUp, remainingSeconds, expiresAt }: TestTimerProps) {
  const t = useTranslations('exam');
  const [remaining, setRemaining] = useState(totalSeconds);
  const fired = useRef(false);
  const callback = useRef(onTimeUp);
  useEffect(() => { callback.current = onTimeUp; }, [onTimeUp]);
  const controlled = remainingSeconds !== undefined;
  useEffect(() => {
    fired.current = false;
    if (controlled) return;
    // Fon tabidagi interval sekinlashsa ham soat real muddatdan hisoblanadi.
    const deadline = expiresAt ? new Date(expiresAt).getTime() : Date.now() + totalSeconds * 1000;
    const tick = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [totalSeconds, expiresAt, controlled]);
  const value = Math.max(0, remainingSeconds ?? remaining);
  useEffect(() => {
    if (value <= 0 && !fired.current) { fired.current = true; callback.current(); }
  }, [value]);
  const hours = Math.floor(value / 3600), minutes = Math.floor((value % 3600) / 60), seconds = value % 60;
  return <div role="timer" aria-label={t('timeLeft')} className={cn('flex shrink-0 flex-col items-end', value < 60 ? 'text-red-700' : value < 300 ? 'text-amber-700' : 'text-text-primary')}>
    <span className="mb-1 flex items-center gap-1.5 text-xs text-text-secondary"><Clock size={14} aria-hidden="true" />{t('timeLeft')}</span>
    <span className="font-mono text-[clamp(1.5rem,3vw,2rem)] font-semibold leading-none tracking-tight tabular-nums">{[hours, minutes, seconds].map(part => String(part).padStart(2, '0')).join(':')}</span>
    {value > 0 && value < 300 && <span className="sr-only" role="status">{t('minutesLeft', { minutes: Math.ceil(value / 60) })}</span>}
  </div>;
}
