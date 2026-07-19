import Header from '@/components/layout/Header';
import MainLayoutClient from '@/components/layout/MainLayoutClient';
import SessionProvider from '@/components/providers/SessionProvider';
import ReferralHandler from '@/components/providers/ReferralHandler';
import PremiumBanner from '@/components/ui/PremiumBanner';
import SubscriptionExpiryBanner from '@/components/ui/SubscriptionExpiryBanner';
import SiteAnnouncement from '@/components/ui/SiteAnnouncement';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const role = (session.user as any)?.role || 'USER';

  // Banner only hidden for ADMIN — everyone else sees it until they have active subscription
  // Actual subscription check happens client-side in PremiumBanner component
  const userPlan = role === 'ADMIN' ? 'ADMIN' : 'FREE';

  return (
    <SessionProvider>
      <ReferralHandler />
      <Header />
      <SiteAnnouncement />
      <PremiumBanner userPlan={userPlan} />
      <SubscriptionExpiryBanner />
      <MainLayoutClient role={role}>
        {children}
      </MainLayoutClient>
    </SessionProvider>
  );
}
