'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  User,
  CreditCard,
  LogOut,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Shield,
  Gift,
  Menu,
  X,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';

interface SidebarProps {
  role: string;
}

export default function Sidebar({ role }: SidebarProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const userLinks = [
    { href: '/dashboard', icon: LayoutDashboard, label: t('dashboard') },
    { href: '/tests', icon: BookOpen, label: t('tests') },
    { href: '/rating', icon: Trophy, label: t('rating') },
    { href: '/pricing', icon: CreditCard, label: t('pricing') },
    { href: '/dashboard/referral', icon: Gift, label: 'Referral' },
    { href: '/profile', icon: User, label: 'Profil' },
  ];

  const teacherLinks = [
    { href: '/teacher', icon: GraduationCap, label: t('teacher') },
  ];

  const adminLinks = [
    { href: '/admin', icon: Shield, label: t('admin') },
  ];

  const links = [
    ...userLinks,
    ...(role === 'TEACHER' || role === 'ADMIN' ? teacherLinks : []),
    ...(role === 'ADMIN' ? adminLinks : []),
  ];

  // Collect all link hrefs to properly determine active state
  const allHrefs = links.map((l) => l.href);

  const sidebarContent = (
    <>
      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isExact = pathname === link.href;
          const isPrefix = pathname.startsWith(link.href + '/');
          const hasMoreSpecific = allHrefs.some(
            (h) => h !== link.href && h.startsWith(link.href + '/') && (pathname === h || pathname.startsWith(h + '/'))
          );
          const isActive = isExact || (isPrefix && !hasMoreSpecific);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-text-secondary hover:bg-primary-50 hover:text-primary-600'
              )}
            >
              <link.icon size={20} className="flex-shrink-0" />
              {!collapsed && <span>{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="p-3 border-t border-border space-y-1">
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all duration-200"
        >
          <LogOut size={20} className="flex-shrink-0" />
          {!collapsed && <span>Chiqish</span>}
        </button>

        {/* Collapse button only visible on desktop */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex w-full items-center justify-center p-2 rounded-xl text-text-secondary hover:bg-primary-50 transition-all"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed bottom-4 left-4 z-50 w-12 h-12 bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-700 transition-colors"
        aria-label="Menyuni ochish"
      >
        <Menu size={22} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="absolute left-0 top-0 h-full w-64 bg-white border-r border-border flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b border-border">
              <span className="text-sm font-semibold text-text-primary">Menyu</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg hover:bg-primary-50 transition-colors"
              >
                <X size={18} className="text-text-secondary" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-border z-40 transition-all duration-300 flex-col',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
