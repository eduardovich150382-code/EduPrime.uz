'use client';

import type { ReactNode } from 'react';
import { useViewer } from '@/lib/use-viewer';

/**
 * Ikkala variantni ham chizadi, ko'rinadiganini `globals.css` dagi
 * `[data-authed]` qoidasi tanlaydi (o'ramalar `display: contents`, span —
 * matn ichida ham to'g'ri HTML). Hook'siz — statik HTML va hydration
 * uchun.
 */
export function HintSwitch({ guest, authed }: { guest: ReactNode; authed: ReactNode }) {
  return (
    <>
      <span className="viewer-guest">{guest}</span>
      <span className="viewer-authed">{authed}</span>
    </>
  );
}

/** Mehmon va kirgan foydalanuvchi uchun alohida blok; aniq bo'lguncha `HintSwitch`. */
export function ViewerGate({ guest, authed }: { guest: ReactNode; authed: ReactNode }) {
  const viewer = useViewer();
  if (viewer === 'unknown') return <HintSwitch guest={guest} authed={authed} />;
  return <>{viewer === 'guest' ? guest : authed}</>;
}
