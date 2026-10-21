'use client';

import { useCallback, useEffect, useRef } from 'react';
import { canAutoAdvance } from '@/lib/exam-presentation';

export function useAutoAdvance(enabled: boolean, blocked: boolean, current: number, total: number, navigate: (index: number) => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateRef = useRef(navigate);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);
  const cancel = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  useEffect(() => cancel, [cancel, enabled, blocked, current, total]);
  const schedule = (type: string, answer: string) => {
    cancel();
    if (!enabled || blocked || current >= total - 1 || !canAutoAdvance(type, answer)) return;
    timer.current = setTimeout(() => { timer.current = null; navigateRef.current(current + 1); }, 450);
  };
  return { cancel, schedule };
}
