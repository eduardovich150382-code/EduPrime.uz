'use client';

import { useSyncExternalStore } from 'react';
import { daysUntil } from './date';

const noopSubscribe = () => () => {};

/**
 * "N kun qoldi" faqat klientda, Toshkent bo'yicha bugungi kundan. Statik
 * (ISR) sahifa kunlab eski render'dan berilishi mumkin — serverda hisoblangan
 * son eskirardi. `undefined` — hali hisoblanmagan (SSR va hydration: server
 * snapshot, mismatch yo'q), `null` — sana yo'q yoki o'tgan.
 */
export function useDaysUntil(dateKey: string | null | undefined): number | null | undefined {
  return useSyncExternalStore<number | null | undefined>(noopSubscribe, () => daysUntil(dateKey), () => undefined);
}
