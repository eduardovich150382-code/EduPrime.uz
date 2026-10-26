'use client';

import { useLocale, useNow, useTranslations } from 'next-intl';
import { Archive, Award, FileCheck, Globe, GraduationCap, Landmark, Layers, School, type LucideIcon } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { daysLeft, formatTashkentDate } from '@/lib/date';
import { EXPIRY_PILL_STYLES, expiryState, subscriptionStyle } from '@/lib/goal-styles';
import { localizedName } from '@/lib/pricing';
import { subscriptionDisplayName, subscriptionPricingHref, type SubscriptionView } from '@/lib/subscription-display';

const GOAL_ICONS: Record<string, LucideIcon> = {
  ATTESTATION: Award, CERTIFICATE: FileCheck, DTM: GraduationCap, SCHOOL: School,
  PRESIDENT_SCHOOL: Landmark, SAT: Globe, GRE: Globe,
};

function subscriptionIcon(s: SubscriptionView): LucideIcon {
  if (s.isLegacy) return Archive;
  if (s.plan === 'BUNDLE') return Layers;
  return (s.goal && GOAL_ICONS[s.goal]) || Layers;
}

// Fanlar ro'yxati; eski tarifda fan yo'q — "Barcha fanlar" deyilsa attestatsiya
// ham kiradigandek ko'rinardi, shuning uchun bo'sh qoladi.
export function subscriptionSubjects(s: SubscriptionView, locale: string, allSubjects: string): string | null {
  if (s.subjects.length) return s.subjects.map((subject) => localizedName(subject, locale)).join(', ');
  return s.isLegacy ? null : allSubjects;
}

// Muddat holati rang bilan birga so'z bilan ham aytiladi ("3 kun qoldi").
function useExpiry(s: SubscriptionView) {
  const t = useTranslations('subscriptionUi');
  const days = daysLeft(s.endDate, useNow());
  const state = expiryState(days);
  const label = days < 0 ? t('expiredLabel') : days === 0 ? t('endsToday') : t('daysLeftLong', { count: days });
  return { days, state, label };
}

export default function ActiveSubscriptionCard({ subscription: s, variant = 'full' }: {
  subscription: SubscriptionView; variant?: 'full' | 'compact';
}) {
  const locale = useLocale();
  const t = useTranslations('subscriptionUi');
  const now = useNow();
  const { days, state, label } = useExpiry(s);
  const style = subscriptionStyle(s);
  const category = subscriptionDisplayName(s, locale);
  const subjects = subscriptionSubjects(s, locale, t('allSubjects'));
  const until = t('until', { date: formatTashkentDate(s.endDate, locale) });
  const href = subscriptionPricingHref(s);

  if (variant === 'compact') {
    const daysText = days < 0 ? t('expiredLabel') : t('daysShort', { count: Math.max(days, 0) });
    return (
      <li className="flex min-w-0 items-center gap-2 py-1">
        <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: style.border }} />
        <p className="min-w-0 flex-1 text-sm text-text-primary whitespace-normal break-words [overflow-wrap:anywhere]">
          <span className="font-semibold" style={{ color: style.color }}>{category}</span>
          {subjects && ` · ${subjects}`}{' — '}
          {/* "11-noyabrgacha" defisda bo'linib ketmasin. */}
          <span className={`whitespace-nowrap ${state === 'urgent' || state === 'expired' ? 'font-semibold' : ''}`}
            style={state === 'urgent' || state === 'expired' ? { color: EXPIRY_PILL_STYLES[state].color } : undefined}>
            {days < 0 ? `${until} (${daysText})` : t('untilDays', { date: formatTashkentDate(s.endDate, locale), days: daysText })}
          </span>
        </p>
        <Link href={href} className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-2 text-sm font-semibold text-primary-700 hover:bg-primary-50">
          {days < 0 ? t('retake') : t('renew')}
        </Link>
      </li>
    );
  }

  const Icon = subscriptionIcon(s);
  const start = new Date(s.startDate).getTime();
  const end = new Date(s.endDate).getTime();
  // Qolgan muddat ulushi (butun foiz); startDate noto'g'ri bo'lsa chiziq yo'q.
  // Butun songa yaxlitlanadi — server va brauzer soati millisekundlarda farq
  // qiladi, kasr kenglik hydration nomuvofiqligini berardi.
  const remaining = end > start ? Math.round(Math.min(Math.max((end - now.getTime()) / (end - start), 0), 1) * 100) : null;
  const action = state === 'urgent' ? t('renew') : state === 'expired' ? t('retake') : null;

  return (
    <article className="min-w-0 rounded-2xl border-2 p-4 shadow-sm" style={{ borderColor: style.border, background: style.background }}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-bold" style={{ color: style.color }}>
            <Icon size={16} aria-hidden className="shrink-0" />
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{category}</span>
          </p>
          {subjects && <p className="mt-1 text-lg font-bold leading-snug text-text-primary break-words [overflow-wrap:anywhere]">{subjects}</p>}
          <p className="mt-0.5 text-sm text-[#4b5563]">{until}</p>
        </div>
        <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold" style={EXPIRY_PILL_STYLES[state]}>{label}</span>
      </div>
      {remaining !== null && (
        <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={remaining}
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/80">
          <div className="h-full rounded-full" style={{ width: `${remaining}%`, background: style.border }} />
        </div>
      )}
      {action && (
        <Link href={href} className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 sm:w-auto">
          {action}
        </Link>
      )}
    </article>
  );
}
