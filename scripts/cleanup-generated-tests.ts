/**
 * S18a'gacha bilim xaritasi mashqi va (eski) DTM Online generatori har
 * urinishda `Test.userId` to'ldirilgan, `isPublished: false` — talabaga
 * shaxsan tegishli, katalogda ko'rinmaydigan — Test qatori yozardi (qarang
 * `lib/mastery.ts` va `lib/dtm-online.ts`dagi tarixiy izohlar). Endi
 * ikkalasi ham `TestSession` (Item bankidan) ishlatadi, shuning uchun bu
 * eski qatorlar endi hech kim tomonidan o'qilmaydi — faqat bazani band
 * qiladi.
 *
 * Bu skript o'sha eski qatorlarni (va `Test.questions` orqali ONDELETE
 * CASCADE bilan ularning savollarini) topadi va (--apply bilan) o'chiradi.
 * `TestResult.testId` shu Test'ga ishora qilsa — natija tarixi yo'qolmasin
 * deb, O'CHIRILMAYDI, alohida ro'yxatda ko'rsatiladi.
 *
 * Standart holat — DRY-RUN: hech narsa yozilmaydi, faqat hisobot chiqadi.
 * O'chirish uchun ANIQ `--apply` kerak:
 *   npx tsx scripts/cleanup-generated-tests.ts                        # dry-run (standart)
 *   npx tsx scripts/cleanup-generated-tests.ts --dry-run              # dry-run (aniq)
 *   npx tsx scripts/cleanup-generated-tests.ts --older-than-days=30   # faqat 30 kundan eski qatorlar
 *   npx tsx scripts/cleanup-generated-tests.ts --apply                # haqiqiy o'chirish
 *
 * CLAUDE.md: bu skript hech qachon lokal terminaldan prod bazaga qarshi
 * ishga tushirilmasin. PR faqat kodni o'z ichiga oladi — ishga tushirish
 * (agar kerak deb topilsa) loyiha egasining zimmasida.
 */
import { db } from '../src/lib/db';

interface ParsedArgs {
  apply: boolean;
  olderThanDays: number | null;
}

function parseArgs(argv: string[]): ParsedArgs {
  const hasApply = argv.includes('--apply');
  const hasDryRun = argv.includes('--dry-run');

  if (hasApply && hasDryRun) {
    console.error('Xato: --apply va --dry-run birga berilmaydi.');
    process.exit(1);
  }

  let olderThanDays: number | null = null;
  const olderThanArg = argv.find((a) => a.startsWith('--older-than-days='));
  if (olderThanArg) {
    const raw = olderThanArg.split('=')[1];
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) {
      console.error("Xato: --older-than-days musbat son bo'lishi kerak.");
      process.exit(1);
    }
    olderThanDays = n;
  }

  // Standart holat — dry-run. O'chirish uchun ANIQ --apply talab qilinadi.
  return { apply: hasApply, olderThanDays };
}

async function main() {
  const { apply, olderThanDays } = parseArgs(process.argv.slice(2));

  const cutoff = olderThanDays !== null ? new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000) : null;

  const candidates = await db.test.findMany({
    where: {
      userId: { not: null },
      isPublished: false,
      ...(cutoff ? { createdAt: { lt: cutoff } } : {}),
    },
    select: {
      id: true,
      titleUz: true,
      userId: true,
      questionCount: true,
      createdAt: true,
      _count: { select: { results: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const deletable = candidates.filter((t) => t._count.results === 0);
  const skipped = candidates.filter((t) => t._count.results > 0);

  console.log(
    `Topildi: ${candidates.length} ta generatsiya qilingan (nashr etilmagan, egasi bor) test` +
      (cutoff ? ` (${olderThanDays} kundan eski)` : '') +
      '.'
  );
  console.log(`  - O'chirishga tayyor (natija tarixi yo'q): ${deletable.length}`);
  console.log(`  - O'TKAZIB YUBORILADI (TestResult bog'langan, natija tarixi yo'qolmasligi uchun): ${skipped.length}`);

  if (skipped.length > 0) {
    console.log("\nO'tkazib yuborilgan testlar (natija tarixi bor):");
    for (const t of skipped) {
      console.log(`  ${t.id}  "${t.titleUz}"  ${t._count.results} ta natija  (userId: ${t.userId})`);
    }
  }

  if (deletable.length === 0) {
    console.log("\nO'chirish uchun hech narsa yo'q.");
    return;
  }

  console.log(
    apply
      ? "\nO'chirilayotgan testlar (va ularning savollari, onDelete: Cascade orqali):"
      : "\n[DRY-RUN] O'chirilishi kerak bo'lgan testlar (haqiqatda hech narsa o'zgarmadi):"
  );
  for (const t of deletable) {
    console.log(`  ${t.id}  "${t.titleUz}"  ${t.questionCount} savol  ${t.createdAt.toISOString()}  (userId: ${t.userId})`);
  }

  if (!apply) {
    console.log("\nHaqiqatda o'chirish uchun --apply bilan qayta ishga tushiring.");
    return;
  }

  // Har bir Test alohida o'chiriladi — kutilmagan FK cheklovi (masalan
  // CourseLesson/LessonBlock shu Test'ga ishora qilsa) bitta qatorni
  // to'xtatib qo'ysa ham, qolganlari davom etsin deb bir martalik
  // (transaction'siz) tsikl ishlatiladi.
  let deletedCount = 0;
  let failedCount = 0;
  for (const t of deletable) {
    try {
      await db.test.delete({ where: { id: t.id } });
      deletedCount++;
    } catch (err) {
      failedCount++;
      console.error(`  XATO: ${t.id} ("${t.titleUz}") o'chirilmadi:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\nYakun: ${deletedCount} ta test o'chirildi, ${failedCount} ta xato bilan yakunlandi.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
