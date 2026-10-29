'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { readAuthHint } from './auth-hint';
import { decidePersonal, fetchPersonal, type SessionState, type Settled } from './personal-data';

export interface PersonalData<T> {
  /** `null` — hali yuklanmagan, mehmon yoki xato. */
  data: T | null;
  /** So'rov yiqildi — chaqiruvchi mehmon ko'rinishiga qaytadi (cheksiz skeleton emas). */
  failed: boolean;
  reload: () => void;
}

/**
 * Statik sahifaning shaxsiy qismi (`/api/.../me`). Ishora bor bo'lsa so'rov
 * `/api/auth/session` bilan parallel ketadi (ketma-ket ikki so'rov ~1 s
 * kechikish berardi); ishora yo'q bo'lsa sessiya `authenticated` bo'lishini
 * kutadi — mehmonda so'rov yo'q. Javob qabul qilish qoidasi
 * `lib/personal-data.ts` da: faqat sessiya foydalanuvchisiniki ko'rsatiladi.
 */
export function usePersonalData<T>(url: string): PersonalData<T> {
  const { data: session, status } = useSession();
  const userId = status === 'authenticated' ? session.user?.id ?? null : null;
  const sessionState: SessionState = status === 'authenticated' ? { status, userId } : { status, userId: null };
  const [settled, setSettled] = useState<(Settled<T> & { url: string }) | null>(null);
  // Ref'da, effekt bog'liqligida emas: loading → authenticated o'tishida
  // ishora bilan ketgan so'rov bekor qilinmasin — butun yutuq shunda.
  const inflight = useRef<{ controller: AbortController; url: string } | null>(null);

  const start = useCallback((forUser: string | null) => {
    inflight.current?.controller.abort();
    const request = { controller: new AbortController(), url };
    inflight.current = request;
    fetchPersonal<T>(url, request.controller.signal).then(
      (result) => {
        if (inflight.current !== request) return;
        inflight.current = null;
        setSettled({ result, forUser, url });
      },
      () => { if (inflight.current === request) inflight.current = null; },
    );
  }, [url]);

  const current = settled?.url === url ? settled : null;
  const decision = decidePersonal(current, sessionState);

  useEffect(() => {
    if (status === 'unauthenticated') {
      inflight.current?.controller.abort();
      inflight.current = null;
      return;
    }
    if (inflight.current?.url === url) return;
    if (status === 'loading') {
      if (!current && readAuthHint()) start(null);
      return;
    }
    if (decision.action === 'fetch') start(userId);
  }, [status, userId, url, current, decision.action, start]);

  useEffect(() => () => {
    inflight.current?.controller.abort();
    inflight.current = null;
  }, []);

  // Eski ma'lumot yangisi kelguncha ko'rinib turadi (settled almashmaguncha).
  const reload = useCallback(() => { if (userId) start(userId); }, [userId, start]);
  return decision.action === 'show'
    ? { data: decision.data, failed: decision.failed, reload }
    : { data: null, failed: false, reload };
}
