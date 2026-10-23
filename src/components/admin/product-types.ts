export interface LocalName { nameUz: string; nameRu: string; nameEn: string }
export interface AdminSubject extends LocalName { id: string; isMandatory: boolean; publishedTestCount: number }
export interface AdminOffer {
  id: string; labelUz: string; labelRu: string; labelEn: string;
  durationMonths: number | null; untilDate: string | null; price: number; isActive: boolean; order: number;
}
export interface AdminProduct extends LocalName {
  id: string; kind: 'BUNDLE' | 'CATEGORY'; categoryId: string | null; subjectRule: 'NONE' | 'ONE' | 'DTM_BLOCK';
  isOnSale: boolean; secondSubjectDiscountPct: number; order: number; offers: AdminOffer[];
  subjects: AdminSubject[]; publishedTestCount: number;
}
export interface AdminUser { id: string; name: string | null; email: string | null; telegramUsername: string | null }

export function localName(value: LocalName, locale: string): string {
  return (locale === 'ru' ? value.nameRu : locale === 'en' ? value.nameEn : value.nameUz) || value.nameUz;
}
export function offerName(value: AdminOffer, locale: string): string {
  return (locale === 'ru' ? value.labelRu : locale === 'en' ? value.labelEn : value.labelUz) || value.labelUz;
}
