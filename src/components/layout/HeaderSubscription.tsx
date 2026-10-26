'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useNow, useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { Link, usePathname } from '@/i18n/routing';
import { daysLeft } from '@/lib/date';
import { subscriptionStyle } from '@/lib/goal-styles';
import { isAttestationPath } from '@/lib/nav-links';
import { subscriptionDisplayName } from '@/lib/subscription-display';
import { useSubscriptionStatus } from '@/components/ui/useSubscriptionStatus';
import { SubscribeButton } from '@/components/ui/SubscribeCTA';
import ActiveSubscriptionCard, { subscriptionSubjects } from '@/components/subscription/ActiveSubscriptionCard';

// Header'dagi obuna joyi: obunasizga "Obuna olish", obunachiga eng yaqin
// tugaydigan obuna belgisi ("Fizika · 16 kun") va bosilganda ro'yxat.
// Holat /api/subscription/status dan — bu yerda kirish huquqi hisoblanmaydi.
export default function HeaderSubscription({ compact = false }: { compact?: boolean }) {
  const { data: session, status: authStatus } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const isLoggedIn = authStatus === 'authenticated';
  const status = useSubscriptionStatus(isLoggedIn && !isAdmin);
  const pathname = usePathname();
  const href = isAttestationPath(pathname) ? '/pricing?goal=ATTESTATION' : '/pricing';

  // Sessiya yoki holat yuklanayotganda hech narsa — obunachiga bir lahza
  // "Obuna olish" chaqnab ketmasin.
  if (authStatus === 'loading' || isAdmin) return null;
  if (!isLoggedIn) return <SubscribeButton href={href} compact={compact} />;
  if (!status) return null;
  if (status.subscriptions.length) return <SubscriptionBadge subscriptions={status.subscriptions} compact={compact} />;
  // Admin bergan ruxsat (UserPermission) obuna emas, lekin kirish beradi —
  // bunday foydalanuvchiga taklif ham, belgi ham ko'rsatilmaydi.
  return status.hasAnyScope ? null : <SubscribeButton href={href} compact={compact} />;
}

function SubscriptionBadge({ subscriptions, compact }: {
  subscriptions: NonNullable<ReturnType<typeof useSubscriptionStatus>>['subscriptions']; compact: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations('subscriptionUi');
  const now = useNow();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('mousedown', onMouseDown); document.removeEventListener('keydown', onKeyDown); };
  }, [open]);

  // API obunalarni endDate bo'yicha saralab beradi — birinchisi eng yaqin tugaydigani.
  const first = subscriptions[0];
  const days = Math.max(daysLeft(first.endDate, now), 0);
  const name = subscriptionSubjects(first, locale, '') || subscriptionDisplayName(first, locale);
  const daysText = t('daysShort', { count: days });
  const urgent = days <= 3;
  const more = subscriptions.length - 1;

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${t('active')}: ${name} · ${daysText}${more ? ` ${t('badgeMore', { count: more })}` : ''}`}
        className={`flex min-h-11 max-w-full min-w-0 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-colors sm:text-sm ${
          urgent ? 'border-[#fdba74] bg-[#ffedd5] text-[#9a3412]' : 'border-gray-200 bg-white text-text-primary hover:bg-primary-50'
        }`}
      >
        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: subscriptionStyle(first).border }} />
        {compact ? (
          // 360px'da bitta qatorga faqat "Fi…" sig'ardi — mobilda ikki qator:
          // fan nomi ustida, kun soni ostida.
          <span className="flex min-w-0 flex-col items-start leading-tight">
            <span className="max-w-[5.5rem] truncate text-[11px] font-medium">{name}</span>
            <span className="whitespace-nowrap">{daysText}{more > 0 && <span className="ml-1 text-text-secondary">{t('badgeMore', { count: more })}</span>}</span>
          </span>
        ) : (
          <>
            <span className="min-w-0 max-w-[10rem] truncate">{name}</span>
            <span className="shrink-0 whitespace-nowrap">· {daysText}</span>
            {more > 0 && <span className="shrink-0 rounded-full bg-gray-100 px-1.5 text-[11px] text-text-secondary">{t('badgeMore', { count: more })}</span>}
          </>
        )}
      </button>
      {open && (
        // Mobilda belgi o'ngga yaqin turadi — absolute popover chap chetdan
        // chiqib ketardi, shuning uchun ekran kengligida fixed.
        <div role="dialog" aria-label={t('active')}
          className="fixed left-4 right-4 top-16 z-50 rounded-2xl border border-gray-200 bg-white p-3 shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
          <p className="px-1 text-sm font-semibold text-text-primary">{t('active')}</p>
          <ul className="mt-1 max-h-[60vh] divide-y divide-gray-100 overflow-y-auto">
            {subscriptions.map((s) => <ActiveSubscriptionCard key={s.id} subscription={s} variant="compact" />)}
          </ul>
          <Link href="/pricing" className="mt-1 flex min-h-11 items-center justify-center rounded-xl text-sm font-semibold text-primary-700 hover:bg-primary-50">
            {t('allSubscriptions')}
          </Link>
        </div>
      )}
    </div>
  );
}
