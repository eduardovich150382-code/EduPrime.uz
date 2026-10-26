import { useNow, useTranslations } from 'next-intl';
import { Check, ClipboardList, ListChecks, Timer } from 'lucide-react';
import { formatTashkentDate } from '@/lib/date';
import { GOAL_STYLES, BUNDLE_STYLE, LEGACY_STYLE } from '@/lib/goal-styles';
import { autoFeatures, longerOfferSaving, roundDownCount, sumCounts, type ContentCounts, type PricingProduct } from '@/lib/pricing';
import { goalIcon } from '@/components/subscription/goal-icons';
import { formatAmount, OfferVariant, type Accent, type BuyContext } from './OfferVariant';

export function productAccent(product: Pick<PricingProduct, 'kind' | 'goal'>): Accent {
  if (product.kind === 'BUNDLE') return BUNDLE_STYLE;
  const goal = product.goal && product.goal in GOAL_STYLES ? GOAL_STYLES[product.goal as keyof typeof GOAL_STYLES] : null;
  return goal ? { ...goal, border: goal.color } : LEGACY_STYLE;
}

// Fan kesimidagi yoki butun doiradagi sonlar; ONE/DTM da bitta fan sotilsa
// kartaning o'zida, bir nechta bo'lsa fanlar ro'yxatida chiqadi.
function soldSubjects(product: PricingProduct) {
  return product.subjects.filter((subject) => product.subjectRule !== 'DTM_BLOCK' || !subject.isMandatory);
}

function useStatItems(counts: ContentCounts, locale: string) {
  const t = useTranslations('pricing');
  const questions = roundDownCount(counts.questions);
  return [
    counts.mockTests > 0 && { key: 'mock', Icon: Timer, text: t('statMocks', { count: counts.mockTests }) },
    counts.topicTests > 0 && { key: 'topic', Icon: ClipboardList, text: t('statTopicTests', { count: counts.topicTests }) },
    counts.questions > 0 && { key: 'questions', Icon: ListChecks,
      text: t('statQuestions', { count: questions.value, shown: `${formatAmount(questions.value, locale)}${questions.plus ? '+' : ''}` }) },
  ].filter((item): item is { key: string; Icon: typeof Timer; text: string } => !!item);
}

export function ContentStats({ counts, locale, inverted = false }: { counts: ContentCounts; locale: string; inverted?: boolean }) {
  const items = useStatItems(counts, locale);
  if (!items.length) return null;
  return (
    <ul className={`flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold ${inverted ? 'text-white' : 'text-text-primary'}`}>
      {items.map(({ key, Icon, text }) => (
        <li key={key} className="flex items-center gap-1.5">
          <Icon size={18} aria-hidden className={`shrink-0 ${inverted ? 'text-[#ddd6fe]' : 'text-primary-600'}`} />{text}
        </li>
      ))}
    </ul>
  );
}

function SubjectStats({ name, counts, locale }: { name: string; counts: ContentCounts; locale: string }) {
  const items = useStatItems(counts, locale);
  return (
    <li className="min-w-0 rounded-xl bg-gray-50 px-3 py-2 text-sm">
      <span className="font-semibold text-text-primary wrap-break-word">{name}</span>
      {items.length > 0 && <span className="block text-text-secondary wrap-break-word">{items.map((item) => item.text).join(' · ')}</span>}
    </li>
  );
}

