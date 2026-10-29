'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export interface PersonalData<T> {
  /** `null` — hali yuklanmagan, mehmon yoki xato. */
  data: T | null;
  /** So'rov yiqildi — chaqiruvchi mehmon ko'rinishiga qaytadi (cheksiz skeleton emas). */
  failed: boolean;
  reload: () => void;
}

/**
 * Statik sahifaning shaxsiy qismi (`/api/.../me`). Faqat sessiya aniq
 * `authenticated` bo'lganda so'raladi — mehmonda so'rov yo'q (401 shovqini
 * ham yo'q). Foydalanuvchi almashsa eski javob ko'rinmasin.
 */
export function usePersonalData<T>(url: string): PersonalData<T> {
  const { data: session, status } = useSession();
  const userId = status === 'authenticated' ? session.user?.id ?? null : null;
  const [state, setState] = useState<{ userId: string; data: T | null; failed: boolean } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    fetch(url, { cache: 'no-store', signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setState({ userId, data: (await res.json()) as T, failed: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ userId, data: null, failed: true });
      });
    return () => controller.abort();
  }, [url, userId, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const mine = state && state.userId === userId ? state : null;
  return { data: mine?.data ?? null, failed: mine?.failed ?? false, reload };
}
