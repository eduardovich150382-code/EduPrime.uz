/**
 * Mavjud CONFIRMED `Payment.selectedSubjects` qiymatlaridan haqiqiy test/kurs
 * xaridlarini kanonik `Purchase` jadvaliga ko'chiradi
 * (prisma/schema.prisma#Purchase — lib/access.ts endi shundan ham tekshiradi).
 *
 * Fon: `selectedSubjects` asli faqat TEACHER_PLAN uchun tanlangan fan
 * id'larini saqlashga mo'ljallangan edi, lekin bitta-test/bitta-kurs
 * xaridlarini ham shu maydonga (test/kurs id'sini) yozish orqali
 * kengaytirilgan — natijada bitta massivda fan id'lari va xarid id'lari
 * aralashib qolgan. Bu skript har bir id Test.id'gami, Course.id'gami yoki
 * (mos kelmasa) Subject id'sigami ekanini aniqlab, faqat haqiqiy
 * test/kurs xaridlarini Purchase'ga yozadi — fanga mos kelganlarini
 * TEGMASDAN qoldiradi.
 *
 * IDEMPOTENT: qayta ishga tushirilsa dublikat yaratmaydi — Purchase'dagi
 * (userId, itemType, itemId) unique cheklovi bo'yicha oldindan tekshiriladi,
 * `createMany` esa qo'shimcha himoya sifatida `skipDuplicates: true` bilan
 * chaqiriladi.
 *
 * Standart holat — DRY-RUN: hech narsa yozilmaydi, faqat hisobot chiqadi.
 * Yozish uchun ANIQ `--apply` kerak:
 *   npx tsx scripts/backfill-purchases.ts            # dry-run (standart)
 *   npx tsx scripts/backfill-purchases.ts --dry-run   # dry-run (aniq)
 *   npx tsx scripts/backfill-purchases.ts --apply     # haqiqiy yozish
 *
 * CLAUDE.md: bu skript hech qachon lokal terminaldan prod bazaga qarshi
 * ishga tushirilmasin. PR faqat kodni o'z ichiga oladi — ishga tushirish
 * loyiha egasining zimmasida, ulanish mavjud bo'lgan muhitda.
 *
 * Payment'dan HECH NARSA o'chirilmaydi yoki o'zgartirilmaydi — bu faqat
 * qo'shimcha (additive) ko'chirish.
 */
import { db } from "../src/lib/db";
import {
  ConfirmedPaymentRow,
  planPurchaseBackfill,
} from "./backfill-purchases-lib";

// Bir so'rovda nechta yozuv — CLAUDE.md: "katta tranzaksiya Neon'da timeout
// beradi", shuning uchun bo'laklab (bir marta 100 tadan) bajariladi.
const BATCH_SIZE = 100;

function parseArgs(argv: string[]): { apply: boolean } {
  const hasApply = argv.includes("--apply");
  const hasDryRun = argv.includes("--dry-run");

  if (hasApply && hasDryRun) {
    console.error("Xato: --apply va --dry-run birga berilmaydi.");
    process.exit(1);
  }

  // Standart holat — dry-run. Yozish uchun ANIQ --apply talab qilinadi.
  return { apply: hasApply };
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function loadConfirmedPayments(): Promise<ConfirmedPaymentRow[]> {
  const rows: ConfirmedPaymentRow[] = [];
  let skip = 0;

  for (;;) {
    const page = await db.payment.findMany({
      // isEmpty:false — bo'sh selectedSubjects'li to'lovlarni (oddiy
      // Premium/Ustoz obuna xaridlari) o'tkazib yuboradi, ular hech qanday
      // Purchase yozuvini talab qilmaydi.
      where: { status: "CONFIRMED", selectedSubjects: { isEmpty: false } },
      select: { id: true, userId: true, selectedSubjects: true },
      orderBy: { id: "asc" },
      skip,
      take: BATCH_SIZE,
    });
    if (page.length === 0) break;

    rows.push(...page);
    skip += BATCH_SIZE;
  }

  return rows;
}

async function loadExistingPurchaseKeys(): Promise<Set<string>> {
  const rows = await db.purchase.findMany({
    select: { userId: true, itemType: true, itemId: true },
  });
  return new Set(rows.map((r) => `${r.userId}:${r.itemType}:${r.itemId}`));
}

async function loadIdSet(
  loader: () => Promise<{ id: string }[]>
): Promise<Set<string>> {
  const rows = await loader();
  return new Set(rows.map((r) => r.id));
}

function printReport(report: ReturnType<typeof planPurchaseBackfill>["report"], dryRun: boolean): void {
  console.log("");
  console.log(dryRun ? "===== DRY-RUN HISOBOTI (hech narsa yozilmadi) =====" : "===== YOZISH YAKUNLANDI =====");
  console.log(`Test xaridlari: ${report.testPurchasesCreated} ${dryRun ? "yaratilgan bo'lardi" : "yaratildi"}`);
  console.log(`Kurs xaridlari: ${report.coursePurchasesCreated} ${dryRun ? "yaratilgan bo'lardi" : "yaratildi"}`);
  console.log(`Allaqachon mavjud edi: ${report.alreadyExists}`);
  console.log(`Fanga mos kelib, tegilmay qoldirilgan id'lar: ${report.skippedSubjectIds}`);
}

async function main(): Promise<void> {
  const { apply } = parseArgs(process.argv.slice(2));
  const dryRun = !apply;

  console.log(dryRun ? "Rejim: DRY-RUN (yozilmaydi)" : "Rejim: APPLY (bazaga yoziladi)");
  console.log("Bazadan hozirgi holat yuklanmoqda...");

  const [payments, testIds, courseIds, existingPurchaseKeys] = await Promise.all([
    loadConfirmedPayments(),
    loadIdSet(() => db.test.findMany({ select: { id: true } })),
    loadIdSet(() => db.course.findMany({ select: { id: true } })),
    loadExistingPurchaseKeys(),
  ]);

  console.log(`Topildi: ${payments.length} ta CONFIRMED to'lov (bo'sh bo'lmagan selectedSubjects bilan).`);

  const plan = planPurchaseBackfill(payments, testIds, courseIds, existingPurchaseKeys);

  if (dryRun) {
    printReport(plan.report, true);
    return;
  }

  console.log(`Yozish boshlanmoqda: ${plan.purchases.length} ta Purchase.`);
  const batches = chunk(plan.purchases, BATCH_SIZE);
  let written = 0;
  for (const batch of batches) {
    await db.purchase.createMany({ data: batch, skipDuplicates: true });
    written += batch.length;
    console.log(`  Purchase yozildi: ${written}/${plan.purchases.length}`);
  }

  printReport(plan.report, false);
}

// Faqat to'g'ridan-to'g'ri `npx tsx scripts/backfill-purchases.ts` orqali
// chaqirilganda ishga tushadi — test fayli pure funksiyalarni shu yon
// ta'sirsiz (bazaga ulanmasdan) import qila oladi.
if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(async () => {
      await db.$disconnect();
    });
}
