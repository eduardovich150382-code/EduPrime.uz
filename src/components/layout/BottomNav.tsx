'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Menu, LayoutDashboard, User, BookOpen, Wand2 } from 'lucide-react';

interface BottomNavProps {
  onMenuClick: () => void;
}

export default function BottomNav({ onMenuClick }: BottomNavProps) {
  const pathname = usePathname();
  const t = useTranslations('nav');

  // Hide during test solving — MainLayoutClient'dagi bir xil qoida bilan
  // mos (konstruktordan kelgan /session/[id] ham shu yerga kiradi).
  const isTestSolving = /\/tests\/[^/]+\/solve/.test(pathname) || /\/session\/[^/]+/.test(pathname);
  if (isTestSolving) return null;

  // Determine active state
  const isDashboard = pathname.endsWith('/dashboard') || pathname.includes('/dashboard/');
  const isTests = pathname.endsWith('/tests') || (pathname.includes('/tests') && !pathname.includes('/solve'));
  const isBuild = pathname.includes('/build');
  const isProfile = pathname.endsWith('/profile');

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around h-14">
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

        {/* Build (test constructor) */}
        <Link
          href="/build"
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors relative ${
            isBuild ? 'text-primary-600' : 'text-text-secondary hover:text-primary-600'
          }`}
        >
          <Wand2 size={22} />
          <span className={`text-[10px] font-medium ${isBuild ? 'text-primary-600' : ''}`}>
            {t('build')}
          </span>
          {isBuild && (
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
