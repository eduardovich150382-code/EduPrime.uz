'use client';

import { usePathname } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { Menu, LayoutDashboard, User, BookOpen } from 'lucide-react';

interface BottomNavProps {
  onMenuClick: () => void;
}

export default function BottomNav({ onMenuClick }: BottomNavProps) {
  const pathname = usePathname();

  // Hide during test solving
  const isTestSolving = /\/tests\/[^/]+\/solve/.test(pathname);
  if (isTestSolving) return null;

  // Determine active state
  const isDashboard = pathname.endsWith('/dashboard') || pathname.includes('/dashboard/');
  const isTests = pathname.endsWith('/tests') || (pathname.includes('/tests') && !pathname.includes('/solve'));
  const isProfile = pathname.endsWith('/profile');

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#1e1e2e] border-t border-gray-200 dark:border-[#313244] shadow-lg">
      <div className="flex items-center justify-around h-16">
        {/* Menu button */}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center gap-1 flex-1 h-full text-text-secondary hover:text-primary-600 transition-colors"
        >
          <Menu size={22} />
          <span className="text-[10px] font-medium">Menyu</span>
        </button>

        {/* Dashboard */}
        <Link
          href="/dashboard"
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors relative ${
            isDashboard ? 'text-primary-600' : 'text-text-secondary hover:text-primary-600'
          }`}
        >
          <LayoutDashboard size={22} />
          <span className={`text-[10px] font-medium ${isDashboard ? 'text-primary-600' : ''}`}>
            Dashboard
          </span>
          {isDashboard && (
            <span className="absolute bottom-1 w-6 h-0.5 rounded-full bg-primary-600" />
          )}
        </Link>

        {/* Tests */}
        <Link
          href="/tests"
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors relative ${
            isTests ? 'text-primary-600' : 'text-text-secondary hover:text-primary-600'
          }`}
        >
          <BookOpen size={22} />
          <span className={`text-[10px] font-medium ${isTests ? 'text-primary-600' : ''}`}>
            Testlar
          </span>
          {isTests && (
            <span className="absolute bottom-1 w-6 h-0.5 rounded-full bg-primary-600" />
          )}
        </Link>

        {/* Profile */}
        <Link
          href="/profile"
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors relative ${
            isProfile ? 'text-primary-600' : 'text-text-secondary hover:text-primary-600'
          }`}
        >
          <User size={22} />
          <span className={`text-[10px] font-medium ${isProfile ? 'text-primary-600' : ''}`}>
            Profil
          </span>
          {isProfile && (
            <span className="absolute bottom-1 w-6 h-0.5 rounded-full bg-primary-600" />
          )}
        </Link>
      </div>
    </nav>
  );
}
