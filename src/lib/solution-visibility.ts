/**
 * Bitta savolning yechim darajalarini hisoblaydi (S17). To'g'ri javob va
 * variantlar (bepul) bu yerga kirmaydi — chaqiruvchi ularni har doim
 * o'zgarishsiz qaytaradi. Bu fayl faqat GATED ikkita maydon bilan
 * shug'ullanadi: yozma yechim (`explanation`) va video yechim (`videoUrl`).
 *
 * Video yechim MAVJUD bo'lsa yozma yechim har doim yashiriladi — ikkalasi
 * bir vaqtda ko'rsatilmaydi (mahsulot qoidasi), hatto yozma yechim ham
 * ochilgan bo'lsa ham.
 *
 * DB'ga bormaydi — sof funksiya, `GET /api/results/[id]` va
 * `POST /api/results/[id]/ai-explain` ikkalasi ham shu orqali AYNAN bir
 * xil qulfni qo'llaydi (CLAUDE.md — paywall har joyda bir xil tekshirilsin).
 */
export type SolutionKind = 'none' | 'video' | 'written';

export interface RawSolutionData {
  explanation: string | null;
  explanationImages: string[];
  videoUrl: string | null;
}

export interface SolutionVisibilityInput extends RawSolutionData {
  /** `SolutionUnlock` bor YOKI foydalanuvchi Premium/Teacher/ADMIN (cheklovsiz). */
  writtenUnlocked: boolean;
  /** Faol PREMIUM obuna YOKI ADMIN — video yechim faqat shularga ochiladi (Teacher emas). */
  videoUnlocked: boolean;
}

export interface SolutionVisibilityResult {
  explanation: string | null;
  explanationImages: string[];
  videoUrl: string | null;
  solutionKind: SolutionKind;
  /** Foydalanuvchi shu savol uchun ko'rsatilishi kerak bo'lgan yechimni (bor bo'lsa) ko'ra oladimi. */
  unlocked: boolean;
}

export function resolveSolutionVisibility(input: SolutionVisibilityInput): SolutionVisibilityResult {
  const { explanation, explanationImages, videoUrl, writtenUnlocked, videoUnlocked } = input;

  if (videoUrl) {
    return {
      explanation: null,
      explanationImages: [],
      videoUrl: videoUnlocked ? videoUrl : null,
      solutionKind: 'video',
      unlocked: videoUnlocked,
    };
  }

  if (explanation) {
    return {
      explanation: writtenUnlocked ? explanation : null,
      explanationImages: writtenUnlocked ? explanationImages : [],
      videoUrl: null,
      solutionKind: 'written',
      unlocked: writtenUnlocked,
    };
  }

  return { explanation: null, explanationImages: [], videoUrl: null, solutionKind: 'none', unlocked: true };
}
