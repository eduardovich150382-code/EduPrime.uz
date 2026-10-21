'use client';

import { useEffect, useRef, useState } from 'react';

interface ClockState { deadline: number; remaining: number; paused: boolean; total: number }

export function usePracticeClock(testId: string, total: number) {
  const key = `test_clock_${testId}`;
  const [clock, setClock] = useState<ClockState | null>(null);
  const cleared = useRef(false);
  useEffect(() => {
    if (total <= 0) return;
    const now = Date.now();
    let initial: ClockState = { deadline: now + total * 1000, remaining: total, total, paused: false };
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(key) || 'null');
      if (raw && typeof raw === 'object' && 'total' in raw && raw.total === total &&
        'deadline' in raw && typeof raw.deadline === 'number' && Number.isFinite(raw.deadline) &&
        'remaining' in raw && typeof raw.remaining === 'number' && Number.isFinite(raw.remaining) &&
        'paused' in raw && typeof raw.paused === 'boolean') {
        initial = { total, deadline: raw.deadline, paused: raw.paused,
          remaining: Math.max(0, Math.min(total, raw.paused ? raw.remaining : Math.ceil((raw.deadline - now) / 1000))) };
      }
    } catch { /* Storage yopiq bo'lsa ham mashq ishlashi kerak. */ }
    cleared.current = false;
    setClock(initial);
    const timer = setInterval(() => setClock(prev => {
      if (!prev || prev.paused) return prev;
      const remaining = Math.max(0, Math.ceil((prev.deadline - Date.now()) / 1000));
      return remaining === prev.remaining ? prev : { ...prev, remaining };
    }), 250);
    return () => clearInterval(timer);
  }, [key, total]);
  useEffect(() => {
    if (!clock || cleared.current) return;
    try { localStorage.setItem(key, JSON.stringify(clock)); } catch { /* Storage to'lsa, vaqt yurishda davom etadi. */ }
  }, [clock, key]);
  return {
    remaining: clock?.remaining ?? total,
    elapsed: Math.max(0, total - (clock?.remaining ?? total)),
    paused: clock?.paused ?? false,
    pause: () => setClock(prev => prev ? { ...prev, paused: true, remaining: Math.max(0, Math.ceil((prev.deadline - Date.now()) / 1000)) } : prev),
    resume: () => setClock(prev => prev ? { ...prev, paused: false, deadline: Date.now() + prev.remaining * 1000 } : prev),
    clear: () => { cleared.current = true; try { localStorage.removeItem(key); } catch { /* Natijaga o'tishni to'xtatmasin. */ } },
  };
}
