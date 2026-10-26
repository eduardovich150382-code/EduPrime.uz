import 'server-only';
import { db } from './db';
import { loadUserEntitlements } from './access';
import { secondSubjectOfferPrice } from './category-checkout';
import { localizedName, productContentCounts, promoActive, type ContentCountRow, type PricingProduct } from './pricing';
import { subscriptionView, type SubscriptionView } from './subscription-display';
import type { SubscriptionDetails } from './subscription-details';

type Lang = 'Uz' | 'Ru' | 'En';
const lang = (locale: string): Lang => locale === 'ru' ? 'Ru' : locale === 'en' ? 'En' : 'Uz';

// Admin marketing matnini hamma tilda yozmagan bo'lishi mumkin — bo'sh
// qolgandan ko'ra o'zbekchasi chiqsin (asosiy til).
function localizedText<F extends string>(row: Record<`${F}${Lang}`, string | null>, field: F, locale: string): string | null {
  return row[`${field}${lang(locale)}`]?.trim() || row[`${field}Uz`]?.trim() || null;
}
function localizedList<F extends string>(row: Record<`${F}${Lang}`, string[]>, field: F, locale: string): string[] {
  const list = row[`${field}${lang(locale)}`];
  return list.length ? list : row[`${field}Uz`];
}

// Fan kesimidagi sonlar bitta agregat so'rovda — mahsulot yoki fan soniga
// qarab so'rov ko'paymaydi.
function loadContentCounts(): Promise<ContentCountRow[]> {
  return db.$queryRaw<ContentCountRow[]>`
    SELECT t."categoryId", t."subjectId",
      (COUNT(DISTINCT t."id") FILTER (WHERE NOT t."isMock"))::int AS "topicTests",
      (COUNT(DISTINCT t."id") FILTER (WHERE t."isMock"))::int AS "mockTests",
      COUNT(q."id")::int AS "questions"
    FROM "Test" t LEFT JOIN "Question" q ON q."testId" = t."id"
    WHERE t."isPublished" = true
    GROUP BY t."categoryId", t."subjectId"
  `;
}

export async function loadPricingPage(userId: string | null, locale: string, now = new Date()): Promise<{
  products: PricingProduct[]; subscriptions: SubscriptionView[];
}> {
  const [products, counts, entitlements] = await Promise.all([
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
    loadContentCounts(),
    userId ? loadUserEntitlements(userId, now, 'pricing') : null,
  ]);
  const owned = (entitlements?.subscriptions ?? []) as SubscriptionDetails[];
  const bundleCategoryIds = products.filter((p) => p.kind === 'CATEGORY' && p.categoryId).map((p) => p.categoryId as string);
  return {
    products: products.map((product) => {
      const subjects = product.category?.subjects ?? [];
      // DTM blokida majburiy fanlar avtomatik qo'shiladi — sonlar tanlanadigan fanlar bo'yicha.
      const sold = subjects.filter((s) => product.subjectRule !== 'DTM_BLOCK' || !s.isMandatory);
      const { counts: total, bySubject } = productContentCounts({ ...product, subjectIds: sold.map((s) => s.id) }, counts, bundleCategoryIds);
      const mine = owned.filter((s) => s.productId === product.id);
      const current = mine.map((s) => ({ ...s, subjectIds: [...s.subjectIds] }));
      const discountable = product.secondSubjectDiscountPct > 0 && product.subjectRule !== 'NONE' && product.kind === 'CATEGORY';
      return {
        id: product.id, kind: product.kind, goal: product.category?.type ?? null,
        name: localizedName(product, locale), subjectRule: product.subjectRule, secondSubjectDiscountPct: product.secondSubjectDiscountPct,
        tagline: localizedText(product, 'tagline', locale), features: localizedList(product, 'features', locale),
        counts: total,
        subjects: subjects.map((subject) => ({ id: subject.id, name: localizedName(subject, locale), testCount: subject._count.tests, isMandatory: subject.isMandatory,
          counts: bySubject.get(subject.id) ?? { topicTests: 0, mockTests: 0, questions: 0 } })),
        activeSubscriptions: mine.map((s) => ({ id: s.id, endDate: s.endDate.toISOString(), subjects: s.subjects.map((name) => localizedName(name, locale)) })),
        offers: product.offers.map((offer) => ({
          id: offer.id, label: offer[`label${lang(locale)}`], price: offer.price,
          durationMonths: offer.durationMonths, untilDate: offer.untilDate?.toISOString() ?? null,
          compareAtPrice: promoActive(offer, now) && offer.compareAtPrice !== null && offer.compareAtPrice > offer.price ? offer.compareAtPrice : null,
          promoUntil: offer.promoUntil && promoActive(offer, now) ? offer.promoUntil.toISOString() : null,
          badge: localizedText(offer, 'badge', locale), isFeatured: offer.isFeatured,
          personalPrice: discountable && mine.length ? secondSubjectOfferPrice(offer.price, product.secondSubjectDiscountPct, product.id, current, now) : null,
        })),
      };
    }),
    // Nomlar kartochkada joriy tilga o'giriladi — header popover'i bilan bir xil ko'rinish.
    subscriptions: owned.map(subscriptionView),
  };
}
