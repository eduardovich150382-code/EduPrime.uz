import AppShell from '@/components/layout/AppShell';
import { auth } from '@/lib/auth';

// Kirmagan foydalanuvchi ham ko'radigan sahifalar — (main) bilan bir xil
// qobiq, faqat redirect yo'q. Sahifa ichida shaxsiy qism `session` bo'yicha
// yashiriladi; test yechish, natija va to'lov (main) da qoladi.
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return <AppShell role={session?.user?.role ?? null}>{children}</AppShell>;
}
