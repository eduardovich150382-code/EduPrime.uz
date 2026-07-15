import Header from '@/components/layout/Header';
import AdminLayoutClient from '@/components/layout/AdminLayoutClient';
import SessionProvider from '@/components/providers/SessionProvider';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const role = (session.user as any)?.role;

  // Only ADMIN can access
  if (role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <SessionProvider>
      <Header />
      <AdminLayoutClient role={role}>
        {children}
      </AdminLayoutClient>
    </SessionProvider>
  );
}
