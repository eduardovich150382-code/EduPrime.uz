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
  X,
  Crown,
  Globe,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';

interface SidebarProps {
  role: string;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export default function Sidebar({ role, mobileOpen, setMobileOpen }: SidebarProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // User plan label (role based — subscription check will be added later)
  const planLabel = role === 'TEACHER' ? 'Ustoz' : 'Bepul';
  const planColor = role === 'TEACHER' ? 'text-purple-600 bg-purple-50' : 'text-text-secondary bg-gray-100';

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

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
      {/* Tarif ko'rsatish */}
      {!collapsed && (
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="text-xs text-text-secondary">Tarifingiz:</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${planColor}`}>
              {planLabel}
            </span>
          </div>
        </div>
      )}
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

      {/* Premium CTA (only in mobile sidebar for free users) */}
      <div className="md:hidden p-3 border-t border-border">
        <Link
          href="/pricing"
          className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-200 transition-all hover:shadow-sm"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center flex-shrink-0">
            <Crown size={18} className="text-white" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-semibold text-primary-700">Premium oling</p>
              <p className="text-xs text-text-secondary">Barcha testlar cheksiz</p>
            </div>
          )}
        </Link>
      </div>

      {/* Language switcher (mobile only) */}
      <div className="md:hidden p-3 border-t border-border">
        <div className="flex items-center gap-2 px-3">
          <Globe size={16} className="text-text-secondary" />
          <span className="text-xs text-text-secondary font-medium">Til:</span>
          <div className="flex gap-1 ml-auto">
            {(['uz', 'ru', 'en'] as const).map((l) => (
              <button
                key={l}
                onClick={() => {
                  const { useRouter } = require('@/i18n/routing');
                  // Language switch handled by LanguageSwitcher component
                }}
                className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-text-secondary hover:bg-primary-100 hover:text-primary-600 transition-colors uppercase"
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

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
