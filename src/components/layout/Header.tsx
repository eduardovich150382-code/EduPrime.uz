'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname as useLocalePathname } from '@/i18n/routing';
import { Menu, X, LogOut, User, Bell } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import LanguageSwitcher from './LanguageSwitcher';
import HeaderSubscription from './HeaderSubscription';
import { ATTESTATION_HREF, isAttestationPath } from '@/lib/nav-links';
import { loginHref } from '@/lib/safe-return-path';

export default function Header() {
  const t = useTranslations();
  const { data: session, status } = useSession();
  // Locale prefiksli yo'l — middleware callbackUrl'ga ham shuni qo'yadi,
  // shunda ruscha sahifadan kirgan mehmon ruscha sahifaga qaytadi.
  const pathname = usePathname();
  const isAttestation = isAttestationPath(useLocalePathname());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = status === 'authenticated' && session?.user;
  const userRole = session?.user?.role;

  // Fetch unread notification count
  useEffect(() => {
    if (!isLoggedIn) return;

    async function fetchCount() {
      try {
        const res = await fetch('/api/notifications/count');
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.count);
        }
      } catch (error) {
        // silently fail
      }
    }

    fetchCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  // Click outside to close user dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // Click outside to close mobile menu
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (isMenuOpen && mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      // Small delay to avoid closing immediately on the button click
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleOutsideClick);
      }, 10);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleOutsideClick);
      };
    }
  }, [isMenuOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-primary-100/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 h-16">
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-600 to-primary-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            <span className="text-xl font-bold text-text-primary">
              Edu<span className="gradient-text">Prime</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/" className="btn-ghost text-sm">
              {t('nav.home')}
            </Link>
            <Link href="/tests" className="btn-ghost text-sm">
              {t('nav.tests')}
            </Link>
            <Link
              href={ATTESTATION_HREF}
              aria-current={isAttestation ? 'page' : undefined}
              className={`btn-ghost text-sm font-semibold !text-[#92400e] inline-flex items-center gap-1.5 ${isAttestation ? '!bg-[#fef3c7]' : ''}`}
            >
              {t('nav.attestation')}
              <span className="rounded-full bg-[#fef3c7] text-[#92400e] text-[10px] font-semibold leading-none px-1.5 py-1">
                {t('nav.attestationBadge')}
              </span>
            </Link>
            <Link href="/rating" className="btn-ghost text-sm">
              {t('nav.rating')}
            </Link>
            <Link href="/pricing" className="btn-ghost text-sm">
              {t('nav.pricing')}
            </Link>
          </nav>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />

            {/* Obunasizga "Obuna olish", obunachiga muddat belgisi. */}
            <HeaderSubscription />

            {isLoggedIn ? (
              <>
                {/* Bell notification icon */}
                <Link
                  href="/dashboard/notifications"
                  className="relative p-2 rounded-lg hover:bg-primary-50 transition-colors"
                >
                  <Bell size={20} className="text-text-secondary" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* User avatar and name */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-primary-50 transition-colors"
                  >
                    {session.user?.image ? (
                      <img
                        src={session.user.image}
                        alt={session.user?.name || ''}
                        className="w-8 h-8 rounded-full object-cover border-2 border-primary-200"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <User size={16} className="text-primary-600" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-text-primary max-w-[120px] truncate">
                      {session.user?.name || 'Foydalanuvchi'}
                    </span>
                  </button>

                  {showUserMenu && (
                    <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-lg border border-border py-2 min-w-[180px] z-50">
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-primary-50 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User size={16} />
                        Dashboard
                      </Link>
                      <Link
                        href="/dashboard/notifications"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-primary-50 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Bell size={16} />
                        Bildirishnomalar
                        {unreadCount > 0 && (
                          <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </Link>
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-primary-50 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User size={16} />
                        {t('common.profile')}
                      </Link>
                      <hr className="my-1 border-border" />
                      <button
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={16} />
                        {t('common.logout')}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* User is NOT logged in - show login buttons */
              <>
                <Link href={loginHref(pathname)} className="btn-secondary text-sm !px-4 !py-2">
                  {t('common.login')}
                </Link>
                <Link href={loginHref(pathname)} className="btn-primary text-sm !px-4 !py-2">
                  {t('common.register')}
                </Link>
              </>
            )}
          </div>

          {/* 360px'da logo + obuna belgisi + qo'ng'iroq + menyu sig'ishi uchun
              guruh qisqarishi mumkin — belgidagi fan nomi kesiladi, kun soni emas. */}
          <div className="md:hidden flex min-w-0 items-center gap-1">
            <HeaderSubscription compact />
            {isLoggedIn && (
              <>
                <Link
                  href="/dashboard/notifications"
                  className="relative p-2 rounded-lg hover:bg-primary-50 transition-colors"
                >
                  <Bell size={20} className="text-text-secondary" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-0.5">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              </>
            )}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg hover:bg-primary-50 transition-colors"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div ref={mobileMenuRef} className="md:hidden py-4 border-t border-border dark:border-[#313244]">
            <nav className="flex flex-col gap-2">
              <Link href="/" className="btn-ghost text-sm" onClick={() => setIsMenuOpen(false)}>
                {t('nav.home')}
              </Link>
              <Link href="/tests" className="btn-ghost text-sm" onClick={() => setIsMenuOpen(false)}>
                {t('nav.tests')}
              </Link>
              <Link
                href={ATTESTATION_HREF}
                aria-current={isAttestation ? 'page' : undefined}
                className={`btn-ghost text-sm font-semibold !text-[#92400e] flex items-center gap-1.5 ${isAttestation ? '!bg-[#fef3c7]' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                {t('nav.attestation')}
                <span className="rounded-full bg-[#fef3c7] text-[#92400e] text-[10px] font-semibold leading-none px-1.5 py-1">
                  {t('nav.attestationBadge')}
                </span>
              </Link>
              <Link href="/rating" className="btn-ghost text-sm" onClick={() => setIsMenuOpen(false)}>
                {t('nav.rating')}
              </Link>
              <Link href="/pricing" className="btn-ghost text-sm" onClick={() => setIsMenuOpen(false)}>
                {t('nav.pricing')}
              </Link>
              {isLoggedIn && (
                <Link href="/dashboard/notifications" className="btn-ghost text-sm flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
                  <Bell size={16} />
                  Bildirishnomalar
                  {unreadCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              )}
              <div className="flex items-center gap-2 pt-2 border-t border-border mt-2">
                <LanguageSwitcher />
                {isLoggedIn ? (
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="btn-ghost text-sm text-red-600 flex-1"
                  >
                    {t('common.logout')}
                  </button>
                ) : (
                  <Link href={loginHref(pathname)} className="btn-primary text-sm flex-1 text-center">
                    {t('common.login')}
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
