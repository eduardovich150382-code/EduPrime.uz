export interface OfferDuration {
  durationMonths: number | null;
  untilDate: Date | null;
}

// Admin va to'lov oqimi bir xil muddat shartini ishlatishi uchun sof
// tekshiruv oldindan ajratilgan; hisoblash O2 da qo'shiladi.
export function isValidOfferDuration(offer: OfferDuration): boolean {
  const months = offer.durationMonths;
  const date = offer.untilDate;
  if ((months === null) === (date === null)) return false;
  if (months !== null) return Number.isSafeInteger(months) && months > 0;
  return date !== null && Number.isFinite(date.getTime());
}
