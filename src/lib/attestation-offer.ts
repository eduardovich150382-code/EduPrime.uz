import { offerDays, soldSubjects, type PricingOffer, type PricingProduct, type PricingSubject } from './pricing';
import type { SubscriptionView } from './subscription-display';

// /attestation sahifasidagi obuna kartasi uchun tanlovlar. Narx, variant va
// obunalar `loadPricingPage` dan keladi — bu yerda faqat qaysi biri
// ko'rsatilishi hal qilinadi, alohida narx manbai yo'q.

export function pickAttestationProduct(products: PricingProduct[]): PricingProduct | null {
  return products.find((product) => product.kind === 'CATEGORY' && product.goal === 'ATTESTATION') ?? null;
}

// Loader muddati o'tgan variantni chiqarmaydi; bu — sahifa ochiq turganda
// sana o'tib ketgan holat uchun.
export function liveOffers(offers: PricingOffer[], now: Date): PricingOffer[] {
  return offers.filter((offer) => offer.untilDate === null || new Date(offer.untilDate).getTime() > now.getTime());
}

/**
 * Tavsiya etiladigan variant /pricing bilan bir xil bo'lsin: admin ajratgani
 * birinchi. Ajratilmagan bo'lsa — eng uzun muddatli (nom emas, muddat:
 * admin variantni istalgancha nomlashi mumkin).
 */
export function recommendedOfferId(offers: PricingOffer[], now: Date): string | null {
  const live = liveOffers(offers, now);
  const featured = live.find((offer) => offer.isFeatured);
  if (featured) return featured.id;
  const rows = live.map((offer) => ({ id: offer.id, days: offerDays(offer, now) }))
    .filter((row): row is { id: string; days: number } => row.days !== null);
  if (rows.length < 2) return null;
  const sorted = [...rows].sort((a, b) => b.days - a.days);
  return sorted[0].days > sorted[1].days ? sorted[0].id : null;
}

function coveredSubjectIds(s: SubscriptionView, sold: PricingSubject[]): string[] | 'all' {
  if (s.plan === 'BUNDLE') return 'all';
  if (s.plan !== 'CATEGORY' || s.goal !== 'ATTESTATION') return [];
  if (s.subjectRule === 'NONE') return 'all';
  return sold.filter((subject) => s.subjectIds.includes(subject.id)).map((subject) => subject.id);
}

/**
 * Attestatsiya obunachisi: BUNDLE yoki sotiladigan fanlardan kamida biri
 * bo'yicha faol kategoriya obunasi (canAccessByEntitlements qoidasi). Eski
 * TEACHER_PLAN hisobga olinmaydi — u testlarni faqat accessType bo'yicha
 * qisman ochadi, unga sotib olish kartasi kerak. `uncoveredSubjects` —
 * hech bir obuna qamramagan fanlar ("Boshqa fanga obuna" havolasi uchun).
 */
export function attestationSubscription(subscriptions: SubscriptionView[], product: PricingProduct, now: Date): {
  subscription: SubscriptionView; uncoveredSubjects: PricingSubject[];
} | null {
  const sold = soldSubjects(product);
  const covering = subscriptions
    .filter((s) => s.isActive && new Date(s.startDate) <= now && new Date(s.endDate) >= now)
    .map((s) => ({ s, covered: coveredSubjectIds(s, sold) }))
    .filter(({ covered }) => covered === 'all' || covered.length > 0);
  if (!covering.length) return null;
  const latest = covering.reduce((a, b) => new Date(b.s.endDate) > new Date(a.s.endDate) ? b : a);
  const all = covering.some(({ covered }) => covered === 'all');
  const ids = new Set(covering.flatMap(({ covered }) => covered === 'all' ? [] : covered));
  return { subscription: latest.s, uncoveredSubjects: all ? [] : sold.filter((subject) => !ids.has(subject.id)) };
}

/** Sotib olish tugmasi konteksti (`components/pricing/OfferVariant` dagi `BuyContext`). */
export interface AttestationBuy { userId: string | null; loginHref: string; knownSubscriptionIds: string[] }

export interface AttestationView {
  product: PricingProduct | null;
  owned: ReturnType<typeof attestationSubscription>;
  /** Obuna kartasi ko'rsatiladimi (va hero'da "#obuna" yakori, qulflangan qator havolasi). */
  showOffer: boolean;
  buy: AttestationBuy;
}

/**
 * /attestation dagi obuna bloki holati — statik mehmon render'i va
 * `/api/attestation/me` bitta qoidadan foydalanadi.
 */
export function buildAttestationView(
  pricing: { products: PricingProduct[]; subscriptions: SubscriptionView[] },
  viewer: { userId: string | null; loginHref: string },
  now: Date,
): AttestationView {
  const product = pickAttestationProduct(pricing.products);
  const owned = product ? attestationSubscription(pricing.subscriptions, product, now) : null;
  return {
    product,
    owned,
    showOffer: !!product && !owned && product.offers.length > 0,
    buy: { userId: viewer.userId, loginHref: viewer.loginHref, knownSubscriptionIds: pricing.subscriptions.map((s) => s.id) },
  };
}
