import { ASSET_MIN_LONG_SIDE_PX, ASSET_SHRINK_STEP } from './constants';

/**
 * 2 MB dan oshgan rasmni sig'dirish rejasi — sof, node'da test qilinadi.
 * Canvas bilan kodlashning o'zi ./manifest-client da.
 *
 * TARTIB MUHIM: birinchi qadam — asl o'lcham, faqat JPEG ga o'girish. Katta
 * fayllar amalda rangli/skan sahifa akslari va JPEG ularni piksel
 * yo'qotmasdan siqadi. Kichraytirish faqat shundan keyin, har qadamda
 * `ASSET_SHRINK_STEP`, eng uzun tomon esa `ASSET_MIN_LONG_SIDE_PX` dan
 * pastga TUSHMAYDI — oxirgi qadam aynan shu chegaraga qisiladi.
 */

export interface PixelSize {
  width: number;
  height: number;
}

export function shrinkPlan(width: number, height: number): PixelSize[] {
  const plan: PixelSize[] = [{ width, height }];
  const longSide = Math.max(width, height);
  // Asl rasm chegaradan kichik bo'lsa uni kichraytirish faqat o'qilishni
  // yomonlashtiradi — JPEG'dan boshqa qadam yo'q.
  if (longSide <= ASSET_MIN_LONG_SIDE_PX) return plan;

  const sized = (scale: number): PixelSize => ({
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  });

  let scale = 1;
  for (;;) {
    scale *= ASSET_SHRINK_STEP;
    if (longSide * scale <= ASSET_MIN_LONG_SIDE_PX) {
      plan.push(sized(ASSET_MIN_LONG_SIDE_PX / longSide));
      return plan;
    }
    plan.push(sized(scale));
  }
}
