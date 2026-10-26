import { useTranslations } from 'next-intl';
import { Layers } from 'lucide-react';
import { sumCounts, type PricingProduct } from '@/lib/pricing';
import { ContentStats, FeatureList, PaymentFacts, productAccent, VariantGrid } from './OfferCard';
import { formatAmount, type BuyContext } from './OfferVariant';

/**
 * "Hammasi" paketi — sahifa pastidagi keng langar karta. Boshqa kartalardan
 * ataylab ajralib turadi (docs/design/testlar-ui.md dagi gradient istisnosi):
 * to'q binafsha fonda oq matn, variantlar esa oq plitkalarda.
 */
export function BundleAnchorCard({ product, locale, buy, savings }: {
  product: PricingProduct; locale: string; buy: BuyContext; savings: { separate: number; bundle: number } | null;
}) {
  const t = useTranslations('pricing');
  const counts = product.counts ?? sumCounts([]);
  const price = (amount: number) => t('price', { amount: formatAmount(amount, locale) });
  return (
    <article id={`bundle-${product.id}`} className="min-w-0 scroll-mt-24 overflow-hidden rounded-3xl bg-gradient-to-br from-[#2e1065] via-[#4c1d95] to-[#6d28d9] p-5 text-white shadow-lg sm:p-8">
      <div className="space-y-5">
        <div className="flex min-w-0 items-start gap-3">
          <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/15"><Layers size={24} /></span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-[#ddd6fe]">{t('rule.BUNDLE')}</p>
            <h2 className="wrap-break-word text-2xl font-bold sm:text-3xl">{product.name}</h2>
            {product.tagline && <p className="mt-1 wrap-break-word text-[#ddd6fe]">{product.tagline}</p>}
          </div>
        </div>
        {savings && (
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-2xl bg-white/10 px-4 py-3 text-sm sm:text-base">
            <span className="text-[#ddd6fe]">{t('bundleSeparate')}</span>
            <s className="font-semibold text-[#ddd6fe]">{price(savings.separate)}</s>
            <span aria-hidden>→</span>
            <span className="text-[#ddd6fe]">{t('bundleTogether')}</span>
            <strong className="text-lg text-[#fbbf24]">{price(savings.bundle)}</strong>
          </p>
        )}
        <ContentStats counts={counts} locale={locale} inverted />
        <FeatureList product={product} counts={counts} accent={productAccent(product)} inverted />
        <VariantGrid product={product} accent={productAccent(product)} buy={buy} locale={locale} />
        <PaymentFacts inverted />
      </div>
    </article>
  );
}
