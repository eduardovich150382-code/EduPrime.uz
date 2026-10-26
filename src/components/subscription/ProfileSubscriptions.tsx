'use client';

import { useTranslations } from 'next-intl';
import { Ticket } from 'lucide-react';
import { useSubscriptionStatus } from '@/components/ui/useSubscriptionStatus';
import ActiveSubscriptionCard from './ActiveSubscriptionCard';

// Profildagi "Faol obunalar" — obuna bo'lmasa blok umuman chiqmaydi
// (taklif header va sahifa ichidagi CTA'da bor).
export default function ProfileSubscriptions() {
  const t = useTranslations('subscriptionUi');
  const status = useSubscriptionStatus();
  if (!status?.subscriptions.length) return null;
  return (
    <section className="card-elevated p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
        <Ticket size={20} aria-hidden className="text-primary-600" />
        {t('active')}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {status.subscriptions.map((s) => <ActiveSubscriptionCard key={s.id} subscription={s} />)}
      </div>
    </section>
  );
}
