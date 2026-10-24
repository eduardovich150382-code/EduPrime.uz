'use client';

import { useEffect, useState } from 'react';
import type { SubscriptionStatus } from '@/lib/subscription-display';

export function useSubscriptionStatus(enabled = true) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetch('/api/subscription/status', { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error('STATUS_UNAVAILABLE'); return response.json(); })
      .then((data: SubscriptionStatus) => { if (!controller.signal.aborted) setStatus(data); })
      .catch(() => {});
    return () => controller.abort();
  }, [enabled]);
  return enabled ? status : null;
}
