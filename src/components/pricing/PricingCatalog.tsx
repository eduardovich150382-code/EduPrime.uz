import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { GOAL_STYLES } from '@/lib/goal-styles';
import { bundleSavings, selectPricingProduct, type PricingProduct } from '@/lib/pricing';
import type { SubscriptionView } from '@/lib/subscription-display';
import ActiveSubscriptionCard from '@/components/subscription/ActiveSubscriptionCard';
import { loginHref, localizedPath } from '@/lib/safe-return-path';
import { OfferCard } from './OfferCard';
import { BundleAnchorCard } from './BundleAnchorCard';
import { PricingFaq } from './PricingFaq';
import type { BuyContext } from './OfferVariant';

const card = 'min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6';

export function PricingCatalog({ products, subscriptions, goal, locale, returnUrl, userId = null }: {
  products: PricingProduct[]; subscriptions: SubscriptionView[]; goal?: string; locale: string; returnUrl?: string; userId?: string | null;
}) {
  const t = useTranslations('pricing');
  const categories = products.filter((product) => product.kind === 'CATEGORY');
  const bundles = products.filter((product) => product.kind === 'BUNDLE');
  const selected = selectPricingProduct(products, goal);
  const buy: BuyContext = {
    userId, knownSubscriptionIds: subscriptions.map((subscription) => subscription.id),
    loginHref: loginHref(localizedPath(selected?.goal ? `/pricing?goal=${encodeURIComponent(selected.goal)}` : '/pricing', locale)),
  };
  return (
    <div className="space-y-8">
      {subscriptions.length > 0 && (
        <section className={card}>
          <h2 className="font-semibold text-text-primary">{t('activeSubscriptions')}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {subscriptions.map((subscription) => <ActiveSubscriptionCard key={subscription.id} subscription={subscription} />)}
          </div>
        </section>
      )}
      {products.length === 0 && <div className={`${card} py-10 text-center`}><h2 className="text-xl font-semibold">{t('empty')}</h2><p className="mt-3 text-text-secondary">{t('emptyBody')}</p></div>}
      {categories.length > 1 && (
        <nav aria-label={t('chooseGoal')} className="flex flex-wrap gap-2">
          {categories.map((product) => <Link key={product.id} href={{ pathname: '/pricing', query: { goal: product.goal ?? '', ...(returnUrl ? { returnUrl } : {}) } }}
            aria-current={selected?.id === product.id ? 'page' : undefined}
            style={product.goal ? GOAL_STYLES[product.goal] : undefined}
            className={`inline-flex min-h-11 max-w-full items-center rounded-full px-4 py-2 text-sm font-semibold wrap-break-word ${selected?.id === product.id ? 'ring-2 ring-primary-600 ring-offset-2' : ''}`}>
            {product.name}
          </Link>)}
        </nav>
      )}
      {selected && <OfferCard product={selected} locale={locale} buy={buy} />}
      {bundles.map((product) => <BundleAnchorCard key={product.id} product={product} locale={locale} buy={buy} savings={bundleSavings(product, products)} />)}
      {products.length > 0 && <PricingFaq />}
    </div>
  );
}
