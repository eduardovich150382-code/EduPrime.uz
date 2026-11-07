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
  LogIn,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Shield,
  Gift,
  X,
  Sparkles,
  Globe,
  Video,
  Wand2,
} from 'lucide-react';
import AdminNav from '@/components/admin/AdminNav';
import { useSwitchLocale } from './LanguageSwitcher';
import { locales } from '@/i18n/config';
import { signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { usePathname as useFullPathname } from 'next/navigation';
import { loginHref } from '@/lib/safe-return-path';
import { useSubscriptionStatus } from '@/components/ui/useSubscriptionStatus';

interface SidebarProps {
  // `null` — kirmagan foydalanuvchi ((public) guruhidagi sahifalar).
  role: string | null;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  // 'admin' — (admin) layout: faqat guruhlangan admin menyusi ko'rinadi.
  mode?: 'admin';
}

export default function Sidebar({ role, mobileOpen, setMobileOpen, mode }: SidebarProps) {
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');
  const tSubscription = useTranslations('subscriptionUi');
  const { locale, switchLocale } = useSwitchLocale();
  const isAdminMode = mode === 'admin';
  const pathname = usePathname();
  // callbackUrl uchun locale prefiksli yo'l (Header'dagi bilan bir xil sabab).
  const fullPathname = useFullPathname();
  const isGuest = role === null;
  const [collapsed, setCollapsed] = useState(false);
  const status = useSubscriptionStatus(!isGuest);
  const showOffer = (isGuest || !!status && !status.hasAnyScope && !status.subscriptions.length) && role !== 'ADMIN' && !isAdminMode;

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
    { href: '/build', icon: Wand2, label: t('build') },
    { href: '/courses', icon: Video, label: t('courses') },
    { href: '/rating', icon: Trophy, label: t('rating') },
    { href: '/pricing', icon: CreditCard, label: t('pricing') },
    { href: '/dashboard/referral', icon: Gift, label: t('referral') },
    { href: '/profile', icon: User, label: tCommon('profile') },
  ];

  const teacherLinks = [
    { href: '/teacher', icon: GraduationCap, label: t('teacher') },
  ];

  // Sayt sahifalarida admin uchun bitta kirish nuqtasi — to'liq guruhlangan
  // menyu faqat /admin ichida (AdminNav), aks holda ro'yxat juda uzun bo'lardi.
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
      {isAdminMode ? <AdminNav collapsed={collapsed} /> : <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
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
              aria-label={collapsed ? link.label : undefined}
              title={collapsed ? link.label : undefined}
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
      </nav>}

      {/* Obunasiz foydalanuvchi uchun taklif. */}
      {showOffer && <div className="p-3 border-t border-border">
        <Link
          href="/pricing"
          aria-label={tSubscription('subscribe')}
          className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-200 transition-all hover:shadow-sm"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center flex-shrink-0">
            <Sparkles size={18} className="text-white" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-semibold text-primary-700">{tSubscription('subscribe')}</p>
              <p className="text-xs text-text-secondary">{tSubscription('offer')}</p>
            </div>
          )}
        </Link>
      </div>}

      {/* Language switcher (mobile only) */}
      <div className="md:hidden p-3 border-t border-border">
        <div className="flex items-center gap-2 px-3">
          <Globe size={16} className="text-text-secondary" />
          <span className="text-xs text-text-secondary font-medium">{t('language')}</span>
          <div className="flex gap-1 ml-auto">
            {locales.map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={l === locale}
                onClick={() => switchLocale(l)}
                className={cn(
                  'min-h-11 min-w-11 px-2 rounded-lg text-xs font-medium transition-colors uppercase',
                  l === locale ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-text-secondary hover:bg-primary-100 hover:text-primary-600',
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="p-3 border-t border-border space-y-1">
        {isGuest ? (
          <Link
            href={loginHref(fullPathname)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-primary-700 hover:bg-primary-50 transition-all duration-200"
          >
            <LogIn size={20} className="flex-shrink-0" />
            {!collapsed && <span>{tCommon('login')}</span>}
          </Link>
        ) : (
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full min-h-11 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all duration-200"
          >
            <LogOut size={20} className="flex-shrink-0" />
            {!collapsed && <span>{tCommon('logout')}</span>}
          </button>
        )}

        {/* Collapse button only visible on desktop */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? t('expand') : t('collapse')}
          title={collapsed ? t('expand') : t('collapse')}
          className="hidden md:flex w-full min-h-11 items-center justify-center p-2 rounded-xl text-text-secondary hover:bg-primary-50 transition-all"
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
              <span className="text-sm font-semibold text-text-primary">{t('menu')}</span>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label={t('closeMenu')}
                title={t('closeMenu')}
                className="min-h-11 min-w-11 flex items-center justify-center rounded-lg hover:bg-primary-50 transition-colors"
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
