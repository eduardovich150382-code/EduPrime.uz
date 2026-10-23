import Header from '@/components/layout/Header';
import MainLayoutClient from '@/components/layout/MainLayoutClient';
import SessionProvider from '@/components/providers/SessionProvider';
import ReferralHandler from '@/components/providers/ReferralHandler';
import PremiumBanner from '@/components/ui/PremiumBanner';
import SubscriptionExpiryBanner from '@/components/ui/SubscriptionExpiryBanner';
import SiteAnnouncement from '@/components/ui/SiteAnnouncement';

interface AppShellProps {
  // `null` — kirmagan foydalanuvchi. Qobiq (main) va (public) guruhlarida
  // bir xil bo'lishi uchun bitta joyda; farqi faqat redirect'da, u layout'da.
  role: string | null;
  children: React.ReactNode;
}

export default function AppShell({ role, children }: AppShellProps) {
  const isGuest = role === null;

  // Banner only hidden for ADMIN — everyone else sees it until they have active subscription
  // Actual subscription check happens client-side in PremiumBanner component
  const userPlan = role === 'ADMIN' ? 'ADMIN' : 'FREE';

  return (
    <SessionProvider>
      <ReferralHandler />
      <Header />
      <SiteAnnouncement />
      {/* Mehmonda obuna bannerlari yo'q: /api/subscription/status 401
          qaytaradi, PremiumBanner esa xatoda ham banner ko'rsatardi. */}
      {!isGuest && <PremiumBanner userPlan={userPlan} />}
      {!isGuest && <SubscriptionExpiryBanner />}
      <MainLayoutClient role={role} showPremiumBanner={!isGuest}>
        {children}
      </MainLayoutClient>
    </SessionProvider>
  );
}
