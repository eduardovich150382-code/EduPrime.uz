'use client';

import { useState, useEffect } from 'react';
import { Crown, X, ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/routing';

interface PremiumBannerProps {
  userPlan?: string; // 'ADMIN' means hide completely
}

/**
 * Premium banner — Header pastida sticky.
 * ADMIN dan boshqa HAMMAGA ko'rsatiladi (USER va TEACHER role).
 * Agar aktiv subscription bo'lsa — ko'rsatilmaydi.
 * ✕ bosilganda shu sessiya uchun yashirinadi.
 */
export default function PremiumBanner({ userPlan }: PremiumBannerProps) {
  const [dismissed, setDismissed] = useState(true);
  const [hasSubscription, setHasSubscription] = useState(false);

  useEffect(() => {
    // Admin never sees banner
    if (userPlan === 'ADMIN') {
      setDismissed(true);
      return;
    }

    // Check if dismissed this session
    const wasDismissed = sessionStorage.getItem('premium_banner_dismissed');
    if (wasDismissed === 'true') {
      setDismissed(true);
      return;
    }

    // Check real subscription status
    fetch('/api/subscription/status')
      .then(r => r.json())
      .then(data => {
        if (data.plan && data.plan !== 'FREE') {
          setHasSubscription(true);
          setDismissed(true);
        } else {
          setDismissed(false);
        }
      })
      .catch(() => {
        // If API fails, show banner anyway
        setDismissed(false);
      });
  }, [userPlan]);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('premium_banner_dismissed', 'true');
  };

  if (dismissed) return null;

  return (
    <div className="fixed top-16 left-0 right-0 w-full bg-gradient-to-r from-primary-600 via-primary-500 to-purple-600 text-white z-40">
      <div className="md:ml-64 px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Crown size={16} className="flex-shrink-0 text-yellow-300" />
          <p className="text-xs sm:text-sm font-medium">
            Premium ga o&apos;ting — barcha testlar cheksiz!
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/pricing"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors"
          >
            Sotib olish
            <ArrowRight size={12} />
          </Link>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-md hover:bg-white/20 transition-colors"
            aria-label="Yopish"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