export function FeatureList({ product, counts, inverted = false, accent }: { product: PricingProduct; counts: ContentCounts; inverted?: boolean; accent: Accent }) {
  const t = useTranslations('pricing');
  const items = [...autoFeatures(product, counts).map((key) => t(`auto.${key}`)), ...product.features];
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((item, i) => (
        <li key={`${i}-${item}`} className={`flex min-w-0 items-start gap-2 text-sm ${inverted ? 'text-white' : 'text-text-primary'}`}>
          <span aria-hidden className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full" style={inverted ? { background: '#ffffff', color: '#4c1d95' } : { background: accent.background, color: accent.color }}>
            <Check size={13} strokeWidth={3} />
          </span>
          <span className="min-w-0 wrap-break-word">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function VariantGrid({ product, accent, buy, locale }: { product: PricingProduct; accent: Accent; buy: BuyContext; locale: string }) {
  const t = useTranslations('pricing');
  const now = useNow();
  const saving = longerOfferSaving(product.offers, now);
  if (!product.offers.length) return <p className="text-text-secondary">{t('noOffers')}</p>;
  return (
    <div id={`variants-${product.id}`} className="scroll-mt-24 space-y-3">
      <div className={`grid gap-5 pt-2 ${product.offers.length > 1 ? 'sm:grid-cols-2' : ''}`}>
        {product.offers.map((offer) => (
          <OfferVariant key={offer.id} product={product} offer={offer} accent={accent} buy={buy} locale={locale} now={now}
            saving={saving?.offerId === offer.id ? { percent: saving.percent, label: saving.shorter.label } : null} />
        ))}
      </div>
    </div>
  );
}

export function PaymentFacts({ inverted = false }: { inverted?: boolean }) {
  const t = useTranslations('pricing');
  return <p className={`text-xs ${inverted ? 'text-[#ddd6fe]' : 'text-text-secondary'}`}>{t('paymentFacts')}</p>;
}

function ActiveSubscriptions({ product, locale }: { product: PricingProduct; locale: string }) {
  const t = useTranslations('pricing');
  if (!product.activeSubscriptions.length) return null;
  // Oylik variant qolgan pullik muddatni saqlaydi (resolveStartDate); sanagacha variant esa
  // qat'iy sanada tugaydi — izoh faqat birinchi holatda to'g'ri.
  const monthly = product.offers.some((offer) => offer.durationMonths !== null);
  return (
    <div className="space-y-2 rounded-xl border border-[#86efac] bg-[#f0fdf4] p-3">
      {product.activeSubscriptions.map((s) => (
        <div key={s.id} className="flex min-w-0 flex-wrap items-center justify-between gap-x-3">
          <p className="min-w-0 font-semibold text-[#166534] wrap-break-word">
            {t('activeUntil', { date: formatTashkentDate(s.endDate, locale) })}{s.subjects.length > 0 && ` · ${s.subjects.join(', ')}`}
          </p>
          <a href={`#variants-${product.id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary-700 underline-offset-2 hover:underline">{t('extend')}</a>
        </div>
      ))}
      {monthly && <p className="text-xs text-[#166534]">{t('extendNote')}</p>}
    </div>
  );
}

export function OfferCard({ product, locale, buy }: { product: PricingProduct; locale: string; buy: BuyContext }) {
  const t = useTranslations('pricing');
  const accent = productAccent(product);
  const Icon = goalIcon(product.goal, product.kind === 'BUNDLE');
  const sold = soldSubjects(product);
  const total = product.counts ?? sumCounts(sold.map((s) => s.counts));
  const cardCounts = product.counts ?? (sold.length === 1 ? sold[0].counts : null);
  const mandatory = product.subjectRule === 'DTM_BLOCK' ? product.subjects.filter((s) => s.isMandatory) : [];
  const discount = product.secondSubjectDiscountPct > 0 && product.kind === 'CATEGORY' && product.subjectRule !== 'NONE';
  return (
    <article id={product.kind === 'BUNDLE' ? `bundle-${product.id}` : undefined} className="min-w-0 scroll-mt-24 overflow-hidden rounded-2xl border-2 bg-white shadow-sm" style={{ borderColor: accent.border }}>
      <header className="space-y-3 px-5 py-5 sm:px-6" style={{ background: accent.background }}>
        <div className="flex min-w-0 items-start gap-3">
          <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white shadow-sm" style={{ color: accent.color }}><Icon size={24} /></span>
          <div className="min-w-0">
            <h2 className="wrap-break-word text-xl font-bold text-[#1f2937] sm:text-2xl">{product.name}</h2>
            {product.tagline && <p className="mt-0.5 wrap-break-word text-[#1f2937]">{product.tagline}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold" style={{ color: accent.color }}>{t(product.kind === 'BUNDLE' ? 'rule.BUNDLE' : `rule.${product.subjectRule}`)}</span>
          {discount && <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#166534]">{t('secondSubjectBadge', { percent: product.secondSubjectDiscountPct })}</span>}
        </div>
      </header>
      <div className="space-y-5 p-5 sm:p-6">
        <ActiveSubscriptions product={product} locale={locale} />
        {cardCounts && <ContentStats counts={cardCounts} locale={locale} />}
        {!cardCounts && sold.length > 1 && (
          <div>
            <h3 className="font-semibold text-text-primary">{t('subjects')}</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {sold.map((subject) => <SubjectStats key={subject.id} name={subject.name} counts={subject.counts} locale={locale} />)}
            </ul>
          </div>
        )}
        {mandatory.length > 0 && <p className="text-sm text-text-secondary">{t('mandatorySubjects', { names: mandatory.map((s) => s.name).join(', ') })}</p>}
        {!buy.userId && (product.subjectRule === 'ONE' || product.subjectRule === 'DTM_BLOCK') && product.kind === 'CATEGORY' && <p className="text-sm text-text-secondary">{t('subjectInBot')}</p>}
        <FeatureList product={product} counts={total} accent={accent} />
        <VariantGrid product={product} accent={accent} buy={buy} locale={locale} />
        <PaymentFacts />
      </div>
    </article>
  );
}
