'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

interface MainLayoutClientProps {
  role: string | null;
  // Mehmonda PremiumBanner render qilinmaydi — padding uning joyini band qilmasin.
  showPremiumBanner: boolean;
  children: React.ReactNode;
}

export default function MainLayoutClient({ role, showPremiumBanner, children }: MainLayoutClientProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Hide sidebar when user is solving a test — konstruktordan ("/build")
  // kelgan virtual sessiyalar /session/[id] da yechiladi, xuddi shu holat
  // (sidebar/bottomnav chalg'itmasligi) shu yerda ham qo'llanadi.
  const isTestSolving = /\/tests\/[^/]+\/solve/.test(pathname) || /\/session\/[^/]+/.test(pathname);

  return (
    <div className="flex" style={{ paddingTop: showPremiumBanner ? 'calc(4rem + var(--subscription-banner-height, 0px))' : '4rem' }}>
      {!isTestSolving && (
        <Sidebar
          role={role}
          mobileOpen={mobileMenuOpen}
          setMobileOpen={setMobileMenuOpen}
        />
      )}
      <main
        className={`min-w-0 flex-1 min-h-[calc(100vh-4rem)] p-4 sm:p-6 ${
          isTestSolving ? 'ml-0' : 'md:ml-64 ml-0'
        } ${!isTestSolving ? 'pb-20 md:pb-6' : ''}`}
      >
        {children}
      </main>
      {!isTestSolving && (
        <BottomNav onMenuClick={() => setMobileMenuOpen(true)} />
      )}
    </div>
  );
}
