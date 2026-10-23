'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { Link, usePathname as useLocalePathname } from '@/i18n/routing';
import { Menu, User, BookOpen, Wand2, Award, LogIn } from 'lucide-react';
import { ATTESTATION_HREF, isAttestationPath } from '@/lib/nav-links';
import { loginHref } from '@/lib/safe-return-path';

interface BottomNavProps {
  onMenuClick: () => void;
}

export default function BottomNav({ onMenuClick }: BottomNavProps) {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');
  const { status } = useSession();
  const isAttestation = isAttestationPath(useLocalePathname());

  // Hide during test solving — MainLayoutClient'dagi bir xil qoida bilan
  // mos (konstruktordan kelgan /session/[id] ham shu yerga kiradi).
  const isTestSolving = /\/tests\/[^/]+\/solve/.test(pathname) || /\/session\/[^/]+/.test(pathname);
  if (isTestSolving) return null;

  // Determine active state
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

        {/* Attestatsiya — markaziy, ajralib turadigan punkt. */}
        <Link
          href={ATTESTATION_HREF}
          aria-label={t('attestation')}
          aria-current={isAttestation ? 'page' : undefined}
          className="flex flex-col items-center justify-center gap-1 flex-1 h-full relative"
        >
          <span
            aria-hidden="true"
            className="-mt-5 w-11 h-11 rounded-xl bg-[#fbbf24] text-[#451a03] flex items-center justify-center shadow-md ring-4 ring-white"
          >
            <Award size={22} />
          </span>
          <span className="text-[10px] font-semibold text-[#92400e] whitespace-nowrap">
            {t('attestation')}
          </span>
          {isAttestation && (
            <span className="absolute bottom-1 w-6 h-0.5 rounded-full bg-[#92400e]" />
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

        {/* Profile. Mehmonda "Kirish" — faqat aniq 'unauthenticated' da:
            'loading' paytida Profil qoladi, kirgan foydalanuvchida miltillamasin. */}
        {status === 'unauthenticated' ? (
          <Link
            href={loginHref(pathname)}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full text-text-secondary hover:text-primary-600 transition-colors"
          >
            <LogIn size={22} />
            <span className="text-[10px] font-medium">{tCommon('login')}</span>
          </Link>
        ) : (
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
        )}
      </div>
    </nav>
  );
}
