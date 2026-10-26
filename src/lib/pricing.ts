import type { ProductKind, SubjectRule, TestType } from '@prisma/client';
import { formatTashkentDate } from './date';
import type { LocalizedName } from './subscription-details';

export interface PricingOffer { id: string; label: string; price: number; durationMonths: number | null; untilDate: string | null; buyHref: string }
export interface PricingProduct {
  id: string; kind: ProductKind; goal: TestType | null; name: string; subjectRule: SubjectRule;
  secondSubjectDiscountPct: number; subjects: { id: string; name: string; testCount: number; isMandatory: boolean }[]; offers: PricingOffer[];
}

export function localizedName(row: LocalizedName, locale: string): string {
  return row[locale === 'ru' ? 'nameRu' : locale === 'en' ? 'nameEn' : 'nameUz'];
}

export function selectPricingProduct(products: PricingProduct[], goal?: string): PricingProduct | undefined {
  const categories = products.filter((product) => product.kind === 'CATEGORY');
  return categories.find((product) => product.goal === goal) ?? categories[0];
}

export function formatPricingDate(value: string, locale: string): string {
  return formatTashkentDate(value, locale, true);
}
