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
import { coversFeatureScope, hasLegacyPlan, withoutLegacyPlans, type FeatureScope, type UserEntitlements } from './entitlements';

export type SolutionKind = 'none' | 'video' | 'written';

export interface RawSolutionData {
  explanation: string | null;
  explanationImages: string[];
  videoUrl: string | null;
}

export interface SolutionVisibilityInput extends RawSolutionData {
  /** `SolutionUnlock` bor YOKI foydalanuvchi Premium/Teacher/ADMIN (cheklovsiz). */
  writtenUnlocked: boolean;
  /** Yangi doira yoki eski PREMIUM/ADMIN; eski Teacher videoni o'zi ochmaydi. */
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

export interface SolutionTiers {
  /** Kvotasiz yozma yechim: yangi doira yoki eski Premium/Teacher/ADMIN. */
  writtenUnlimited: boolean;
  /** Video yechim: yangi doira yoki eski Premium/ADMIN. */
  videoUnlocked: boolean;
}

/**
 * Obuna → yechim darajalari. Savol darajasidagi (`explanation`/`videoUrl`) va
 * test darajasidagi (`Test.writtenSolution`/`videoSolution`) qulf shu bitta
 * joydan olinadi — ikkalasi alohida hisoblansa, vaqt o'tib bir-biridan
 * uzoqlashadi va bir xil kontent bir joyda yopiq, boshqasida ochiq qoladi.
 */
export function resolveSolutionTiers(
  role: string | undefined,
  subscription: UserEntitlements,
  scope: FeatureScope,
): SolutionTiers {
  const scoped = coversFeatureScope(withoutLegacyPlans(subscription), scope);
  const premium = hasLegacyPlan(subscription, 'PREMIUM');
  const teacher = hasLegacyPlan(subscription, 'TEACHER_PLAN');
  const isAdmin = role === 'ADMIN' || subscription.isAdmin;
  return {
    writtenUnlimited: !!isAdmin || premium || teacher || scoped,
    videoUnlocked: !!isAdmin || premium || scoped,
  };
}

/**
 * `explanation`/`explanationImages`/`videoUrl`ni qulf holatiga qarab almashtiradi, qolgan maydonlarga tegmaydi.
 * `GET /api/results/[id]` va xatolar ustida mashq tekshiruvi (`practice-check`) shu bitta funksiyani
 * chaqiradi — mashq natija sahifasida ko'rinadigandan ortiq yechim ochmasligi shu bilan kafolatlanadi.
 */
export function applySolutionVisibility<T extends RawSolutionData>(
  question: T,
  opts: { writtenUnlocked: boolean; videoUnlocked: boolean }
): T & { solutionKind: 'none' | 'video' | 'written'; solutionUnlocked: boolean } {
  const visibility = resolveSolutionVisibility({
    explanation: question.explanation,
    explanationImages: question.explanationImages,
    videoUrl: question.videoUrl,
    writtenUnlocked: opts.writtenUnlocked,
    videoUnlocked: opts.videoUnlocked,
  });
  return {
    ...question,
    explanation: visibility.explanation,
    explanationImages: visibility.explanationImages,
    videoUrl: visibility.videoUrl,
    solutionKind: visibility.solutionKind,
    solutionUnlocked: visibility.unlocked,
  };
}
