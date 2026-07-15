'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Menu, X, LogOut, User } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import LanguageSwitcher from './LanguageSwitcher';

export default function Header() {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = status === 'authenticated' && session?.user;

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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-primary-100/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
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

            {isLoggedIn ? (
              /* User is logged in - show avatar and name */
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
            ) : (
              /* User is NOT logged in - show login buttons */
              <>
                <Link href="/login" className="btn-secondary text-sm !px-4 !py-2">
                  {t('common.login')}
                </Link>
                <Link href="/login" className="btn-primary text-sm !px-4 !py-2">
                  {t('common.register')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-primary-50 transition-colors"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col gap-2">
              <Link href="/" className="btn-ghost text-sm" onClick={() => setIsMenuOpen(false)}>
                {t('nav.home')}
              </Link>
              <Link href="/tests" className="btn-ghost text-sm" onClick={() => setIsMenuOpen(false)}>
                {t('nav.tests')}
              </Link>
              <Link href="/rating" className="btn-ghost text-sm" onClick={() => setIsMenuOpen(false)}>
                {t('nav.rating')}
              </Link>
              <Link href="/pricing" className="btn-ghost text-sm" onClick={() => setIsMenuOpen(false)}>
                {t('nav.pricing')}
              </Link>
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
                  <Link href="/login" className="btn-primary text-sm flex-1 text-center">
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
