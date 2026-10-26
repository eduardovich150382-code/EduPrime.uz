import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { GOAL_STYLES } from '@/lib/goal-styles';
import { formatPricingDate, selectPricingProduct, type PricingProduct } from '@/lib/pricing';
import type { SubscriptionView } from '@/lib/subscription-display';
import ActiveSubscriptionCard from '@/components/subscription/ActiveSubscriptionCard';
import { BuyOfferButton } from './BuyOfferButton';
import { loginHref, localizedPath } from '@/lib/safe-return-path';
import { requiredSubjectCount } from '@/lib/product-offers';

const card = 'min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6';

interface BuyContext { userId: string | null; loginHref: string; knownSubscriptionIds: string[] }

export function PricingProductCard({ product, locale, buy }: { product: PricingProduct; locale: string; buy: BuyContext }) {
  const t = useTranslations('pricing');
  const needed = requiredSubjectCount(product);
  const choices = needed === 0 ? [] : product.subjects.filter((subject) => product.subjectRule !== 'DTM_BLOCK' || !subject.isMandatory);
  return (
    <article id={product.kind === 'BUNDLE' ? `bundle-${product.id}` : undefined} className={`${card} scroll-mt-24 space-y-5`}>
      <div className="space-y-2">
        <h2 className="wrap-break-word text-xl font-bold text-text-primary">{product.name}</h2>
        <p className="text-text-secondary">{t(product.kind === 'BUNDLE' ? 'scope.BUNDLE' : `scope.${product.subjectRule}`)}</p>
      </div>
      {product.subjects.length > 0 && (
        <div>
          <h3 className="font-semibold text-text-primary">{t('subjects')}</h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {product.subjects.map((subject) => (
              <li key={subject.id} className="flex min-w-0 items-baseline justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2 text-sm">
                <span className="min-w-0 wrap-break-word">{subject.name}</span>
                <span className="shrink-0 text-text-secondary">{t('testCount', { count: subject.testCount })}</span>
              </li>
            ))}
          </ul>
          {!buy.userId && (product.subjectRule === 'ONE' || product.subjectRule === 'DTM_BLOCK') && <p className="mt-3 text-sm text-text-secondary">{t('subjectInBot')}</p>}
        </div>
      )}
      {product.secondSubjectDiscountPct > 0 && <p className="text-sm font-semibold text-primary-700">{t('secondSubjectDiscount', { percent: product.secondSubjectDiscountPct })}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {product.offers.map((offer) => (
          <div key={offer.id} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-gray-200 p-4">
            <h3 className="wrap-break-word font-semibold text-text-primary">{offer.label}</h3>
            <p className="text-sm text-text-secondary">{offer.untilDate ? t('untilDate', { date: formatPricingDate(offer.untilDate, locale) }) : t('months', { count: offer.durationMonths ?? 0 })}</p>
            <p className="wrap-break-word text-2xl font-bold text-text-primary">{t('price', { amount: new Intl.NumberFormat(locale).format(offer.price) })}</p>
            {/* Mehmon avval kiradi: to'lov sayt akkauntiga yozilishi uchun niyat faqat kirgan foydalanuvchiga yaratiladi. */}
            {buy.userId ? (
              <BuyOfferButton userId={buy.userId} productId={product.id} offerId={offer.id} needed={needed}
                choices={choices.map(({ id, name }) => ({ id, name }))} knownSubscriptionIds={buy.knownSubscriptionIds} />
            ) : (
              <Link href={buy.loginHref} className="mt-auto inline-flex min-h-11 items-center justify-center rounded-xl bg-primary-600 px-4 py-3 text-center font-semibold text-white hover:bg-primary-700">
                {t('buy')}
              </Link>
            )}
          </div>
        ))}
      </div>
      {product.offers.length === 0 && <p className="text-text-secondary">{t('noOffers')}</p>}
    </article>
  );
}

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
    <div className="space-y-6">
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
      {selected && <PricingProductCard product={selected} locale={locale} buy={buy} />}
      {bundles.map((product) => <PricingProductCard key={product.id} product={product} locale={locale} buy={buy} />)}
      {products.length > 0 && <p className="text-sm text-text-secondary">{t('paymentNote')}</p>}
    </div>
  );
}
