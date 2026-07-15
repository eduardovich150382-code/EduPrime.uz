import Header from '@/components/layout/Header';
import MainLayoutClient from '@/components/layout/MainLayoutClient';
import SessionProvider from '@/components/providers/SessionProvider';
import ReferralHandler from '@/components/providers/ReferralHandler';
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

  return (
    <SessionProvider>
      <ReferralHandler />
      <Header />
      <MainLayoutClient role={role}>
        {children}
      </MainLayoutClient>
    </SessionProvider>
  );
}
