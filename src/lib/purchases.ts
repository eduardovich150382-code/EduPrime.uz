import { db } from './db';

export type PurchaseItemType = 'test' | 'course';

/**
 * Bitta pullik test/kurs xaridini Purchase jadvaliga yozadi — CONFIRMED
 * to'lov tasdiqlangan joylarda chaqiriladi (admin panel, Telegram webhook).
 * `upsert` ishlatiladi: unique cheklov userId+itemType+itemId bo'yicha, shu
 * sababli qayta chaqirilsa (masalan admin ikki marta tasdiqlashga urinsa)
 * xato bermaydi va dublikat yaratmaydi.
 */
export async function recordPurchase(
  userId: string,
  itemType: PurchaseItemType,
  itemId: string,
  paymentId: string | null
): Promise<void> {
  await db.purchase.upsert({
    where: { userId_itemType_itemId: { userId, itemType, itemId } },
    update: {},
    create: { userId, itemType, itemId, paymentId },
  });
}

/**
 * `Payment.selectedSubjects` ichidagi bitta id Test'gami, Course'gami yoki
 * (TEACHER_PLAN uchun tanlangan) Subject'gami tegishli ekanini aniqlaydi.
 * Faqat Test/Course uchun Purchase yozuv rejalashtiriladi — Subject id'si
 * bo'lsa `null` qaytadi, chaqiruvchi shunda hech narsa yozmaydi (lib/access.ts
 * paywall — pullik test/kurs xaridi bilan fan tanlovi bir xil massivda
 * aralashib ketgan, shuni ANIQ ajratish shart).
 */
export async function resolvePurchaseItemType(id: string): Promise<PurchaseItemType | null> {
  const [test, course] = await Promise.all([
    db.test.findUnique({ where: { id }, select: { id: true } }),
    db.course.findUnique({ where: { id }, select: { id: true } }),
  ]);
  if (test) return 'test';
  if (course) return 'course';
  return null;
}
