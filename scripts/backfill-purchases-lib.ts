/**
 * `backfill-purchases.ts` uchun sof (bazasiz) mantiq: har bir CONFIRMED
 * to'lovning `selectedSubjects` massivini ko'rib chiqib, qaysi id'lar aslida
 * Test/Course xaridi (va shu sababli Purchase yozuviga loyiq) ekanini,
 * qaysilari TEACHER_PLAN uchun tanlangan fan (Subject) id'si — demak
 * tegilmasligi kerak — ekanini ajratadi (lib/access.ts, prisma/schema.prisma#Purchase).
 *
 * Bazaga bog'liq emas — testlar (backfill-purchases.test.ts) haqiqiy Prisma
 * Client'siz shu funksiyalarni tekshiradi (backfill-items-lib.ts bilan bir
 * xil naqsh).
 */

export type PurchaseItemType = "test" | "course";

export interface ConfirmedPaymentRow {
  id: string;
  userId: string;
  selectedSubjects: string[];
}

export interface PlannedPurchase {
  userId: string;
  itemType: PurchaseItemType;
  itemId: string;
  paymentId: string;
}

export interface BackfillPurchasesReport {
  testPurchasesCreated: number;
  coursePurchasesCreated: number;
  alreadyExists: number;
  skippedSubjectIds: number;
}

export interface BackfillPurchasesPlan {
  purchases: PlannedPurchase[];
  report: BackfillPurchasesReport;
}

function purchaseKey(userId: string, itemType: PurchaseItemType, itemId: string): string {
  return `${userId}:${itemType}:${itemId}`;
}

/**
 * To'liq ko'chirish rejasini hisoblaydi.
 *
 * @param payments CONFIRMED holatdagi to'lovlar (bo'sh selectedSubjects
 *   bo'lganlarini ham berish mumkin — ular hech narsa qo'shmaydi).
 * @param testIds Bazadagi barcha Test.id'lar to'plami.
 * @param courseIds Bazadagi barcha Course.id'lar to'plami.
 * @param existingPurchaseKeys Bazadagi mavjud Purchase yozuvlari kaliti
 *   (`userId:itemType:itemId`) — idempotentlik uchun. Funksiya ichida JOYIDA
 *   yangilanadi (rejalashtirilgan yangi yozuvlar ham shu to'plamga
 *   qo'shiladi), shuning uchun bitta chaqiruvdan keyin uni qayta
 *   ishlatmang.
 */
export function planPurchaseBackfill(
  payments: ConfirmedPaymentRow[],
  testIds: Set<string>,
  courseIds: Set<string>,
  existingPurchaseKeys: Set<string>
): BackfillPurchasesPlan {
  const purchases: PlannedPurchase[] = [];
  const report: BackfillPurchasesReport = {
    testPurchasesCreated: 0,
    coursePurchasesCreated: 0,
    alreadyExists: 0,
    skippedSubjectIds: 0,
  };

  for (const payment of payments) {
    // Bitta to'lov ichida takrorlangan id bo'lsa ham bir marta hisoblansin.
    const uniqueSubjectIds = new Set(payment.selectedSubjects);

    for (const itemId of uniqueSubjectIds) {
      let itemType: PurchaseItemType;
      if (testIds.has(itemId)) {
        itemType = "test";
      } else if (courseIds.has(itemId)) {
        itemType = "course";
      } else {
        // Test yoki Course'ga mos kelmadi — demak TEACHER_PLAN uchun
        // tanlangan Subject id'si. Tegilmaydi.
        report.skippedSubjectIds++;
        continue;
      }

      const key = purchaseKey(payment.userId, itemType, itemId);
      if (existingPurchaseKeys.has(key)) {
        report.alreadyExists++;
        continue;
      }

      existingPurchaseKeys.add(key);
      purchases.push({ userId: payment.userId, itemType, itemId, paymentId: payment.id });
      if (itemType === "test") report.testPurchasesCreated++;
      else report.coursePurchasesCreated++;
    }
  }

  return { purchases, report };
}
