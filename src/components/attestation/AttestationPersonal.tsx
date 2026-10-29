'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ListChecks, Play, RotateCcw } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useViewer, type ViewerView } from '@/lib/use-viewer';
import { usePersonalData } from '@/lib/use-personal-data';
import type { AttestationPersonalData } from '@/lib/attestation-page';
import { HintSwitch } from '@/components/ui/ViewerGate';
import { PersonalRefreshContext } from '@/components/pricing/personal-refresh';
import { AttestationActiveSubscription, AttestationOffer } from './AttestationOffer';
import { TestRowList } from './TestRowList';
import { GuestPanel, ReadinessPanel, ReadinessSkeleton } from './ReadinessPanel';

// /attestation statik (ISR): server mehmon ko'rinishini (`guest`) chizadi,
// kirgan foydalanuvchiniki `/api/attestation/me` dan shu yerda keladi.
// Har slot uch holatda: `unknown` (SSR/hydration — mehmon varianti va
// skeleton, CSS ishorasi tanlaydi), mehmon, kirgan (yuklanguncha skeleton).

interface Ctx {
  locale: string;
  guest: AttestationPersonalData;
  viewer: ViewerView;
  /** Kirgan foydalanuvchining ma'lumoti; yuklanmoqda — `null`. So'rov yiqilsa mehmon ma'lumoti. */
  mine: AttestationPersonalData | null;
}

const AttestationCtx = createContext<Ctx | null>(null);

function useAttestation(): Ctx {
  const ctx = useContext(AttestationCtx);
  if (!ctx) throw new Error('AttestationPersonalProvider yo‘q');
  return ctx;
}

export function AttestationPersonalProvider({ locale, guest, children }: {
  locale: string; guest: AttestationPersonalData; children: ReactNode;
}) {
  const viewer = useViewer();
  const me = usePersonalData<AttestationPersonalData>(`/api/attestation/me?locale=${encodeURIComponent(locale)}`);
  const mine = me.data ?? (me.failed ? guest : null);
  return (
    <AttestationCtx.Provider value={{ locale, guest, viewer, mine }}>
      <PersonalRefreshContext.Provider value={me.reload}>{children}</PersonalRefreshContext.Provider>
    </AttestationCtx.Provider>
  );
}

/** Slot uchun: `unknown` da ikkala variant, mehmonda mehmon, kirganda ma'lumot yoki skeleton. */
function Slot({ render, skeleton }: { render: (data: AttestationPersonalData) => ReactNode; skeleton: ReactNode }) {
  const { guest, viewer, mine } = useAttestation();
  if (viewer === 'unknown') return <HintSwitch guest={render(guest)} authed={skeleton} />;
  if (viewer === 'guest') return <>{render(guest)}</>;
  return <>{mine ? render(mine) : skeleton}</>;
}

const ctaSkeleton = <div aria-hidden className="h-11 w-full animate-pulse rounded-xl bg-white/20 sm:w-48" />;

function HeroCta({ data }: { data: AttestationPersonalData }) {
  const t = useTranslations('attestation');
  const { hero } = data;
  if (!hero) return null;
  // "№N" faqat mock uchun — mavzu testlarida tartib raqami ko'rsatilmaydi.
  const label = hero.kind === 'mockNext' ? t('hero.ctaNext', { number: hero.number ?? 0 })
    : hero.kind === 'mockRetake' ? t('hero.ctaRetake', { number: hero.number ?? 0 })
    : hero.kind === 'topicStart' ? t('hero.ctaTopicStart')
    : t('hero.ctaRetakeLowest');
  return (
    <Link
      href={hero.href}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#fbbf24] px-5 text-sm font-semibold text-[#451a03] transition-colors hover:bg-[#f59e0b]"
    >
      {hero.kind === 'mockRetake' || hero.kind === 'topicRetake' ? <RotateCcw size={16} aria-hidden /> : <Play size={16} aria-hidden />}
      {label}
    </Link>
  );
}

export function HeroActions() {
  const t = useTranslations('attestation');
  return (
    <>
      <Slot render={(data) => <HeroCta data={data} />} skeleton={ctaSkeleton} />
      <a
        href="#tuzilma"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/30 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
      >
        <ListChecks size={16} aria-hidden />
        {t('hero.ctaStructure')}
      </a>
      {/* Obunachida yakor yo'q; kirgan foydalanuvchida obuna holati kelgach chiqadi. */}
      <Slot
        render={(data) => data.view.showOffer && (
          <a href="#obuna" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/30 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10">
            {t('hero.ctaOffers')}
          </a>
        )}
        skeleton={null}
      />
    </>
  );
}

// Obuna kartasi bo'yi — kirgan foydalanuvchida karta kelguncha joy band.
const offerSkeleton = <div aria-hidden className="h-72 animate-pulse rounded-2xl border border-gray-200 bg-white" />;

function OfferBlock({ data }: { data: AttestationPersonalData }) {
  const { locale } = useAttestation();
  const { product, owned, showOffer, buy } = data.view;
  if (!showOffer && !owned) return null;
  return (
    <section id="obuna" className="scroll-mt-24">
      {owned ? (
        <AttestationActiveSubscription subscription={owned.subscription} uncoveredSubjects={owned.uncoveredSubjects}
          discountPct={product?.secondSubjectDiscountPct ?? 0} />
      ) : product && <AttestationOffer product={product} buy={buy} locale={locale} />}
    </section>
  );
}

export function OfferSlot() {
  return <Slot render={(data) => <OfferBlock data={data} />} skeleton={offerSkeleton} />;
}

export function RowsSlot({ kind, title, emptyText, footnote }: {
  kind: 'mock' | 'topic'; title: string; emptyText: string; footnote?: string;
}) {
  const { guest, viewer, mine } = useAttestation();
  // Qatorlar to'plami hamma uchun bir xil (keshlangan katalog) — kirganda
  // faqat holat va tugma almashadi, ro'yxat bo'yi sakramaydi.
  const data = viewer === 'authed' && mine ? mine : guest;
  const rows = kind === 'mock' ? data.mockRows : data.topicRows;
  if (kind === 'topic' && rows.length === 0) return null;
  const pending = viewer === 'unknown' ? 'hint' : viewer === 'authed' && !mine;
  const lockedHref = data.view.showOffer ? '#obuna' : undefined;
  const list = <TestRowList title={title} rows={rows} emptyText={emptyText} lockedHref={lockedHref} pending={pending} />;
  if (!footnote || rows.length === 0) return list;
  return (
    <div className="space-y-3">
      {list}
      <p className="text-sm text-text-secondary">{footnote}</p>
    </div>
  );
}

export function SidePanelSlot({ loginHref }: { loginHref: string }) {
  return (
    <Slot
      render={(data) => data.readiness ? <ReadinessPanel readiness={data.readiness} /> : <GuestPanel loginHref={loginHref} />}
      skeleton={<ReadinessSkeleton />}
    />
  );
}
