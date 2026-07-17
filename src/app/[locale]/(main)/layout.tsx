import Header from '@/components/layout/Header';
import MainLayoutClient from '@/components/layout/MainLayoutClient';
import SessionProvider from '@/components/providers/SessionProvider';
import ReferralHandler from '@/components/providers/ReferralHandler';
import PremiumBanner from '@/components/ui/PremiumBanner';
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

  // Determine user plan for banner visibility
  // FREE users (role=USER without active subscription) see the banner
  const userPlan = role === 'ADMIN' ? 'ADMIN' : role === 'TEACHER' ? 'TEACHER_PLAN' : 'FREE';

  return (
    <SessionProvider>
      <ReferralHandler />
      <Header />
      <PremiumBanner userPlan={userPlan} />
      <MainLayoutClient role={role}>
        {children}
      </MainLayoutClient>
    </SessionProvider>
  );
}
