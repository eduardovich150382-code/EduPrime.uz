/** Muharrirning 1–100 oralig'iga mos ballni o'tkazadi; noma'lum qiymat standartga qoladi. */
export function parseQuestionPoints(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 100
    ? value
    : undefined;
}
