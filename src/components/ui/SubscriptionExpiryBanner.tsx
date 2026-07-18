'use client';

import { useState, useEffect } from 'react';
import { Clock, X, ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/routing';

/**
 * Obuna muddati tugayotganda ko'rsatiladigan ogohlantirish banner.
 * 7 kun ichida tugaydigan obunalar uchun ko'rsatiladi.
 */
export default function SubscriptionExpiryBanner() {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [planName, setPlanName] = useState<string>('');
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem('sub_expiry_banner_dismissed');
    if (wasDismissed === 'true') return;

    fetch('/api/subscription/status')
      .then(r => r.json())
      .then(data => {
        if (data.plan !== 'FREE' && data.daysUntilExpiry !== null && data.daysUntilExpiry <= 7) {
          setDaysLeft(data.daysUntilExpiry);
          setPlanName(
            data.plan === 'PREMIUM' ? 'Premium' :
            data.plan === 'TEACHER_PLAN' ? 'Ustoz' : 'Premium+Ustoz'
          );
          setDismissed(false);
        }
      })
      .catch(() => {});
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('sub_expiry_banner_dismissed', 'true');
  };

  if (dismissed || daysLeft === null) return null;

  const urgency = daysLeft <= 1 ? 'from-red-500 to-red-600' :
                  daysLeft <= 3 ? 'from-orange-500 to-orange-600' :
                  'from-yellow-500 to-yellow-600';

  return (
    <div className={`fixed top-16 left-0 right-0 w-full bg-gradient-to-r ${urgency} text-white z-39`}>
      <div className="md:ml-64 px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Clock size={16} className="flex-shrink-0" />
          <p className="text-xs sm:text-sm font-medium">
            {planName} obunangiz {daysLeft <= 0 ? 'bugun' : `${daysLeft} kunda`} tugaydi!
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/pricing"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors"
          >
            Uzaytirish
            <ArrowRight size={12} />
          </Link>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-md hover:bg-white/20 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
