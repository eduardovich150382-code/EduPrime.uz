'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

interface AdminLayoutClientProps {
  role: string;
  children: React.ReactNode;
}

export default function AdminLayoutClient({ role, children }: AdminLayoutClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex pt-16">
      <Sidebar role={role} mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
      <main className="flex-1 md:ml-64 ml-0 p-4 sm:p-6 min-h-[calc(100vh-4rem)] pb-20 md:pb-6">
        {children}
      </main>
      <BottomNav onMenuClick={() => setMobileMenuOpen(true)} />
    </div>
  );
}
