'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { SubscriptionStatus } from '@/lib/subscription-display';
import { clearMeHeaderCache, loadMeHeader } from '@/lib/me-header-store';

// Obuna holati header so'rovi (`/api/me/header`) ichida keladi — Header'dagi
// son bilan bitta so'rov va bitta 60 soniyalik kesh (lib/me-header-store.ts).
// Kesh foydalanuvchi ID'si bilan bog'langan.
export function loadSubscriptionStatus(userId: string, now = Date.now()): Promise<SubscriptionStatus> {
  return loadMeHeader(userId, now).then((header) => {
    if (!header.subscription) throw new Error('STATUS_UNAVAILABLE');
    return header.subscription;
  });
}

// Sotib olishdan keyin keyingi chaqiruv yangi holatni olsin.
export function clearSubscriptionStatusCache() {
  clearMeHeaderCache();
}

export function useSubscriptionStatus(enabled = true) {
  const { data: session, status: authStatus } = useSession();
  const userId = session?.user?.id ?? null;
  const [state, setState] = useState<{ userId: string; status: SubscriptionStatus } | null>(null);
  useEffect(() => {
    if (authStatus === 'unauthenticated') clearSubscriptionStatusCache();
  }, [authStatus]);
  useEffect(() => {
    if (!enabled || !userId) return;
    let active = true;
    loadSubscriptionStatus(userId)
      .then((status) => { if (active) setState({ userId, status }); })
      .catch(() => {});
    return () => { active = false; };
  }, [enabled, userId]);
  return enabled && userId && state?.userId === userId ? state.status : null;
}
