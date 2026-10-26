import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { formatTashkentDate } from '@/lib/date';
import { dailyPrice, monthlyPrice, offerDays, type PricingOffer, type PricingProduct } from '@/lib/pricing';
import { requiredSubjectCount } from '@/lib/product-offers';
import { BuyOfferButton } from './BuyOfferButton';
import { BUY_BUTTON_STYLES } from './buy-button-styles';
import { PromoPrice } from './PromoPrice';

export interface BuyContext { userId: string | null; loginHref: string; knownSubscriptionIds: string[] }
export interface Accent { color: string; background: string; border: string }

export function formatAmount(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(amount);
}

export function OfferVariant({ product, offer, accent, buy, locale, now, saving, recommended }: {
  product: PricingProduct; offer: PricingOffer; accent: Accent; buy: BuyContext; locale: string; now: Date;
  saving: { percent: number; label: string } | null; recommended?: { active: boolean; label: string };
}) {
  const t = useTranslations('pricing');
  const needed = requiredSubjectCount(product);
  const choices = needed === 0 ? [] : product.subjects.filter((subject) => product.subjectRule !== 'DTM_BLOCK' || !subject.isMandatory);
  const featured = recommended ? recommended.active : offer.isFeatured;
  const shown = offer.personalPrice ?? offer.price;
  // Oylik/kunlik narx ko'rsatilgan (shaxsiy chegirmali) narxdan.
  const perMonth = monthlyPrice({ ...offer, price: shown });
  const perDay = dailyPrice({ ...offer, price: shown }, now);
  const days = offer.untilDate ? offerDays(offer, now) : null;
  const personalPct = offer.personalPrice !== null ? product.secondSubjectDiscountPct : null;
  const variant = featured ? 'solid' : 'outline';
  const period = offer.untilDate
    ? t('untilDays', { date: formatTashkentDate(offer.untilDate, locale), days: days ?? 0 })
    : t('months', { count: offer.durationMonths ?? 0 });
  return (
    <div className={`relative flex min-w-0 flex-col gap-3 rounded-2xl bg-white p-4 sm:p-5 ${featured ? 'border-2 shadow-md motion-safe:transition-transform sm:scale-[1.02]' : 'border border-gray-200'}`}
      style={featured ? { borderColor: accent.color } : undefined}>
      {featured && (
        <span className="absolute -top-3 left-4 max-w-[calc(100%-2rem)] truncate rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: accent.color }}>
          {offer.badge ?? recommended?.label ?? t('featuredRibbon')}
        </span>
      )}
      <div className={`flex min-w-0 flex-wrap items-center gap-2 ${featured ? 'pt-1' : ''}`}>
        <h3 className="min-w-0 wrap-break-word font-semibold text-text-primary">{offer.label}</h3>
        {!featured && offer.badge && <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ color: accent.color, background: accent.background }}>{offer.badge}</span>}
      </div>
      {/* Admin variantni ko'pincha "1 oy" deb nomlaydi — muddat nom bilan bir xil bo'lsa takrorlanmaydi. */}
      {period !== offer.label && <p className="text-sm text-text-secondary">{period}</p>}
      <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
        <span className="wrap-break-word text-3xl font-extrabold tabular-nums tracking-tight text-text-primary sm:text-4xl">{formatAmount(shown, locale)}</span>
        <span className="text-base font-semibold text-text-secondary">{t('currency')}</span>
      </p>
      {personalPct !== null ? (
        <div className="space-y-1">
          <p className="flex flex-wrap items-center gap-2">
            <s className="text-sm text-text-secondary">{t('price', { amount: formatAmount(offer.price, locale) })}</s>
            <span className="rounded-full bg-[#dcfce7] px-2 py-0.5 text-xs font-bold text-[#166534]">{t('personalBadge', { percent: personalPct })}</span>
          </p>
          <p className="text-xs text-text-secondary">{t('personalNote', { price: t('price', { amount: formatAmount(offer.price, locale) }) })}</p>
        </div>
      ) : (
        <PromoPrice price={offer.price} compareAtPrice={offer.compareAtPrice} promoUntil={offer.promoUntil} locale={locale} />
      )}
      {(perMonth !== null || perDay !== null) && (
        <p className="text-sm text-text-secondary">
          {perMonth !== null ? t('perMonth', { amount: formatAmount(perMonth, locale) }) : t('perDay', { amount: formatAmount(perDay!, locale) })}
        </p>
      )}
      {saving && <p className="w-fit rounded-full bg-[#dcfce7] px-2.5 py-1 text-xs font-semibold text-[#166534]">{t('cheaperThan', saving)}</p>}
      {/* Mehmon avval kiradi: to'lov sayt akkauntiga yozilishi uchun niyat faqat kirgan foydalanuvchiga yaratiladi. */}
      <div className="mt-auto pt-1">
        {buy.userId ? (
          <BuyOfferButton userId={buy.userId} productId={product.id} offerId={offer.id} needed={needed} variant={variant}
            choices={choices.map(({ id, name }) => ({ id, name }))} knownSubscriptionIds={buy.knownSubscriptionIds} />
        ) : (
          <Link href={buy.loginHref} className={`inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 py-3 text-center font-semibold ${BUY_BUTTON_STYLES[variant]}`}>
            {t('buy')}
          </Link>
        )}
      </div>
    </div>
  );
}
