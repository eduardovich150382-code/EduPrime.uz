import AppShell from '@/components/layout/AppShell';
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

  const role = session.user?.role || 'USER';

  // Layout baribir dinamik va sessiyani o'qigan — uni klientga ham beramiz,
  // aks holda har (main) sahifasi ochilganda /api/auth/session funksiyasi
  // xuddi shu ishni qayta qilardi.
  return <AppShell role={role} session={session}>{children}</AppShell>;
}
