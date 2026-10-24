'use client';

import { useEffect, useState } from 'react';
import { SubscriptionExpiry } from './SubscriptionBanners';
import { useSubscriptionStatus } from './useSubscriptionStatus';

export default function SubscriptionExpiryBanner() {
  const status = useSubscriptionStatus();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const subscription = status?.expiringSubscription ?? null;
  // Bitta obunani yopish boshqa mahsulotning eslatmasini yashirmaydi.
  const key = subscription ? `sub_expiry_banner:${subscription.id}:${subscription.endDate}` : null;
  useEffect(() => { if (key && sessionStorage.getItem(key)) setDismissed(key); }, [key]);
  if (!key || dismissed === key) return null;
  return <SubscriptionExpiry subscription={subscription} close={() => {
    sessionStorage.setItem(key, 'true'); setDismissed(key);
  }} />;
}
