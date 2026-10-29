'use client';

import { useSession } from 'next-auth/react';
import MainLayoutClient from '@/components/layout/MainLayoutClient';
import PremiumBanner from '@/components/ui/PremiumBanner';
import SubscriptionExpiryBanner from '@/components/ui/SubscriptionExpiryBanner';

// (public) qobig'i: role serverda `auth()` bilan emas, klientda sessiyadan —
// shunda sahifa statik (ISR) bo'la oladi. Sessiya yuklanguncha `null`
// (mehmon), ustoz/admin menyusi va obuna bannerlari sessiya kelgach chiqadi.
export default function SessionShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const role = status === 'authenticated' ? session.user?.role ?? 'USER' : null;
  const isGuest = role === null;
  return (
    <>
      {!isGuest && <PremiumBanner userPlan={role === 'ADMIN' ? 'ADMIN' : 'FREE'} />}
      {!isGuest && <SubscriptionExpiryBanner />}
      <MainLayoutClient role={role} showPremiumBanner={!isGuest}>
        {children}
      </MainLayoutClient>
    </>
  );
}
