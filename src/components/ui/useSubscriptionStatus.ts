'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { SubscriptionStatus } from '@/lib/subscription-display';

// Header, Sidebar, ikki banner va CTA bitta sahifada birga turadi — har biri
// alohida so'rov yubormasin. Kesh foydalanuvchi ID'si bilan bog'langan:
// boshqa akkauntga o'tilsa eski obunalar bir lahza ham ko'rinmasin.
const TTL_MS = 60_000;
let cache: { userId: string; at: number; promise: Promise<SubscriptionStatus> } | null = null;

export function loadSubscriptionStatus(userId: string, now = Date.now()): Promise<SubscriptionStatus> {
  if (cache && cache.userId === userId && now - cache.at < TTL_MS) return cache.promise;
  const promise = fetch('/api/subscription/status').then((response) => {
    if (!response.ok) throw new Error('STATUS_UNAVAILABLE');
    return response.json() as Promise<SubscriptionStatus>;
  });
  const entry = { userId, at: now, promise };
  cache = entry;
  // Xato (401/500/tarmoq) keshlanmaydi — keyingi chaqiruv qayta so'raydi.
  promise.catch(() => { if (cache === entry) cache = null; });
  return promise;
}

export function clearSubscriptionStatusCache() {
  cache = null;
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
