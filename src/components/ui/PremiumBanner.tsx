'use client';

import { useEffect, useState } from 'react';
import { SubscriptionOffer } from './SubscriptionBanners';
import { useSubscriptionStatus } from './useSubscriptionStatus';

export default function PremiumBanner({ userPlan }: { userPlan?: string }) {
  const status = useSubscriptionStatus(userPlan !== 'ADMIN');
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => { setDismissed(sessionStorage.getItem('premium_banner_dismissed') === 'true'); }, []);
  if (dismissed || userPlan === 'ADMIN') return null;
  return <SubscriptionOffer status={status} close={() => {
    sessionStorage.setItem('premium_banner_dismissed', 'true'); setDismissed(true);
  }} />;
}
