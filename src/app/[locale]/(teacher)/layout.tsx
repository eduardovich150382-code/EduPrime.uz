import Header from '@/components/layout/Header';
import TeacherLayoutClient from '@/components/layout/TeacherLayoutClient';
import SessionProvider from '@/components/providers/SessionProvider';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const role = (session.user as any)?.role;

  // Only TEACHER and ADMIN can access
  if (role !== 'TEACHER' && role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <SessionProvider>
      <Header />
      <TeacherLayoutClient role={role}>
        {children}
      </TeacherLayoutClient>
    </SessionProvider>
  );
}
