import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import SessionProvider from '@/components/providers/SessionProvider';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <Header />
      <div className="flex pt-16">
        <Sidebar role="USER" />
        <main className="flex-1 ml-64 p-6 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}
