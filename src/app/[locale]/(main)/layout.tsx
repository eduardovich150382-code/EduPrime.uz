import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
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
      <div className="flex pt-16">
        <Sidebar role={role} />
        <main className="flex-1 ml-64 p-6 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}
