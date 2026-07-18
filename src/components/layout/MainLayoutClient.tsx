'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

interface MainLayoutClientProps {
  role: string;
  children: React.ReactNode;
}

export default function MainLayoutClient({ role, children }: MainLayoutClientProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);

  // Check if premium banner is visible (for padding)
  useEffect(() => {
    const dismissed = sessionStorage.getItem('premium_banner_dismissed');
    // Banner shows only for free users who haven't dismissed it
    setBannerVisible(dismissed !== 'true');
  }, []);

  // Hide sidebar when user is solving a test
  const isTestSolving = /\/tests\/[^/]+\/solve/.test(pathname);

  return (
    <div className={`flex ${bannerVisible ? 'pt-[104px]' : 'pt-16'}`}>
      {!isTestSolving && (
        <Sidebar
          role={role}
          mobileOpen={mobileMenuOpen}
          setMobileOpen={setMobileMenuOpen}
        />
      )}
      <main
        className={`flex-1 min-h-[calc(100vh-4rem)] p-4 sm:p-6 ${
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
