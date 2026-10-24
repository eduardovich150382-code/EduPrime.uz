import type { ProductKind, SubjectRule, TestType } from '@prisma/client';
import { tashkentDateKey } from './date';
import type { LocalizedName } from './subscription-details';

export interface PricingOffer { id: string; label: string; price: number; durationMonths: number | null; untilDate: string | null; buyHref: string }
export interface PricingProduct {
  id: string; kind: ProductKind; goal: TestType | null; name: string; subjectRule: SubjectRule;
  secondSubjectDiscountPct: number; subjects: { id: string; name: string; testCount: number }[]; offers: PricingOffer[];
}
export interface PricingSubscription { id: string; plan: string; name: string | null; subjects: string[]; endDate: string }

export function localizedName(row: LocalizedName, locale: string): string {
  return row[locale === 'ru' ? 'nameRu' : locale === 'en' ? 'nameEn' : 'nameUz'];
}

export function selectPricingProduct(products: PricingProduct[], goal?: string): PricingProduct | undefined {
  const categories = products.filter((product) => product.kind === 'CATEGORY');
  return categories.find((product) => product.goal === goal) ?? categories[0];
}

export function formatPricingDate(value: string, locale: string): string {
  const [year, month, day] = tashkentDateKey(new Date(value)).split('-').map(Number);
  return new Intl.DateTimeFormat(locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
