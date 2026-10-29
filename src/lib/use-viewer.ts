'use client';

import { useSyncExternalStore } from 'react';
import { useSession } from 'next-auth/react';
import { readAuthHint } from './auth-hint';

/**
 * Statik sahifadagi shaxsiy blok qaysi ko'rinishda chizilsin:
 * - `unknown` — SSR va hydration: ikkala variant ham chiziladi, qaysi biri
 *   ko'rinishini `data-authed` CSS bilan hal qiladi (mismatch yo'q);
 * - `guest` / `authed` — sessiya aniq yoki (klient navigatsiyada) ishora bor.
 *
 * Ma'lumot so'rash uchun bu emas, `useSession().status === 'authenticated'`
 * ishlatilsin — ishora eskirgan bo'lishi mumkin.
 */
export type ViewerView = 'unknown' | 'guest' | 'authed';

const noopSubscribe = () => () => {};

export function useViewer(): ViewerView {
  const { status } = useSession();
  // Server snapshot `unknown` — hydration serverniki bilan bir xil chiqadi,
  // keyin klient snapshot'i bilan qayta render bo'ladi. (main) dan klient
  // navigatsiyada SessionProvider qayta o'rnatiladi va status yana
  // `loading` — shunda ishora darhol ishlaydi.
  const hint = useSyncExternalStore<ViewerView>(noopSubscribe, () => (readAuthHint() ? 'authed' : 'guest'), () => 'unknown');
  if (status === 'authenticated') return 'authed';
  if (status === 'unauthenticated') return 'guest';
  return hint;
}
