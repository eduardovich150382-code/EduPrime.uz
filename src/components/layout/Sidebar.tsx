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
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useState } from 'react';

interface SidebarProps {
  role: string;
}

export default function Sidebar({ role }: SidebarProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

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

  return (
    <aside
      className={cn(
        'fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-border z-40 transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
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

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-xl text-text-secondary hover:bg-primary-50 transition-all"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
}
