import { tashkentDateKey } from './date';

export interface OfferDuration {
  durationMonths: number | null;
  untilDate: Date | null;
}

// Admin va to'lov oqimi bir xil muddat shartini ishlatishi kerak.
export function isValidOfferDuration(offer: OfferDuration): boolean {
  const months = offer.durationMonths;
  const date = offer.untilDate;
  if ((months === null) === (date === null)) return false;
  if (months !== null) return Number.isSafeInteger(months) && months > 0;
  return date !== null && Number.isFinite(date.getTime());
}

const TASHKENT_OFFSET = 5 * 60 * 60 * 1000;

// Sana maydoni brauzer yoki server mintaqasidan qat'i nazar Toshkent kunidir.
export function tashkentDayEnd(day: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('INVALID_DATE');
  const date = new Date(`${day}T23:59:59.999+05:00`);
  if (!Number.isFinite(date.getTime()) || tashkentDateInput(date) !== day) throw new Error('INVALID_DATE');
  return date;
}

export function tashkentDateInput(date: Date | string): string {
  return tashkentDateKey(new Date(date));
}

// Qat'iy sana uzaytirilmaydi; oylik variant qolgan pullik muddatni saqlaydi.
export function resolveStartDate(offer: OfferDuration, now: Date, currentEndDate?: Date | null): Date {
  if (!isValidOfferDuration(offer) || !Number.isFinite(now.getTime())) throw new Error('INVALID_DURATION');
  if (currentEndDate && !Number.isFinite(currentEndDate.getTime())) throw new Error('INVALID_DATE');
  return new Date(offer.durationMonths !== null && currentEndDate && currentEndDate > now ? currentEndDate : now);
}

export function computeEndDate(offer: OfferDuration, now: Date, currentEndDate?: Date | null): Date {
  const start = resolveStartDate(offer, now, currentEndDate);
  if (offer.untilDate !== null) {
    if (offer.untilDate <= now) throw new Error('EXPIRED_OFFER');
    return new Date(offer.untilDate);
  }
  const local = new Date(start.getTime() + TASHKENT_OFFSET);
  const day = local.getUTCDate();
  local.setUTCDate(1);
  local.setUTCMonth(local.getUTCMonth() + offer.durationMonths!);
  const lastDay = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 0)).getUTCDate();
  local.setUTCDate(Math.min(day, lastDay));
  const end = new Date(local.getTime() - TASHKENT_OFFSET);
  if (!Number.isFinite(end.getTime())) throw new Error('INVALID_DURATION');
  return end;
}

interface SubjectProduct {
  kind: 'CATEGORY' | 'BUNDLE';
  subjectRule: 'NONE' | 'ONE' | 'DTM_BLOCK';
  categoryId: string | null;
}

interface MandatorySubject {
  id: string;
  categoryId: string;
  isMandatory: boolean;
}

// Sayt kartochkasi, niyat API va bot nechta fan so'rashni bir joydan oladi.
export function requiredSubjectCount(product: Pick<SubjectProduct, 'kind' | 'subjectRule'>): number {
  return product.kind === 'BUNDLE' || product.subjectRule === 'NONE' ? 0 : product.subjectRule === 'ONE' ? 1 : 2;
}

export function buildSubjectIds(product: SubjectProduct, chosenSubjectIds: string[], mandatorySubjects: MandatorySubject[]): string[] {
  if (new Set(chosenSubjectIds).size !== chosenSubjectIds.length) throw new Error('DUPLICATE_SUBJECTS');
  if (product.kind === 'BUNDLE' || product.subjectRule === 'NONE') {
    if (chosenSubjectIds.length) throw new Error('UNEXPECTED_SUBJECTS');
    return [];
  }
  if (product.subjectRule === 'ONE') {
    if (chosenSubjectIds.length !== 1) throw new Error('CHOOSE_ONE_SUBJECT');
    return [...chosenSubjectIds];
  }
  const mandatory = mandatorySubjects.filter((s) => s.categoryId === product.categoryId && s.isMandatory).map((s) => s.id);
  if (mandatory.length !== 3) throw new Error('MANDATORY_SUBJECTS_NOT_CONFIGURED');
  if (chosenSubjectIds.length !== 2 || chosenSubjectIds.some((id) => mandatory.includes(id))) throw new Error('CHOOSE_TWO_MAIN_SUBJECTS');
  return [...chosenSubjectIds, ...mandatory].sort();
}

export function sameSubjectIds(left: string[], right: string[]): boolean {
  const sortedRight = [...right].sort();
  return left.length === right.length && [...left].sort().every((id, i) => id === sortedRight[i]);
}
