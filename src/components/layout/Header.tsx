'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Menu, X, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import LanguageSwitcher from './LanguageSwitcher';

export default function Header() {
  const t = useTranslations();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
            <Link href="/login" className="btn-secondary text-sm !px-4 !py-2">
              {t('common.login')}
            </Link>
            <Link href="/login" className="btn-primary text-sm !px-4 !py-2">
              {t('common.register')}
            </Link>
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
                <Link href="/login" className="btn-primary text-sm flex-1 text-center">
                  {t('common.login')}
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
