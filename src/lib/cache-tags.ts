import { revalidateTag } from 'next/cache';

// Public katalog keshlari (`lib/public-catalog.ts`) shu teglar bilan
// belgilanadi. Mutatsiya route'lari tegni to'g'ridan-to'g'ri emas, quyidagi
// yordamchilar orqali tozalaydi — qaysi o'zgarish qaysi keshlarga ta'sir
// qilishi bitta joyda yozilgan bo'lsin.
export const CACHE_TAGS = {
  testsList: 'tests-list',
  pricing: 'pricing',
  settings: 'settings',
  taxonomy: 'taxonomy',
} as const;

// Hook qo'yilmagan o'zgarishlar (seed, Neon SQL Editor) ham ko'pi bilan
// shuncha vaqtdan keyin ko'rinadi. 1 soat: har qayta yig'ilish (3 sahifa × 3
// til) CPU yeydi, admin/ustoz mutatsiyalari esa tegni darhol tozalaydi —
// qisqa muddat faqat hook'siz o'zgarishlar uchun kerak edi. Sahifalardagi
// `export const revalidate` literal bo'lishi shart (Next), shu songa teng.
export const PUBLIC_CACHE_REVALIDATE_SEC = 3600;

// Pricing kartochkasidagi test/savol sonlari testlardan hisoblanadi — test
// o'zgarsa narx sahifasi ham eskiradi.
export function revalidateTestCatalog(): void {
  revalidateTag(CACHE_TAGS.testsList);
  revalidateTag(CACHE_TAGS.pricing);
}

export function revalidatePricing(): void {
  revalidateTag(CACHE_TAGS.pricing);
}

// Pricing katalogi fanlarni (majburiylik bilan) o'z ichiga oladi.
export function revalidateTaxonomy(): void {
  revalidateTag(CACHE_TAGS.taxonomy);
  revalidateTag(CACHE_TAGS.pricing);
}

export function revalidateSettings(): void {
  revalidateTag(CACHE_TAGS.settings);
}
