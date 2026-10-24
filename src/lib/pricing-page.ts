import 'server-only';
import { db } from './db';
import { loadUserEntitlements } from './access';
import { checkoutStartParameter } from './category-checkout';
import { localizedName, type PricingProduct, type PricingSubscription } from './pricing';

export async function loadPricingPage(userId: string | null, locale: string, now = new Date()): Promise<{
  products: PricingProduct[]; subscriptions: PricingSubscription[];
}> {
  const [products, entitlements] = await Promise.all([
    db.product.findMany({
      where: { isOnSale: true }, orderBy: [{ order: 'asc' }, { id: 'asc' }],
      include: {
        offers: { where: { isActive: true, OR: [{ untilDate: null }, { untilDate: { gt: now } }] }, orderBy: [{ order: 'asc' }, { id: 'asc' }] },
        category: { include: { subjects: {
          where: { tests: { some: { isPublished: true } } }, orderBy: [{ order: 'asc' }, { id: 'asc' }],
          include: { _count: { select: { tests: { where: { isPublished: true } } } } },
        } } },
      },
    }),
    userId ? loadUserEntitlements(userId, now, 'pricing') : null,
  ]);
  return {
    products: products.map((product) => ({
      id: product.id, kind: product.kind, goal: product.category?.type ?? null,
      name: localizedName(product, locale), subjectRule: product.subjectRule, secondSubjectDiscountPct: product.secondSubjectDiscountPct,
      subjects: (product.category?.subjects ?? []).map((subject) => ({ id: subject.id, name: localizedName(subject, locale), testCount: subject._count.tests })),
      offers: product.offers.map((offer) => ({
        id: offer.id, label: offer[locale === 'ru' ? 'labelRu' : locale === 'en' ? 'labelEn' : 'labelUz'], price: offer.price,
        durationMonths: offer.durationMonths, untilDate: offer.untilDate?.toISOString() ?? null,
        buyHref: `https://t.me/EduPrimeuzbot?start=${checkoutStartParameter(product.id, offer.id)}`,
      })),
    })),
    subscriptions: (entitlements?.subscriptions ?? []).map((subscription) => ({
      id: subscription.id, plan: subscription.plan, name: subscription.product ? localizedName(subscription.product, locale) : null,
      subjects: subscription.subjects.map((subject) => localizedName(subject, locale)), endDate: subscription.endDate.toISOString(),
    })),
  };
}
